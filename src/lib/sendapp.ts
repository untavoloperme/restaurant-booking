import { prisma } from "@/lib/prisma";

const SENDAPP_BASE = "https://app.sendapp.cloud/api/v2";

export interface WhatsappConfig {
  enabled: boolean;
  token: string;
  instanceId: string;
  serviceEnabled: boolean;
  message: string;
  bookingUrl: string;
}

export async function getWhatsappConfig(): Promise<WhatsappConfig> {
  const keys = [
    "whatsapp.enabled",
    "whatsapp.api.token",
    "whatsapp.instance.id",
    "whatsapp.service.enabled",
    "whatsapp.message",
    "whatsapp.booking.url",
  ];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  return {
    enabled: map["whatsapp.enabled"] === "true",
    token: map["whatsapp.api.token"] ?? "",
    instanceId: map["whatsapp.instance.id"] ?? "",
    serviceEnabled: map["whatsapp.service.enabled"] === "true",
    message: map["whatsapp.message"] ?? defaultMessage(),
    bookingUrl: map["whatsapp.booking.url"] || `${baseUrl}/prenota`,
  };
}

export function defaultMessage(): string {
  return `🍽️ Prenota il tuo tavolo in pochi click!\n\n👇 Clicca qui per prenotare direttamente:\n{link}\n\nIl tuo numero è già inserito, in pochi secondi sei pronto! ✅\n\nA presto! 😊`;
}

export interface SendAppAccount {
  instance_id: string;
  status: string;
  name?: string;
}

export async function listAccounts(token: string): Promise<SendAppAccount[]> {
  const res = await fetch(`${SENDAPP_BASE}/whatsapp/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SendApp accounts error: ${res.status}`);
  const data = await res.json() as { data?: SendAppAccount[] } | SendAppAccount[];
  if (Array.isArray(data)) return data;
  return (data as { data?: SendAppAccount[] }).data ?? [];
}

interface SendMessageParams {
  token: string;
  instanceId: string;
  number: string;
  message: string;
  mediaUrl?: string;
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
  const { token, instanceId, number, message, mediaUrl } = params;
  const body: Record<string, string> = {
    number,
    message,
    instance_id: instanceId,
  };
  if (mediaUrl) body.media_url = mediaUrl;

  const res = await fetch(`${SENDAPP_BASE}/whatsapp/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SendApp send error ${res.status}: ${text}`);
  }
}

export function buildBookingLink(bookingUrl: string, phone: string): string {
  const url = new URL(bookingUrl);
  url.searchParams.set("phone", phone);
  return url.toString();
}

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("39") && digits.length > 10) digits = digits.slice(2);
  return digits;
}

export function extractPhone(body: Record<string, unknown>): string | null {
  const candidates = [
    body.phone,
    body.number,
    body.from,
    body.sender,
    (body.data as Record<string, unknown> | undefined)?.from,
    (body.data as Record<string, unknown> | undefined)?.phone,
    (body.data as Record<string, unknown> | undefined)?.number,
    (body.message as Record<string, unknown> | undefined)?.from,
    body.chatId,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const digits = c.replace(/\D/g, "");
      if (digits.length >= 10) return digits;
    }
  }
  return null;
}

export function isFromMe(body: Record<string, unknown>): boolean {
  return (
    body.fromMe === true ||
    body.from_me === true ||
    body.self === true ||
    (body.data as Record<string, unknown> | undefined)?.fromMe === true
  );
}
