import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  type: z.enum(["categories", "subcategories", "items"]),
  items: z.array(z.object({ id: z.string(), order: z.number().int() })),
});

export async function PATCH(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { type, items } = parsed.data;

  await Promise.all(
    items.map(({ id, order }) => {
      if (type === "categories") return prisma.menuCategory.update({ where: { id }, data: { order } });
      if (type === "subcategories") return prisma.menuSubcategory.update({ where: { id }, data: { order } });
      return prisma.menuItem.update({ where: { id }, data: { order } });
    })
  );

  return NextResponse.json({ ok: true });
}
