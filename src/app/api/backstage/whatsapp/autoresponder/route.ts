import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";
import { syncAutoresponder } from "@/lib/sendapp";

export async function POST() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const keys = [
    "whatsapp.api.token",
    "whatsapp.instance.id",
    "whatsapp.message",
    "whatsapp.booking.url",
    "whatsapp.autoresponder.keywords",
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

  const keywords = map["whatsapp.autoresponder.keywords"] || "prenota,prenotazione,tavolo,menu,info,ciao,buongiorno,salve,buonasera";

  let mediaUrl: string | undefined;
  const logo = map["restaurant.logo"] ?? "";
  if (logo) {
    const absLogo = logo.startsWith("http") ? logo : `${baseUrl}${logo}`;
    if (absLogo.startsWith("https://")) mediaUrl = absLogo;
  }

  try {
    const result = await syncAutoresponder({ token, instanceId, keywords, message, mediaUrl });
    return NextResponse.json({ ok: true, raw: result.raw });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
