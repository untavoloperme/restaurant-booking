import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  if (!month) return NextResponse.json({});

  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      date: { gte: start, lt: end },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: { date: true },
  });

  const counts: Record<string, number> = {};
  for (const r of reservations) {
    const key = format(r.date, "yyyy-MM-dd");
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return NextResponse.json(counts);
}
