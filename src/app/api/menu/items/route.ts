import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  available: z.boolean().default(true),
  order: z.number().int().default(0),
  allergenIds: z.array(z.string()).default([]),
  mealPeriod: z.enum(["ALWAYS", "LUNCH", "DINNER"]).default("ALWAYS"),
  featured: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const item = await prisma.menuItem.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
