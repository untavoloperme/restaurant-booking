import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().default(0),
});

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const sub = await prisma.menuSubcategory.create({ data: parsed.data });
  return NextResponse.json(sub, { status: 201 });
}
