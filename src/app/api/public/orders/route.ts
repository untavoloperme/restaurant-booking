import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/sse";
import { z } from "zod";

const CreateOrderSchema = z.object({
  tableId: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { tableId, notes, items } = parsed.data;

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { reservations: { where: { status: "ARRIVED" }, take: 1 } },
  });
  if (!table) {
    return NextResponse.json({ error: "Tavolo non trovato" }, { status: 404 });
  }
  if (table.reservations.length === 0) {
    return NextResponse.json({ error: "Il tavolo risulta libero" }, { status: 403 });
  }

  const order = await prisma.order.create({
    data: {
      tableId,
      notes,
      items: {
        create: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        })),
      },
    },
    include: {
      table: { include: { room: true } },
      items: { include: { menuItem: true } },
    },
  });

  emitEvent("order_created", { orderId: order.id, tableId, tableName: table.name });

  return NextResponse.json(order, { status: 201 });
}
