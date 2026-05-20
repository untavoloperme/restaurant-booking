import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma, isPrismaUniqueViolation } from "@/lib/prisma";
import { ALLERGEN_ICON_KEYS } from "@/lib/allergen-icons";
import { z } from "zod";

const Schema = z.object({
  number: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  icon: z.enum(ALLERGEN_ICON_KEYS).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  try {
    const allergen = await prisma.allergen.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(allergen);
  } catch (err) {
    if (isPrismaUniqueViolation(err)) return NextResponse.json({ error: "Numero già esistente" }, { status: 409 });
    console.error("[PATCH /api/allergens/:id]", err);
    return NextResponse.json({ error: "Errore durante il salvataggio" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  await prisma.allergen.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
