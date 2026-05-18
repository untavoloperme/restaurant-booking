import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ClosureSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data: YYYY-MM-DD"),
  note: z.string().optional(),
});

export async function GET() {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const closures = await prisma.closureDay.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(closures);
}

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ClosureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const closure = await prisma.closureDay.create({
      data: {
        date: new Date(parsed.data.date),
        note: parsed.data.note,
      },
    });
    return NextResponse.json(closure, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Data già presente" }, { status: 409 });
  }
}
