export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, getDaysInMonth, startOfDay } from "date-fns";
import { z } from "zod";

const QuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number),
  month: z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 12, "Mese non valido"),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const { year, month } = parsed.data;
  const monthStart = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(monthStart);
  const monthEnd = new Date(year, month - 1, daysInMonth, 23, 59, 59);

  const [hoursConfigs, closures] = await Promise.all([
    prisma.openingHours.findMany(),
    prisma.closureDay.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  const activeByDow = new Set(
    hoursConfigs.filter((h) => h.active).map((h) => h.dayOfWeek)
  );
  const closedDates = new Set(closures.map((c) => format(c.date, "yyyy-MM-dd")));

  const today = startOfDay(new Date());
  const openDays: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date < today) continue;
    const dateStr = format(date, "yyyy-MM-dd");
    if (activeByDow.has(date.getDay()) && !closedDates.has(dateStr)) {
      openDays.push(dateStr);
    }
  }

  return NextResponse.json({ openDays });
}
