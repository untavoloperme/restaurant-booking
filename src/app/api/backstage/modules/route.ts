import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";
import { MODULE_KEYS } from "@/lib/modules";

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const rows = await prisma.setting.findMany({
    where: { key: { in: [...MODULE_KEYS] } },
  });
  const result: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    const row = rows.find((r) => r.key === key);
    result[key] = row ? row.value !== "false" : true;
  }
  return NextResponse.json(result);
}

export async function PATCH(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json() as Record<string, boolean>;
  const updates = Object.entries(body).filter(([k]) =>
    (MODULE_KEYS as readonly string[]).includes(k)
  );

  for (const [key, enabled] of updates) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: enabled ? "true" : "false" },
      update: { value: enabled ? "true" : "false" },
    });
  }
  return NextResponse.json({ ok: true });
}
