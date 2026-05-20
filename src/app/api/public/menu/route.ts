import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tableId = searchParams.get("tableId");

  if (!tableId) {
    return NextResponse.json({ error: "tableId obbligatorio" }, { status: 400 });
  }

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      room: true,
      reservations: {
        where: { status: "ARRIVED" },
        take: 1,
      },
    },
  });

  if (!table) {
    return NextResponse.json({ error: "Tavolo non trovato" }, { status: 404 });
  }

  if (table.reservations.length === 0) {
    return NextResponse.json({ tableIsFree: true, table: { id: table.id, name: table.name, room: table.room } });
  }

  const [categories, allergens] = await Promise.all([
    prisma.menuCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          where: { available: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.allergen.findMany({ orderBy: { number: "asc" } }),
  ]);

  return NextResponse.json({
    table: { id: table.id, name: table.name, room: table.room },
    categories,
    allergens,
  });
}
