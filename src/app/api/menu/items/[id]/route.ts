import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  available: z.boolean().optional(),
  order: z.number().int().optional(),
  allergenIds: z.array(z.string()).optional(),
  imageUrl: z.string().nullable().optional(),
  mealPeriod: z.enum(["ALWAYS", "LUNCH", "DINNER"]).optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const item = await prisma.menuItem.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  await prisma.menuItem.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
