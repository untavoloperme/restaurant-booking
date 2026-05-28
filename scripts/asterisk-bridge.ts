/**
 * Worker persistente Asterisk AMI.
 * Avviato da PM2 come processo separato.
 *
 * Flusso:
 * 1. Legge la config dal DB ogni CHECK_INTERVAL se non connesso.
 * 2. Se il modulo è abilitato e le credenziali AMI sono presenti, apre la connessione.
 * 3. Su evento Newchannel dal context configurato:
 *    - Agganciata immediata (Hangup)
 *    - Salva MissedCall nel DB
 *    - Se cellulare italiano + WhatsApp attivo → invia messaggio prenotazione
 * 4. Heartbeat ogni 30s su asterisk.status.worker_alive
 * 5. Polling stato ogni 30s (SIPshowregistry + SIPshowpeer)
 * 6. Su disconnessione → retry con backoff esponenziale
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { getAsteriskConfig, isItalianMobile } from "../src/lib/asterisk";
import { getWhatsappConfig, sendMessage, buildBookingLink, logWhatsapp, normalizePhone } from "../src/lib/sendapp";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AsteriskManager = require("asterisk-manager");

const prisma = new PrismaClient();

const CHECK_INTERVAL = 10_000;   // 10s quando non connesso
const HEARTBEAT_INTERVAL = 30_000;
const STATUS_INTERVAL = 30_000;

// Throttle per evitare spam WhatsApp (60 min in-memory)
const throttleMap = new Map<string, number>();
const THROTTLE_MS = 60 * 60 * 1000;

// Dedup per channel ID: evita doppio invio se Asterisk emette due Newchannel per la stessa chiamata
const processedChannels = new Set<string>();

function isThrottled(phone: string): boolean {
  const last = throttleMap.get(phone);
  if (!last) return false;
  return Date.now() - last < THROTTLE_MS;
}

function setThrottle(phone: string) {
  throttleMap.set(phone, Date.now());
}

async function upsertSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

let ami: typeof AsteriskManager | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let statusTimer: ReturnType<typeof setInterval> | null = null;
let checkTimer: ReturnType<typeof setTimeout> | null = null;
let connected = false;
let retryDelay = 5_000;

function clearTimers() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (statusTimer) { clearInterval(statusTimer); statusTimer = null; }
  if (checkTimer) { clearTimeout(checkTimer); checkTimer = null; }
}

function disconnect() {
  connected = false;
  clearTimers();
  if (ami) {
    try { ami.disconnect(); } catch { /* ignore */ }
    ami = null;
  }
}

async function updateStatus(trunkName: string) {
  if (!ami || !connected) return;
  try {
    await upsertSetting("asterisk.status.last_check", new Date().toISOString());

    // Registrazione: lettura diretta da asterisk CLI (SIPshowregistry AMI non restituisce output nel callback)
    try {
      const out = execSync("asterisk -rx 'sip show registry'", { timeout: 5000 }).toString();
      const registered = out.includes("Registered") && !out.startsWith("0 SIP");
      await upsertSetting("asterisk.status.registered", registered ? "true" : "false");
    } catch {
      await upsertSetting("asterisk.status.registered", "false");
    }

    ami.action({ Action: "SIPshowpeer", Peer: trunkName }, (_err: Error | null, res: { dynamic?: string; status?: string }) => {
      const state = res?.status ?? "Unknown";
      upsertSetting("asterisk.status.peer_state", state).catch(() => {});
    });
  } catch { /* non-critical */ }
}

async function handleNewChannel(event: Record<string, string>) {
  const context = event.context ?? event.Context ?? "";
  const channel = event.channel ?? event.Channel ?? "";
  const callerRaw = event.calleridnum ?? event.callerid ?? event.CallerIDNum ?? event.CallerID ?? "";

  const cfg = await getAsteriskConfig().catch(() => null);
  if (!cfg?.enabled) return;
  if (context !== cfg.trunkContext) return;

  // Dedup: ignora se questo channel è già stato processato
  if (channel && processedChannels.has(channel)) return;
  if (channel) {
    processedChannels.add(channel);
    setTimeout(() => processedChannels.delete(channel), 60_000);
  }

  console.log(`[asterisk-bridge] Newchannel context=${context} caller=${callerRaw} channel=${channel}`);

  // Hangup immediato
  if (ami && connected && channel) {
    ami.action({ Action: "Hangup", Channel: channel, Cause: 16 }, () => {});
  }

  const phone = normalizePhone(callerRaw);
  if (!phone || phone.length < 6) return;

  const mobile = isItalianMobile(phone);

  // Salva nel DB — dedup: ignora se stesso numero nei 30s precedenti
  let callId: string | null = null;
  try {
    const since = new Date(Date.now() - 30_000);
    const recent = await prisma.missedCall.findFirst({
      where: { phone, createdAt: { gte: since } },
      select: { id: true },
    });
    if (recent) {
      console.log(`[asterisk-bridge] dedup DB: chiamata da ${phone} già registrata (${recent.id})`);
      return;
    }
    const call = await prisma.missedCall.create({
      data: { phone, isMobile: mobile },
    });
    callId = call.id;
    console.log(`[asterisk-bridge] MissedCall id=${callId} phone=${phone} mobile=${mobile}`);
  } catch (e) {
    console.error("[asterisk-bridge] DB error:", e);
    return;
  }

  // WhatsApp solo per cellulari con throttle
  if (!mobile) return;
  if (isThrottled(phone)) {
    console.log(`[asterisk-bridge] throttled ${phone}`);
    return;
  }

  try {
    const wa = await getWhatsappConfig();
    if (!wa.enabled || !wa.serviceEnabled || !wa.token || !wa.instanceId) return;

    const link = buildBookingLink(wa.bookingUrl, phone);
    const message = wa.message.replace("{link}", link);
    setThrottle(phone);
    await sendMessage({ token: wa.token, instanceId: wa.instanceId, number: phone, message });

    if (callId) {
      await prisma.missedCall.update({ where: { id: callId }, data: { whatsappSent: true } });
    }
    void logWhatsapp("outbound", "call_followup", phone);
    console.log(`[asterisk-bridge] WA sent to ${phone}`);
  } catch (e) {
    const errMsg = (e as Error).message ?? "Errore";
    console.error(`[asterisk-bridge] WA error for ${phone}:`, errMsg);
    if (callId) {
      await prisma.missedCall.update({
        where: { id: callId },
        data: { whatsappError: errMsg.slice(0, 255) },
      }).catch(() => {});
    }
  }
}

async function connect() {
  const cfg = await getAsteriskConfig().catch(() => null);

  if (!cfg?.enabled) {
    console.log("[asterisk-bridge] Modulo disabilitato, attesa...");
    await upsertSetting("asterisk.status.worker_alive", new Date().toISOString()).catch(() => {});
    checkTimer = setTimeout(connect, CHECK_INTERVAL);
    return;
  }

  if (!cfg.amiUser || !cfg.amiSecret) {
    console.log("[asterisk-bridge] Credenziali AMI mancanti, attesa...");
    await upsertSetting("asterisk.status.worker_alive", new Date().toISOString()).catch(() => {});
    checkTimer = setTimeout(connect, CHECK_INTERVAL);
    return;
  }

  console.log(`[asterisk-bridge] Connessione AMI ${cfg.amiHost}:${cfg.amiPort}...`);

  try {
    ami = new AsteriskManager(cfg.amiPort, cfg.amiHost, cfg.amiUser, cfg.amiSecret, true);
    ami.keepConnected();

    ami.on("connect", async () => {
      console.log("[asterisk-bridge] AMI connesso");
      connected = true;
      retryDelay = 5_000;
      await upsertSetting("asterisk.status.worker_alive", new Date().toISOString()).catch(() => {});

      heartbeatTimer = setInterval(async () => {
        await upsertSetting("asterisk.status.worker_alive", new Date().toISOString()).catch(() => {});
      }, HEARTBEAT_INTERVAL);

      const currentCfg = await getAsteriskConfig().catch(() => cfg);
      statusTimer = setInterval(() => updateStatus(currentCfg.trunkName), STATUS_INTERVAL);
      void updateStatus(currentCfg.trunkName);
    });

    ami.on("hangup", () => { /* ignorato, gestito da event Newchannel */ });

    ami.on("newchannel", (event: Record<string, string>) => {
      handleNewChannel(event).catch((e) => console.error("[asterisk-bridge] handleNewChannel error:", e));
    });

    ami.on("close", () => {
      console.log("[asterisk-bridge] AMI disconnesso, retry in", retryDelay / 1000, "s");
      disconnect();
      retryDelay = Math.min(retryDelay * 2, 30_000);
      checkTimer = setTimeout(connect, retryDelay);
    });

    ami.on("error", (err: Error) => {
      console.error("[asterisk-bridge] AMI error:", err.message);
    });

  } catch (e) {
    console.error("[asterisk-bridge] Errore connessione:", e);
    disconnect();
    retryDelay = Math.min(retryDelay * 2, 30_000);
    checkTimer = setTimeout(connect, retryDelay);
  }
}

process.on("SIGTERM", async () => {
  console.log("[asterisk-bridge] SIGTERM, chiusura...");
  disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

console.log("[asterisk-bridge] Avvio worker Asterisk AMI");
connect();
