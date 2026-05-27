import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getWhatsappConfig,
  sendMessage,
  buildBookingLink,
  normalizePhone,
  extractPhone,
  isFromMe,
} from "@/lib/sendapp";

export const dynamic = "force-dynamic";

// In-memory throttle: phone → last-responded timestamp
const lastReplied = new Map<string, number>();
const THROTTLE_MS = 60 * 60 * 1000; // 60 min

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = (await req.json()) as Record<string, unknown>;
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text) as Record<string, unknown>;
      } catch {
        body = Object.fromEntries(new URLSearchParams(text));
      }
    }
  } catch {
    // If we can't parse the body at all, log and return 200 to avoid retries
    console.warn("[whatsapp/webhook] unparseable body");
    return NextResponse.json({ ok: true });
  }

  // Log raw body in dev for debugging the exact payload shape
  if (process.env.NODE_ENV !== "production") {
    console.log("[whatsapp/webhook] body:", JSON.stringify(body).slice(0, 500));
  }

  // Ignore outgoing messages to avoid infinite loops
  if (isFromMe(body)) return NextResponse.json({ ok: true });

  const rawPhone = extractPhone(body);
  if (!rawPhone) return NextResponse.json({ ok: true });

  const phone = normalizePhone(rawPhone);
  if (!phone) return NextResponse.json({ ok: true });

  // Throttle: max once per 60 min per number
  const now = Date.now();
  const last = lastReplied.get(phone);
  if (last && now - last < THROTTLE_MS) return NextResponse.json({ ok: true });

  // Check module + service enabled
  const cfg = await getWhatsappConfig();
  if (!cfg.enabled || !cfg.serviceEnabled) return NextResponse.json({ ok: true });
  if (!cfg.token || !cfg.instanceId) return NextResponse.json({ ok: true });

  // Build reply
  const link = buildBookingLink(cfg.bookingUrl, phone);
  const text = cfg.message.replace(/\{link\}/g, link);

  // Resolve logo to absolute URL
  let mediaUrl: string | undefined;
  const logoRow = await prisma.setting.findUnique({ where: { key: "restaurant.logo" } });
  if (logoRow?.value) {
    const baseUrl = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
    const logo = logoRow.value.startsWith("http") ? logoRow.value : `${baseUrl}${logoRow.value}`;
    if (logo.startsWith("https://")) mediaUrl = logo;
  }

  try {
    await sendMessage({ token: cfg.token, instanceId: cfg.instanceId, number: phone, message: text, mediaUrl });
    lastReplied.set(phone, now);
  } catch (err) {
    console.error("[whatsapp/webhook] sendMessage failed:", err);
    // Still return 200 so SendApp doesn't retry flood us
  }

  return NextResponse.json({ ok: true });
}
