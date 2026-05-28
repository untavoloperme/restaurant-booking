import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";
import { syncAutoresponder, getChatbotRule } from "@/lib/sendapp";

export async function POST() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const keys = [
    "whatsapp.api.token",
    "whatsapp.instance.id",
    "whatsapp.message",
    "whatsapp.booking.url",
    "whatsapp.autoresponder.keywords",
    "whatsapp.chatbot.rule.id",
    "restaurant.logo",
  ];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const token = map["whatsapp.api.token"] ?? "";
  const instanceId = map["whatsapp.instance.id"] ?? "";
  if (!token || !instanceId) {
    return NextResponse.json({ error: "Token o account WhatsApp non configurati" }, { status: 400 });
  }

  const baseUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  const bookingUrl = map["whatsapp.booking.url"] || `${baseUrl}/prenota`;
  const message = (map["whatsapp.message"] || `🍽️ Prenota il tuo tavolo in pochi click!\n\n👇 Clicca qui:\n{link}\n\nA presto! 😊`)
    .replace(/\{link\}/g, bookingUrl);

  const keywords = map["whatsapp.autoresponder.keywords"] || "prenota,prenotare,prenotazione,tavolo,ciao,salve,buongiorno,buonasera,info,menu";
  const existingRuleId = map["whatsapp.chatbot.rule.id"] ?? undefined;

  let mediaUrl: string | undefined;
  const logo = map["restaurant.logo"] ?? "";
  if (logo) {
    const absLogo = logo.startsWith("http") ? logo : `${baseUrl}${logo}`;
    if (absLogo.startsWith("https://")) mediaUrl = absLogo;
  }

  const syncedAt = new Date().toISOString();
  try {
    const result = await syncAutoresponder({ token, instanceId, keywords, message, mediaUrl, existingRuleId });

    const saveOps = [
      prisma.setting.upsert({ where: { key: "whatsapp.last.sync.at" },  create: { key: "whatsapp.last.sync.at",  value: syncedAt },                  update: { value: syncedAt } }),
      prisma.setting.upsert({ where: { key: "whatsapp.last.sync.ok" },  create: { key: "whatsapp.last.sync.ok",  value: "true" },                    update: { value: "true" } }),
      prisma.setting.upsert({ where: { key: "whatsapp.last.sync.raw" }, create: { key: "whatsapp.last.sync.raw", value: JSON.stringify(result.raw) }, update: { value: JSON.stringify(result.raw) } }),
    ];
    if (result.ruleId) {
      saveOps.push(prisma.setting.upsert({ where: { key: "whatsapp.chatbot.rule.id" }, create: { key: "whatsapp.chatbot.rule.id", value: result.ruleId }, update: { value: result.ruleId } }));
    }
    await Promise.all(saveOps);

    // Fetch the created rule so we can inspect it
    const ruleDetail = result.ruleId ? await getChatbotRule(token, result.ruleId).catch(() => null) : null;

    return NextResponse.json({ ok: true, raw: result.raw, ruleId: result.ruleId, ruleDetail });
  } catch (err) {
    const errMsg = (err as Error).message;
    await Promise.all([
      prisma.setting.upsert({ where: { key: "whatsapp.last.sync.at" },  create: { key: "whatsapp.last.sync.at",  value: syncedAt }, update: { value: syncedAt } }),
      prisma.setting.upsert({ where: { key: "whatsapp.last.sync.ok" },  create: { key: "whatsapp.last.sync.ok",  value: "false" },  update: { value: "false" } }),
      prisma.setting.upsert({ where: { key: "whatsapp.last.sync.raw" }, create: { key: "whatsapp.last.sync.raw", value: errMsg },    update: { value: errMsg } }),
    ]).catch(() => {});
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
