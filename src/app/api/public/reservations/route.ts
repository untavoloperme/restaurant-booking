import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateReservationSchema } from "@/lib/validators";
import { assignTable } from "@/lib/assign-table";
import { resolveSlot } from "@/lib/slots";
import { isWeekend } from "@/lib/slots";
import { parseISO, startOfDay, addMinutes, format } from "date-fns";
import { nanoid } from "nanoid";
import { emitEvent } from "@/lib/sse";

function generateCode(): string {
  return "BCK-" + nanoid(6).toUpperCase();
}

function getTurnIndex(time: string): number {
  const [h] = time.split(":").map(Number);
  return h < 21 ? 0 : 1;
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

  const date = startOfDay(parseISO(dateStr));
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

  const weekend = isWeekend(date);
  const turnIdx = weekend ? getTurnIndex(time) : 0;

  // Applica scivolamento slot
  const effectiveTime = await resolveSlot(time, date, weekend, turnIdx);

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
    },
    include: { table: { include: { room: true } } },
  });

  emitEvent("reservation_created", { id: reservation.id, date: dateStr, time: effectiveTime });

  return NextResponse.json(
    {
      id: reservation.id,
      code: reservation.code,
      customerName: reservation.customerName,
      partySize: reservation.partySize,
      date: dateStr,
      time: effectiveTime,
      table: reservation.table ? `${reservation.table.name} — ${reservation.table.room.name}` : null,
    },
    { status: 201 }
  );
}
