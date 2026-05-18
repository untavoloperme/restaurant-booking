import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ShiftSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const DaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  active: z.boolean(),
  shifts: z.array(ShiftSchema),
  slotInterval: z.number().int().min(5).max(60).optional().default(15),
});

export async function GET() {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const hours = await prisma.openingHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  return NextResponse.json(hours);
}

export async function PUT(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.array(DaySchema).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const updated = await Promise.all(
    parsed.data.map((day) =>
      prisma.openingHours.upsert({
        where: { dayOfWeek: day.dayOfWeek },
        create: day,
        update: day,
      })
    )
  );
  return NextResponse.json(updated);
}
