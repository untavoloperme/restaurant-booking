import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import type { Shift } from "@/lib/slots";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  const date = new Date(dateStr);
  const nextDay = addDays(date, 1);

  const closure = await prisma.closureDay.findFirst({
    where: { date: { gte: date, lt: nextDay } },
  });
  if (closure) {
    return NextResponse.json({ open: false, reason: "closure", note: closure.note ?? null });
  }

  const config = await prisma.openingHours.findUnique({ where: { dayOfWeek: date.getDay() } });
  if (!config || !config.active) {
    return NextResponse.json({ open: false, reason: "inactive" });
  }

  return NextResponse.json({ open: true, shifts: config.shifts as unknown as Shift[] });
}
