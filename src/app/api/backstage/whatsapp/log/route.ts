import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const [messages, syncSettings] = await Promise.all([
    prisma.whatsappLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.setting.findMany({
      where: { key: { in: ["whatsapp.last.sync.at", "whatsapp.last.sync.ok", "whatsapp.last.sync.raw", "whatsapp.chatbot.rule.id"] } },
    }),
  ]);

  const syncMap = Object.fromEntries(syncSettings.map(s => [s.key, s.value]));

  const lastSync = syncMap["whatsapp.last.sync.at"]
    ? {
        at:     syncMap["whatsapp.last.sync.at"],
        ok:     syncMap["whatsapp.last.sync.ok"] === "true",
        raw:    syncMap["whatsapp.last.sync.raw"] ?? "",
        ruleId: syncMap["whatsapp.chatbot.rule.id"] ?? null,
      }
    : null;

  return NextResponse.json({ messages, lastSync });
}
