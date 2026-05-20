import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitEvent } from "@/lib/sse";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["RECEIVED", "PREPARING", "READY", "DELIVERED"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  if (session.user.role !== "ADMIN" && session.user.role !== "KITCHEN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Stato non valido" }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
    include: {
      table: { include: { room: true } },
      items: { include: { menuItem: true } },
    },
  });

  emitEvent("order_updated", {
    orderId: order.id,
    status: order.status,
    tableId: order.tableId,
    tableName: order.table.name,
  });

  return NextResponse.json(order);
}
