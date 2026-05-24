import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, differenceInMinutes, addDays } from "date-fns";

export async function GET(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam   = searchParams.get("to");

  if (!fromParam || !toParam)
    return NextResponse.json({ error: "from e to obbligatori" }, { status: 400 });

  const from = new Date(fromParam);
  const to   = addDays(new Date(toParam), 1);

  // ── 1. Prenotazioni per data ──────────────────────────────
  const allReservations = await prisma.reservation.findMany({
    where: { date: { gte: from, lt: to } },
    select: { date: true, status: true, partySize: true, arrivedAt: true, checkedOutAt: true },
    orderBy: { date: "asc" },
  });

  const resMap: Record<string, { date: string; total: number; people: number; cancelled: number; noshow: number }> = {};
  for (const r of allReservations) {
    const key = format(r.date, "yyyy-MM-dd");
    if (!resMap[key]) resMap[key] = { date: key, total: 0, people: 0, cancelled: 0, noshow: 0 };
    resMap[key].total += 1;
    if (r.status === "CANCELLED") resMap[key].cancelled += 1;
    else if (r.status === "NO_SHOW") resMap[key].noshow += 1;
    else resMap[key].people += r.partySize;
  }
  const reservationsByDate = Object.values(resMap);

  // ── 2. Incasso per data (basato su createdAt ordine) ─────
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: {
      createdAt: true,
      items: { include: { menuItem: { select: { price: true } } } },
    },
  });

  const revenueMap: Record<string, { date: string; orders: number; total: number }> = {};
  for (const o of orders) {
    const key = format(o.createdAt, "yyyy-MM-dd");
    if (!revenueMap[key]) revenueMap[key] = { date: key, orders: 0, total: 0 };
    revenueMap[key].orders += 1;
    for (const item of o.items) {
      revenueMap[key].total += item.quantity * parseFloat(item.menuItem.price.toString());
    }
  }
  const revenueByDate = Object.values(revenueMap).sort((a, b) => a.date.localeCompare(b.date));
  const totalRevenue  = revenueByDate.reduce((s, d) => s + d.total, 0);

  // ── 3. Piatti più ordinati ────────────────────────────────
  const orderItems = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: from, lte: to } } },
    include: { menuItem: { select: { name: true, price: true } } },
  });

  const dishMap: Record<string, { menuItemId: string; name: string; quantity: number; revenue: number }> = {};
  for (const oi of orderItems) {
    const id = oi.menuItemId;
    if (!dishMap[id]) dishMap[id] = { menuItemId: id, name: oi.menuItem.name, quantity: 0, revenue: 0 };
    dishMap[id].quantity += oi.quantity;
    dishMap[id].revenue  += oi.quantity * parseFloat(oi.menuItem.price.toString());
  }
  const topDishes = Object.values(dishMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15);

  // ── 4. Tempo medio di permanenza ─────────────────────────
  const completedRes = allReservations.filter(
    (r) => r.status === "CHECKED_OUT" && r.arrivedAt && r.checkedOutAt
  ) as Array<{ arrivedAt: Date; checkedOutAt: Date }>;

  let avgDuration = null;
  if (completedRes.length > 0) {
    const durations = completedRes.map((r) =>
      differenceInMinutes(new Date(r.checkedOutAt), new Date(r.arrivedAt))
    );
    const avg = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    avgDuration = {
      avgMinutes: avg,
      minMinutes: min,
      maxMinutes: max,
      samples: completedRes.length,
    };
  }

  return NextResponse.json({
    reservationsByDate,
    revenueByDate,
    totalRevenue,
    topDishes,
    avgDuration,
  });
}
