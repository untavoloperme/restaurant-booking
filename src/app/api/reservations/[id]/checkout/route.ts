import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/sse";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const reservation = await prisma.reservation.update({
    where: { id: params.id },
    data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
    include: { table: { include: { room: true } } },
  });

  emitEvent("reservation_updated", { id: reservation.id, status: "CHECKED_OUT" });
  return NextResponse.json(reservation);
}
