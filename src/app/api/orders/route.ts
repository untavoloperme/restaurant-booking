import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const statuses = statusParam ? statusParam.split(",") : ["RECEIVED", "PREPARING", "READY"];
  const dateParam = searchParams.get("date"); // YYYY-MM-DD

  const dateFilter = dateParam
    ? {
        createdAt: {
          gte: new Date(`${dateParam}T00:00:00`),
          lt:  new Date(`${dateParam}T23:59:59.999`),
        },
      }
    : {};

  const orders = await prisma.order.findMany({
    where: {
      status: { in: statuses as ("RECEIVED" | "PREPARING" | "READY" | "DELIVERED")[] },
      ...dateFilter,
    },
    include: {
      table: { include: { room: true } },
      items: {
        include: { menuItem: true },
        orderBy: { menuItem: { name: "asc" } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(orders);
}
