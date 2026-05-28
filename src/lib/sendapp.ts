import { prisma } from "@/lib/prisma";

export async function logWhatsapp(direction: "outbound" | "inbound", type: string, phone: string) {
  try {
    await prisma.whatsappLog.create({ data: { direction, type, phone } });
  } catch {
    // non-critical
  }
}

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

function toWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Già con prefisso internazionale (es. 39XXXXXXXXXX)
  if (digits.length >= 11) return digits;
  // Numero italiano a 10 cifre senza prefisso → aggiungi 39
  if (digits.length === 10 && digits.startsWith("3")) return "39" + digits;
  return digits;
}

export async function sendMessage(params: SendMessageParams): Promise<void> {
  const { token, instanceId, number, message, mediaUrl } = params;
  const formattedNumber = toWhatsappNumber(number);
  const body: Record<string, string> = {
    number: formattedNumber,
    message,
    instance_id: instanceId,
  };
  if (mediaUrl) body.media_url = mediaUrl;

  console.log("[sendapp/sendMessage] to:", formattedNumber, "instance:", instanceId);

  const res = await fetch(`${SENDAPP_BASE}/whatsapp/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const responseText = await res.text().catch(() => "");
  console.log("[sendapp/sendMessage] status:", res.status, "response:", responseText.slice(0, 200));
  if (!res.ok) {
    throw new Error(`SendApp send error ${res.status}: ${responseText}`);
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

export function generateToken(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function deleteChatbotRule(token: string, ruleId: string): Promise<void> {
  const res = await fetch(`${SENDAPP_BASE}/chatbot/${ruleId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("[sendapp/deleteChatbotRule] id:", ruleId, "status:", res.status);
}

export async function listChatbotRules(token: string, instanceId: string): Promise<{ id: number }[]> {
  const res = await fetch(`${SENDAPP_BASE}/chatbot?instance_id=${encodeURIComponent(instanceId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  console.log("[sendapp/listChatbotRules] status:", res.status, "data:", JSON.stringify(data).slice(0, 300));
  const rows = (data as { data?: { id: number }[] } | null)?.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function getChatbotRule(token: string, ruleId: string): Promise<unknown> {
  const res = await fetch(`${SENDAPP_BASE}/chatbot/${ruleId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  console.log("[sendapp/getChatbotRule] id:", ruleId, "status:", res.status, "data:", JSON.stringify(data).slice(0, 300));
  return data;
}

interface SyncAutoresponderParams {
  token: string;
  instanceId: string;
  keywords: string;
  message: string;
  name?: string;
  mediaUrl?: string;
  existingRuleId?: string;
}

export async function syncAutoresponder(params: SyncAutoresponderParams): Promise<{ ok: boolean; raw?: unknown; ruleId?: string }> {
  const { token, instanceId, keywords, message, name = "Autorisponditore" } = params;
  void (params.mediaUrl); // media non supportato dall'endpoint chatbot

  // Elimina TUTTE le regole esistenti per l'istanza (evita duplicati)
  const existing = await listChatbotRules(token, instanceId).catch(() => [] as { id: number }[]);
  console.log("[sendapp/syncAutoresponder] existing rules:", existing.map(r => r.id));
  await Promise.all(existing.map(r => deleteChatbotRule(token, String(r.id)).catch(() => {})));

  // Keywords come stringa CSV — SendApp non accetta array JSON
  const keywordsCsv = keywords
    .split(",")
    .map(k => k.trim())
    .filter(Boolean)
    .join(",");

  const body: Record<string, unknown> = {
    name,
    keywords: keywordsCsv,
    caption: message,
    instance_id: instanceId,
    type_search: 1,  // 0=exact, 1=contains
    send_to: 0,      // 0=sender
  };

  console.log("[sendapp/syncAutoresponder] POST payload:", JSON.stringify(body).slice(0, 400));
  const res = await fetch(`${SENDAPP_BASE}/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const raw = await res.json().catch(() => null);
  console.log("[sendapp/syncAutoresponder] POST status:", res.status, "body:", JSON.stringify(raw).slice(0, 300));
  if (!res.ok) throw new Error(`SendApp chatbot error ${res.status}: ${JSON.stringify(raw)}`);

  const ruleId = (raw as { data?: { id?: number } } | null)?.data?.id
    ? String((raw as { data: { id: number } }).data.id)
    : undefined;

  return { ok: true, raw, ruleId };
}
