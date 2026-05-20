import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().optional(),
  categoryId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const sub = await prisma.menuSubcategory.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(sub);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // Move items in this subcategory to no subcategory (keep categoryId)
  await prisma.menuItem.updateMany({
    where: { subcategoryId: params.id },
    data: { subcategoryId: null },
  });

  await prisma.menuSubcategory.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
