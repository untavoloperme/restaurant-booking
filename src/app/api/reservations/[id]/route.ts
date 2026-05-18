import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { emitEvent } from "@/lib/sse";

const PatchSchema = z.object({
  status: z.enum(["PENDING", "ARRIVED", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]).optional(),
  notes: z.string().optional(),
  tableId: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: { table: { include: { room: true } } },
  });
  if (!reservation) return NextResponse.json({ error: "Non trovata" }, { status: 404 });
  return NextResponse.json(reservation);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const reservation = await prisma.reservation.update({
    where: { id: params.id },
    data: parsed.data,
    include: { table: { include: { room: true } } },
  });

  emitEvent("reservation_updated", { id: reservation.id, status: reservation.status });
  return NextResponse.json(reservation);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  await prisma.reservation.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
  emitEvent("reservation_updated", { id: params.id, status: "CANCELLED" });
  return new NextResponse(null, { status: 204 });
}
