export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { emitEvent } from "@/lib/sse";
import { getWhatsappConfig, sendMessage, logWhatsapp } from "@/lib/sendapp";

const VerifySchema = z.object({
  reservationId: z.string().min(1),
  token: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { reservationId, token } = parsed.data;

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) {
    return NextResponse.json({ error: "Prenotazione non trovata" }, { status: 404 });
  }

  if (reservation.phoneVerified) {
    return NextResponse.json({ verified: true });
  }

  if (reservation.status === "CANCELLED") {
    return NextResponse.json({ verified: false, cancelled: true });
  }

  if (token === reservation.verificationCode) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { phoneVerified: true, verificationCode: null },
    });
    emitEvent("reservation_updated", { id: reservationId });

    try {
      const waCfg = await getWhatsappConfig();
      if (waCfg.token && waCfg.instanceId) {
        const dateFormatted = format(reservation.date, "EEEE d MMMM yyyy", { locale: it });
        const people = reservation.partySize === 1 ? "1 persona" : `${reservation.partySize} persone`;
        const confirmMsg = `✅ Prenotazione confermata!\n\n📋 Codice: ${reservation.code}\n📅 ${dateFormatted}\n🕐 Orario: ${reservation.time}\n👥 ${people}\n\nTi aspettiamo! 🍽️`;
        await sendMessage({
          token: waCfg.token,
          instanceId: waCfg.instanceId,
          number: reservation.phone.replace(/\D/g, ""),
          message: confirmMsg,
        });
        void logWhatsapp("outbound", "confirmation", reservation.phone.replace(/\D/g, ""));
      }
    } catch (err) {
      console.error("[whatsapp/verify] confirmation send failed:", err);
    }

    return NextResponse.json({ verified: true });
  }

  const attempts = reservation.verificationAttempts + 1;

  if (attempts >= 2) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED", verificationAttempts: attempts },
    });
    emitEvent("reservation_updated", { id: reservationId });

    try {
      const waCfg = await getWhatsappConfig();
      if (waCfg.token && waCfg.instanceId) {
        await sendMessage({
          token: waCfg.token,
          instanceId: waCfg.instanceId,
          number: reservation.phone.replace(/\D/g, ""),
          message: `La tua prenotazione ${reservation.code} è stata annullata perché il numero di telefono non è stato verificato correttamente.\n\nSe vuoi prenotare nuovamente visita il nostro sito.`,
        });
        void logWhatsapp("outbound", "cancellation", reservation.phone.replace(/\D/g, ""));
      }
    } catch (err) {
      console.error("[whatsapp/verify] cancel notify failed:", err);
    }

    return NextResponse.json({ verified: false, cancelled: true });
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { verificationAttempts: attempts },
  });

  return NextResponse.json({ verified: false, attemptsLeft: 2 - attempts });
}
