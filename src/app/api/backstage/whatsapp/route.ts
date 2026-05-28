import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";

const WA_KEYS = [
  "whatsapp.enabled",
  "whatsapp.api.token",
  "whatsapp.instance.id",
  "whatsapp.message",
  "whatsapp.booking.url",
  "whatsapp.autoresponder.keywords",
] as const;

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const rows = await prisma.setting.findMany({ where: { key: { in: [...WA_KEYS] } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const token = map["whatsapp.api.token"] ?? "";
  const maskedToken = token.length > 4 ? `••••${token.slice(-4)}` : token ? "••••" : "";

  const baseUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");

  return NextResponse.json({
    enabled: map["whatsapp.enabled"] === "true",
    token: maskedToken,
    hasToken: token.length > 0,
    instanceId: map["whatsapp.instance.id"] ?? "",
    message: map["whatsapp.message"] ?? "",
    bookingUrl: map["whatsapp.booking.url"] || `${baseUrl}/prenota`,
    keywords: map["whatsapp.autoresponder.keywords"] ?? "",
  });
}

export async function PATCH(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  const updates: Array<{ key: string; value: string }> = [];

  if (typeof body.enabled === "boolean") {
    updates.push({ key: "whatsapp.enabled", value: body.enabled ? "true" : "false" });
  }
  if (typeof body.token === "string" && body.token.trim()) {
    updates.push({ key: "whatsapp.api.token", value: body.token.trim() });
  }
  if (typeof body.instanceId === "string") {
    updates.push({ key: "whatsapp.instance.id", value: body.instanceId.trim() });
  }
  if (typeof body.message === "string") {
    updates.push({ key: "whatsapp.message", value: body.message });
  }
  if (typeof body.bookingUrl === "string") {
    updates.push({ key: "whatsapp.booking.url", value: body.bookingUrl.trim() });
  }
  if (typeof body.keywords === "string") {
    updates.push({ key: "whatsapp.autoresponder.keywords", value: body.keywords.trim() });
  }

  for (const { key, value } of updates) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  return NextResponse.json({ ok: true });
}
