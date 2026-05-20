import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      table: { include: { room: true } },
      items: {
        include: { menuItem: true },
        orderBy: { menuItem: { name: "asc" } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  }

  return NextResponse.json(order);
}
