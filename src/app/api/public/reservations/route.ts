export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateReservationSchema } from "@/lib/validators";
import { assignTable } from "@/lib/assign-table";
import { resolveSlot } from "@/lib/slots";
import { startOfDay, addMinutes, format } from "date-fns";
import { nanoid } from "nanoid";
import { emitEvent } from "@/lib/sse";
import { getWhatsappConfig, sendMessage, generateToken, logWhatsapp } from "@/lib/sendapp";

function generateCode(): string {
  return "BCK-" + nanoid(6).toUpperCase();
}


export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { customerName, phone, partySize, date: dateStr, time, notes, source } = parsed.data;

  const date = new Date(dateStr);
  if (date < startOfDay(new Date())) {
    return NextResponse.json({ error: "Non puoi prenotare nel passato" }, { status: 400 });
  }

  // Verifica giorno chiusura
  const closure = await prisma.closureDay.findFirst({
    where: {
      date: {
        gte: date,
        lt: new Date(format(addMinutes(date, 24 * 60), "yyyy-MM-dd")),
      },
    },
  });
  if (closure) {
    return NextResponse.json({ error: "Il ristorante è chiuso in questa data" }, { status: 409 });
  }

  // Verifica orario aperto
  const dayConfig = await prisma.openingHours.findUnique({ where: { dayOfWeek: date.getDay() } });
  if (!dayConfig || !dayConfig.active) {
    return NextResponse.json({ error: "Il ristorante è chiuso in questo giorno" }, { status: 409 });
  }

  // Applica scivolamento slot
  const effectiveTime = await resolveSlot(time, date);

  // Assegnazione tavolo automatica
  const tableId = await assignTable(partySize, date, effectiveTime);
  if (!tableId) {
    return NextResponse.json(
      { error: `Non ci sono tavoli disponibili per ${partySize} persone a quest'orario. Prova un altro orario.` },
      { status: 409 }
    );
  }

  // Genera codice univoco
  let code = generateCode();
  let attempts = 0;
  while (await prisma.reservation.findUnique({ where: { code } }) && attempts < 5) {
    code = generateCode();
    attempts++;
  }

  // Check if WhatsApp phone verification is required
  const waCfg = await getWhatsappConfig();
  const requiresVerification = waCfg.enabled && waCfg.serviceEnabled && !!waCfg.token && !!waCfg.instanceId;
  const verificationCode = requiresVerification ? generateToken() : undefined;

  const reservation = await prisma.reservation.create({
    data: {
      code,
      customerName: customerName.trim(),
      phone: phone.trim(),
      partySize,
      date,
      time: effectiveTime,
      tableId,
      notes,
      source,
      ...(requiresVerification
        ? { verificationCode, phoneVerified: false, verificationAttempts: 0 }
        : {}),
    },
    include: { table: { include: { room: true } } },
  });

  emitEvent("reservation_created", { id: reservation.id, date: dateStr, time: effectiveTime });

  if (requiresVerification && verificationCode) {
    try {
      await sendMessage({
        token: waCfg.token,
        instanceId: waCfg.instanceId,
        number: phone.trim().replace(/\D/g, ""),
        message: `Il tuo codice di conferma prenotazione è: *${verificationCode}*\n\nInseriscilo nella pagina di riepilogo per confermare il tuo tavolo.`,
      });
      void logWhatsapp("outbound", "verification", phone.trim().replace(/\D/g, ""));
    } catch (err) {
      console.error("[reservations] WhatsApp token send failed:", err);
    }
  }

  return NextResponse.json(
    {
      id: reservation.id,
      code: reservation.code,
      customerName: reservation.customerName,
      partySize: reservation.partySize,
      date: dateStr,
      time: effectiveTime,
      table: reservation.table ? `${reservation.table.name} — ${reservation.table.room.name}` : null,
      requiresVerification: requiresVerification || undefined,
    },
    { status: 201 }
  );
}
