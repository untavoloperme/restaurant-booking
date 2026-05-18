import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTableFree } from "@/lib/assign-table";
import { emitEvent } from "@/lib/sse";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { tableId } = await req.json();
  if (!tableId) return NextResponse.json({ error: "tableId mancante" }, { status: 400 });

  const existing = await prisma.reservation.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Non trovata" }, { status: 404 });

  // Verifica che il tavolo target sia libero per questa prenotazione
  const free = await isTableFree(tableId, existing.date, existing.time, params.id);
  if (!free) {
    return NextResponse.json({ error: "Il tavolo è già occupato in questo orario" }, { status: 409 });
  }

  const reservation = await prisma.reservation.update({
    where: { id: params.id },
    data: { tableId },
    include: { table: { include: { room: true } } },
  });

  emitEvent("reservation_moved", { id: reservation.id, tableId });
  return NextResponse.json(reservation);
}
