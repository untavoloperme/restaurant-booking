import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MODULE_KEYS } from "@/lib/modules";

export const dynamic = "force-dynamic";

export async function GET() {
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
