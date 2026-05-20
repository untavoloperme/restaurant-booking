import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma, isPrismaUniqueViolation } from "@/lib/prisma";
import { ALLERGEN_ICON_KEYS } from "@/lib/allergen-icons";
import { z } from "zod";

const Schema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1),
  icon: z.enum(ALLERGEN_ICON_KEYS).nullable().optional(),
});

export async function GET() {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const allergens = await prisma.allergen.findMany({ orderBy: { number: "asc" } });
  return NextResponse.json(allergens);
}

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  try {
    const allergen = await prisma.allergen.create({ data: parsed.data });
    return NextResponse.json(allergen, { status: 201 });
  } catch (err) {
    if (isPrismaUniqueViolation(err)) return NextResponse.json({ error: "Numero già esistente" }, { status: 409 });
    console.error("[POST /api/allergens]", err);
    return NextResponse.json({ error: "Errore durante il salvataggio" }, { status: 500 });
  }
}
