"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarCheck, Map, ChefHat, BarChart2, PenTool,
  UtensilsCrossed, Settings, Users, ShieldCheck, ShieldOff,
  LogOut, Loader2, ToggleLeft, ToggleRight, Lock,
  GitBranch, RefreshCw, CheckCircle2, AlertCircle, Terminal,
  Database, Trash2, Globe, MessageSquare, Smartphone,
  UserPlus, Pencil, X, KeyRound, ClipboardList, PhoneOutgoing, ShieldAlert,
  Phone, PhoneMissed,
} from "lucide-react";
import { Input } from "@/components/ui/input";

/* ── Definizione moduli ─────────────────────────────── */
const MODULES = [
  { key: "module.reservations",  label: "Prenotazioni",     desc: "Gestione e consultazione delle prenotazioni",     icon: CalendarCheck },
  { key: "module.floor",         label: "Planimetria Live", desc: "Vista in tempo reale dei tavoli occupati",         icon: Map },
  { key: "module.kitchen",       label: "Cucina",           desc: "Schermata ordini per la cucina (KDS)",             icon: ChefHat },
  { key: "module.stats",         label: "Statistiche",      desc: "Report e analisi delle prenotazioni",             icon: BarChart2 },
  { key: "module.layout-editor", label: "Editor Tavoli",    desc: "Disegno e configurazione della planimetria",      icon: PenTool },
  { key: "module.menu",          label: "Menu",             desc: "Gestione categorie, piatti e allergeni",          icon: UtensilsCrossed },
  { key: "module.settings",      label: "Impostazioni",     desc: "Parametri generali, orari, chiusure, branding",   icon: Settings },
  { key: "module.users",         label: "Utenti",           desc: "Creazione e gestione degli account del personale", icon: Users },
  { key: "module.chatbot",       label: "Chatbot",          desc: "Assistente virtuale per prenotazioni via chat (/widget)", icon: MessageSquare },
  { key: "module.webapp",        label: "Webapp Mobile",    desc: "Pagina di prenotazione mobile ottimizzata (/prenota)",    icon: Smartphone },
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];

interface BsUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF" | "KITCHEN";
  active: boolean;
  createdAt: string;
}

interface SystemInfo {
  version: string;
  gitHash: string;
  gitBranch: string;
  latestVersion: string | null;
}

interface WaLogEntry {
  id: string;
  direction: string;
  type: string;
  phone: string;
  createdAt: string;
}

interface WaLastSync {
  at: string;
  ok: boolean;
  raw: string;
  ruleId: string | null;
}

export default function BackstagePage() {
  const router = useRouter();
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saEmail, setSaEmail] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);

  // TOTP setup state
  const [totpStep, setTotpStep] = useState<"idle" | "setup" | "disabling">("idle");
  const [totpQr, setTotpQr] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpDisablePassword, setTotpDisablePassword] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState("");

  // System info state
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Deploy progress
  const [deployRunning, setDeployRunning] = useState(false);
  const [deploySteps, setDeploySteps] = useState<{ key: string; label: string; status: string }[]>([]);
  const [deployLines, setDeployLines] = useState<string[]>([]);
  const [deployDone, setDeployDone] = useState(false);
  const [deployError, setDeployError] = useState(false);
  const deployPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);

  const [logoutLoading, setLogoutLoading] = useState(false);

  // Demo data state
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [demoSeededAt, setDemoSeededAt] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMsg, setDemoMsg] = useState("");

  // WhatsApp / SendApp state
  const [waEnabled, setWaEnabled] = useState(false);
  const [waHasToken, setWaHasToken] = useState(false);
  const [waTokenInput, setWaTokenInput] = useState("");
  const [waInstanceId, setWaInstanceId] = useState("");
  const [waAccounts, setWaAccounts] = useState<{ instance_id: string; status: string; name?: string }[]>([]);
  const [waAccountsLoading, setWaAccountsLoading] = useState(false);
  const [waAccountsError, setWaAccountsError] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waBookingUrl, setWaBookingUrl] = useState("");
  const [waKeywords, setWaKeywords] = useState("");
  const [waSaving, setWaSaving] = useState(false);
  const [waMsg, setWaMsg] = useState("");
  const [waSyncLoading, setWaSyncLoading] = useState(false);
  const [waSyncMsg, setWaSyncMsg] = useState("");

  // Asterisk / SIP state
  const [astEnabled, setAstEnabled] = useState(false);
  const [astAmiHost, setAstAmiHost] = useState("127.0.0.1");
  const [astAmiPort, setAstAmiPort] = useState("5038");
  const [astAmiUser, setAstAmiUser] = useState("");
  const [astAmiSecretInput, setAstAmiSecretInput] = useState("");
  const [astHasAmiSecret, setAstHasAmiSecret] = useState(false);
  const [astTrunkName, setAstTrunkName] = useState("messagenet");
  const [astTrunkUsername, setAstTrunkUsername] = useState("5406386912");
  const [astTrunkSecretInput, setAstTrunkSecretInput] = useState("");
  const [astHasTrunkSecret, setAstHasTrunkSecret] = useState(false);
  const [astTrunkFromuser, setAstTrunkFromuser] = useState("5406386912");
  const [astTrunkFromdomain, setAstTrunkFromdomain] = useState("sip.messagenet.it");
  const [astTrunkHost, setAstTrunkHost] = useState("sip.messagenet.it");
  const [astTrunkPort, setAstTrunkPort] = useState("5061");
  const [astTrunkContext, setAstTrunkContext] = useState("from-trunk");
  const [astTrunkRegisterPhone, setAstTrunkRegisterPhone] = useState("");
  const [astSaving, setAstSaving] = useState(false);
  const [astMsg, setAstMsg] = useState("");
  const [astStatus, setAstStatus] = useState<{
    registered: boolean;
    peerState: string | null;
    lastCheck: string | null;
    workerActive: boolean;
  } | null>(null);
  const [astStatusLoading, setAstStatusLoading] = useState(false);
  const [astReloadLoading, setAstReloadLoading] = useState(false);
  const [astReloadMsg, setAstReloadMsg] = useState("");
  const [astSetupLoading, setAstSetupLoading] = useState(false);
  const [astSetupLines, setAstSetupLines] = useState<string[]>([]);
  const [astBuildRunning, setAstBuildRunning] = useState(false);
  const [astBuildLines, setAstBuildLines] = useState<string[]>([]);
  const [astLogsLoading, setAstLogsLoading] = useState(false);
  const [astLogsOutput, setAstLogsOutput] = useState("");
  const [astLogsVisible, setAstLogsVisible] = useState(false);

  // WhatsApp log state
  const [waLog, setWaLog] = useState<WaLogEntry[]>([]);
  const [waLastSync, setWaLastSync] = useState<WaLastSync | null>(null);
  const [waLogLoading, setWaLogLoading] = useState(false);
  const [waRawExpanded, setWaRawExpanded] = useState(false);

  // Users management state
  const [users, setUsers] = useState<BsUser[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "STAFF" as BsUser["role"] });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "STAFF" as BsUser["role"], active: true, password: "" });
  const [userLoading, setUserLoading] = useState(false);
  const [userMsg, setUserMsg] = useState("");

  const didFetch = useRef(false);

  // Auto-scroll log to bottom on new lines
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [deployLines]);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { if (deployPollRef.current) clearTimeout(deployPollRef.current); };
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    Promise.all([
      fetch("/api/backstage/modules").then(r => r.json()),
      fetch("/api/backstage/me").then(r => r.json()),
      fetch("/api/backstage/system").then(r => r.json()),
      fetch("/api/backstage/demo").then(r => r.json()),
      fetch("/api/backstage/whatsapp").then(r => r.json()),
      fetch("/api/backstage/users").then(r => r.json()),
      fetch("/api/backstage/asterisk").then(r => r.json()),
      fetch("/api/backstage/asterisk/status").then(r => r.json()),
    ]).then(([mods, me, sys, demo, wa, usrs, ast, astSt]) => {
      setModules(mods);
      setSaEmail(me.email ?? "");
      setTotpEnabled(me.totpEnabled ?? false);
      setSysInfo(sys);
      setDemoSeeded(demo.seeded ?? false);
      setDemoSeededAt(demo.seededAt ?? null);
      setWaEnabled(wa.enabled ?? false);
      setWaHasToken(wa.hasToken ?? false);
      setWaInstanceId(wa.instanceId ?? "");
      setWaMessage(wa.message ?? "");
      setWaBookingUrl(wa.bookingUrl ?? "");
      setWaKeywords(wa.keywords ?? "");
      if (Array.isArray(usrs)) setUsers(usrs);
      // Asterisk
      setAstEnabled(ast.enabled ?? false);
      setAstAmiHost(ast.amiHost ?? "127.0.0.1");
      setAstAmiPort(ast.amiPort ?? "5038");
      setAstAmiUser(ast.amiUser ?? "");
      setAstHasAmiSecret(ast.hasAmiSecret ?? false);
      setAstTrunkName(ast.trunkName ?? "messagenet");
      setAstTrunkUsername(ast.trunkUsername ?? "5406386912");
      setAstHasTrunkSecret(ast.hasTrunkSecret ?? false);
      setAstTrunkFromuser(ast.trunkFromuser ?? "5406386912");
      setAstTrunkFromdomain(ast.trunkFromdomain ?? "sip.messagenet.it");
      setAstTrunkHost(ast.trunkHost ?? "sip.messagenet.it");
      setAstTrunkPort(ast.trunkPort ?? "5061");
      setAstTrunkContext(ast.trunkContext ?? "from-trunk");
      setAstTrunkRegisterPhone(ast.trunkRegisterPhone ?? "");
      if (astSt && !astSt.error) setAstStatus(astSt);
    }).catch(() => router.push("/backstage/login"));

    void loadWaLog();
  }, [router]);

  async function toggleModule(key: ModuleKey) {
    const current = modules[key] !== false;
    const next = !current;
    setModules(prev => ({ ...prev, [key]: next }));
    setSavingKey(key);
    try {
      await fetch("/api/backstage/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
    } catch {
      setModules(prev => ({ ...prev, [key]: current }));
    } finally {
      setSavingKey(null);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    await fetch("/api/backstage/auth/logout", { method: "POST" });
    router.push("/backstage/login");
  }

  async function checkForUpdate() {
    setCheckingUpdate(true);
    try {
      const res = await fetch("/api/backstage/system?check=1");
      const data = await res.json() as SystemInfo;
      setSysInfo(data);
    } finally {
      setCheckingUpdate(false);
    }
  }

  const startDeployPolling = useCallback(() => {
    async function poll() {
      try {
        const res = await fetch("/api/backstage/deploy-log");
        const data = await res.json() as {
          exists: boolean;
          steps: { key: string; label: string; status: string }[];
          lines: string[];
          done: boolean;
          hasError: boolean;
        };
        if (data.steps?.length) setDeploySteps(data.steps);
        if (data.lines?.length) setDeployLines(data.lines);
        if (data.done) {
          setDeployDone(true);
          setDeployRunning(false);
          // Reload sysInfo to show new version
          fetch("/api/backstage/system").then(r => r.json()).then(setSysInfo).catch(() => {});
          return;
        }
        if (data.hasError) {
          setDeployError(true);
          setDeployRunning(false);
          return;
        }
      } catch { /* continua */ }
      deployPollRef.current = setTimeout(poll, 2000);
    }
    poll();
  }, []);

  async function triggerDeploy() {
    if (!confirm("Avviare il deploy? Il sistema eseguirà git pull → npm ci → build → pm2 reload. Potrebbe richiedere qualche minuto.")) return;
    setDeploying(true);
    setDeploySteps([]);
    setDeployLines([]);
    setDeployDone(false);
    setDeployError(false);
    setDeployRunning(true);
    if (deployPollRef.current) clearTimeout(deployPollRef.current);
    try {
      const res = await fetch("/api/backstage/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deploy" }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        startDeployPolling();
      } else {
        setDeployError(true);
        setDeployRunning(false);
      }
    } catch {
      setDeployError(true);
      setDeployRunning(false);
    } finally {
      setDeploying(false);
    }
  }

  // Demo handlers
  async function handleDemo(action: "seed" | "clean") {
    const msg = action === "seed"
      ? "Importare i dati demo? Verranno creati sale, menu, prenotazioni e utenti di esempio."
      : "Rimuovere tutti i dati demo? L'operazione è irreversibile.";
    if (!confirm(msg)) return;
    setDemoLoading(true);
    setDemoMsg("");
    try {
      const res = await fetch("/api/backstage/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setDemoMsg(data.message ?? "OK");
      setDemoSeeded(action === "seed");
      setDemoSeededAt(action === "seed" ? new Date().toISOString() : null);
    } catch (e) {
      setDemoMsg((e as Error).message);
    } finally {
      setDemoLoading(false);
    }
  }

  // WhatsApp handlers
  async function loadWaAccounts(tokenOverride?: string) {
    setWaAccountsLoading(true);
    setWaAccountsError("");
    try {
      const url = tokenOverride
        ? `/api/backstage/whatsapp/accounts?token=${encodeURIComponent(tokenOverride)}`
        : "/api/backstage/whatsapp/accounts";
      const res = await fetch(url);
      const data = await res.json() as { error?: string } | { instance_id: string; status: string; name?: string }[];
      if (!res.ok || "error" in data) throw new Error((data as { error?: string }).error ?? "Errore");
      setWaAccounts(data as { instance_id: string; status: string; name?: string }[]);
    } catch (e) {
      setWaAccountsError((e as Error).message);
    } finally {
      setWaAccountsLoading(false);
    }
  }

  async function toggleWaEnabled() {
    const next = !waEnabled;
    setWaEnabled(next);
    setWaSaving(true);
    setWaMsg("");
    try {
      const res = await fetch("/api/backstage/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setWaMsg(next ? "Modulo WhatsApp attivato" : "Modulo WhatsApp disattivato");
    } catch (e) {
      setWaEnabled(!next);
      setWaMsg((e as Error).message);
    } finally {
      setWaSaving(false);
    }
  }

  async function saveWaSettings() {
    setWaSaving(true);
    setWaMsg("");
    try {
      const body: Record<string, unknown> = {
        enabled: waEnabled,
        instanceId: waInstanceId,
        message: waMessage,
        bookingUrl: waBookingUrl,
        keywords: waKeywords,
      };
      if (waTokenInput.trim()) body.token = waTokenInput.trim();

      const res = await fetch("/api/backstage/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setWaMsg("Impostazioni salvate");
      setWaTokenInput("");
      setWaHasToken(true);
      if (body.token) await loadWaAccounts(body.token as string);
    } catch (e) {
      setWaMsg((e as Error).message);
    } finally {
      setWaSaving(false);
    }
  }

  async function syncWaAutoresponder() {
    setWaSyncLoading(true);
    setWaSyncMsg("");
    try {
      const res = await fetch("/api/backstage/whatsapp/autoresponder", { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore sincronizzazione");
      setWaSyncMsg("Autoresponder sincronizzato con successo");
      void loadWaLog();
    } catch (e) {
      setWaSyncMsg((e as Error).message);
      void loadWaLog();
    } finally {
      setWaSyncLoading(false);
    }
  }

  async function loadWaLog() {
    setWaLogLoading(true);
    try {
      const res = await fetch("/api/backstage/whatsapp/log");
      const data = await res.json() as { messages: WaLogEntry[]; lastSync: WaLastSync | null };
      if (res.ok) {
        setWaLog(data.messages ?? []);
        setWaLastSync(data.lastSync ?? null);
      }
    } catch { /* non-critical */ } finally {
      setWaLogLoading(false);
    }
  }

  // Asterisk handlers
  async function toggleAstEnabled() {
    const next = !astEnabled;
    setAstEnabled(next);
    setAstSaving(true);
    setAstMsg("");
    try {
      const res = await fetch("/api/backstage/asterisk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setAstMsg(next ? "Modulo Asterisk attivato" : "Modulo Asterisk disattivato");
    } catch (e) {
      setAstEnabled(!next);
      setAstMsg((e as Error).message);
    } finally {
      setAstSaving(false);
    }
  }

  async function saveAstSettings() {
    setAstSaving(true);
    setAstMsg("");
    try {
      const body: Record<string, unknown> = {
        enabled: astEnabled,
        amiHost: astAmiHost,
        amiPort: astAmiPort,
        amiUser: astAmiUser,
        trunkName: astTrunkName,
        trunkUsername: astTrunkUsername,
        trunkFromuser: astTrunkFromuser,
        trunkFromdomain: astTrunkFromdomain,
        trunkHost: astTrunkHost,
        trunkPort: astTrunkPort,
        trunkContext: astTrunkContext,
        trunkRegisterPhone: astTrunkRegisterPhone,
      };
      if (astAmiSecretInput.trim()) body.amiSecret = astAmiSecretInput.trim();
      if (astTrunkSecretInput.trim()) body.trunkSecret = astTrunkSecretInput.trim();
      const res = await fetch("/api/backstage/asterisk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setAstMsg("Impostazioni salvate");
      setAstAmiSecretInput("");
      setAstTrunkSecretInput("");
      if (astAmiSecretInput.trim()) setAstHasAmiSecret(true);
      if (astTrunkSecretInput.trim()) setAstHasTrunkSecret(true);
    } catch (e) {
      setAstMsg((e as Error).message);
    } finally {
      setAstSaving(false);
    }
  }

  async function loadAstStatus() {
    setAstStatusLoading(true);
    try {
      const res = await fetch("/api/backstage/asterisk/status");
      const data = await res.json();
      if (res.ok) setAstStatus(data);
    } catch { /* non-critical */ } finally {
      setAstStatusLoading(false);
    }
  }

  async function reloadSip() {
    setAstReloadLoading(true);
    setAstReloadMsg("");
    try {
      const res = await fetch("/api/backstage/asterisk/reload", { method: "POST" });
      const data = await res.json() as { ok?: boolean; output?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setAstReloadMsg(data.output ? `OK: ${data.output.slice(0, 120)}` : "Ricaricato con successo");
    } catch (e) {
      setAstReloadMsg((e as Error).message);
    } finally {
      setAstReloadLoading(false);
    }
  }

  async function setupAsterisk() {
    if (!confirm("Scrivere i file di configurazione in /etc/asterisk e ricaricare Asterisk?")) return;
    setAstSetupLoading(true);
    setAstSetupLines([]);
    try {
      const res = await fetch("/api/backstage/asterisk/setup", { method: "POST" });
      const data = await res.json() as { ok?: boolean; output?: string[]; error?: string };
      if (!res.ok && data.error) throw new Error(data.error);
      setAstSetupLines(data.output ?? []);
    } catch (e) {
      setAstSetupLines([(e as Error).message]);
    } finally {
      setAstSetupLoading(false);
      void loadAstStatus();
    }
  }

  async function runBuild() {
    if (!confirm("Avviare npm run build e riavviare il worker Asterisk?")) return;
    setAstBuildRunning(true);
    setAstBuildLines([]);
    try {
      const res = await fetch("/api/backstage/asterisk/build", { method: "POST" });
      if (!res.body) throw new Error("Nessun stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const dataLine = part.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;
          const payload = dataLine.slice(6);
          if (payload === "__DONE__") { setAstBuildRunning(false); void loadAstStatus(); return; }
          try { setAstBuildLines(prev => [...prev, JSON.parse(payload)]); } catch { /* ignore */ }
        }
      }
    } catch (e) {
      setAstBuildLines(prev => [...prev, (e as Error).message]);
    } finally {
      setAstBuildRunning(false);
    }
  }

  async function loadAsteriskLogs() {
    setAstLogsLoading(true);
    setAstLogsVisible(true);
    try {
      const res = await fetch("/api/backstage/asterisk/logs?lines=50");
      const data = await res.json() as { output?: string };
      setAstLogsOutput(data.output ?? "");
    } catch (e) {
      setAstLogsOutput((e as Error).message);
    } finally {
      setAstLogsLoading(false);
    }
  }

  const sipConfSnippet = `[${astTrunkName}]
type=peer
host=${astTrunkHost}
port=${astTrunkPort}
username=${astTrunkUsername}
fromuser=${astTrunkFromuser}
fromdomain=${astTrunkFromdomain}
secret=${astHasTrunkSecret ? "••••" : "INSERISCI_SECRET"}
context=${astTrunkContext}
insecure=port,invite
nat=yes
qualify=yes
dtmfmode=rfc2833
disallow=all
allow=ulaw`;

  const extConfSnippet = `[${astTrunkContext}]
exten => _X.,1,NoOp(Chiamata da \${CALLERID(num)})
 same => n,Wait(1)
 same => n,Hangup()`;

  const registerString = `register => ${astTrunkUsername}:${astHasTrunkSecret ? "••••" : "SECRET"}@${astTrunkHost}:${astTrunkPort}/${astTrunkRegisterPhone || astTrunkUsername}`;

  // TOTP handlers
  async function startTotpSetup() {
    setTotpError("");
    setTotpLoading(true);
    try {
      const res = await fetch("/api/backstage/auth/totp-setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTotpQr(data.otpauthUrl);
      setTotpStep("setup");
    } catch (e) {
      setTotpError((e as Error).message);
    } finally {
      setTotpLoading(false);
    }
  }

  async function verifyAndEnableTotp() {
    setTotpError("");
    setTotpLoading(true);
    try {
      const res = await fetch("/api/backstage/auth/totp-enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode.replace(/\s/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Codice non valido");
      setTotpEnabled(true);
      setTotpStep("idle");
      setTotpCode("");
      setTotpQr("");
    } catch (e) {
      setTotpError((e as Error).message);
    } finally {
      setTotpLoading(false);
    }
  }

  async function disableTotp() {
    setTotpError("");
    setTotpLoading(true);
    try {
      const res = await fetch("/api/backstage/auth/totp-disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: totpDisablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setTotpEnabled(false);
      setTotpStep("idle");
      setTotpDisablePassword("");
    } catch (e) {
      setTotpError((e as Error).message);
    } finally {
      setTotpLoading(false);
    }
  }

  // User management handlers
  async function createUser() {
    if (!createForm.name || !createForm.email || !createForm.password) {
      setUserMsg("Compila tutti i campi");
      return;
    }
    setUserLoading(true);
    setUserMsg("");
    try {
      const res = await fetch("/api/backstage/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json() as BsUser & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setUsers(prev => [...prev, data]);
      setCreatingUser(false);
      setCreateForm({ name: "", email: "", password: "", role: "STAFF" });
      setUserMsg("Utente creato");
    } catch (e) {
      setUserMsg((e as Error).message);
    } finally {
      setUserLoading(false);
    }
  }

  function startEditUser(user: BsUser) {
    setEditingUserId(user.id);
    setEditForm({ name: user.name, role: user.role, active: user.active, password: "" });
    setUserMsg("");
  }

  async function saveEditUser() {
    if (!editingUserId) return;
    setUserLoading(true);
    setUserMsg("");
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        role: editForm.role,
        active: editForm.active,
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();
      const res = await fetch(`/api/backstage/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as BsUser & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Errore");
      setUsers(prev => prev.map(u => u.id === editingUserId ? data : u));
      setEditingUserId(null);
      setUserMsg("Utente aggiornato");
    } catch (e) {
      setUserMsg((e as Error).message);
    } finally {
      setUserLoading(false);
    }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Eliminare l'utente "${name}"? L'operazione è irreversibile.`)) return;
    setUserLoading(true);
    setUserMsg("");
    try {
      const res = await fetch(`/api/backstage/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
      setUsers(prev => prev.filter(u => u.id !== id));
      if (editingUserId === id) setEditingUserId(null);
      setUserMsg("Utente eliminato");
    } catch (e) {
      setUserMsg((e as Error).message);
    } finally {
      setUserLoading(false);
    }
  }

  const ROLE_LABEL: Record<BsUser["role"], string> = { ADMIN: "Admin", STAFF: "Staff", KITCHEN: "Cucina" };
  const ROLE_COLOR: Record<BsUser["role"], string> = {
    ADMIN: "bg-indigo-500/20 text-indigo-300",
    STAFF: "bg-slate-700 text-slate-300",
    KITCHEN: "bg-amber-500/20 text-amber-300",
  };

  const enabledCount = MODULES.filter(m => modules[m.key] !== false).length;

  const hasUpdate =
    sysInfo?.latestVersion != null &&
    sysInfo.latestVersion !== sysInfo.version;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-wide">Pannello di controllo</span>
            {saEmail && <span className="text-xs text-slate-500 hidden sm:block">· {saEmail}</span>}
            {sysInfo && (
              <span className="text-xs text-slate-600 hidden sm:block">
                v{sysInfo.version}
              </span>
            )}
          </div>
          <button onClick={handleLogout} disabled={logoutLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            {logoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
            Esci
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Moduli */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Moduli attivi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {enabledCount} di {MODULES.length} moduli attivi · le modifiche hanno effetto immediato
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map(({ key, label, desc, icon: Icon }) => {
              const enabled = modules[key] !== false;
              const saving = savingKey === key;
              return (
                <button
                  key={key}
                  onClick={() => toggleModule(key as ModuleKey)}
                  disabled={saving}
                  className={`text-left rounded-xl border p-4 transition-all duration-200 flex items-start gap-4 group ${
                    enabled
                      ? "bg-slate-800/60 border-slate-700 hover:border-indigo-500/50"
                      : "bg-slate-900/40 border-slate-800 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    enabled ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-600"
                  }`}>
                    {saving
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${enabled ? "text-slate-100" : "text-slate-500"}`}>
                        {label}
                      </span>
                      {enabled
                        ? <ToggleRight className="h-5 w-5 text-indigo-400 shrink-0" />
                        : <ToggleLeft className="h-5 w-5 text-slate-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sistema & Aggiornamenti */}
        <section>
          <h2 className="text-lg font-bold mb-4">Sistema</h2>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-5">

            {/* Version info */}
            {sysInfo ? (
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Versione</span>
                  <code className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                    v{sysInfo.version}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                  <code className="text-xs font-mono text-slate-400">
                    {sysInfo.gitBranch}@{sysInfo.gitHash}
                  </code>
                </div>
                {sysInfo.latestVersion && (
                  <div className="flex items-center gap-2">
                    {hasUpdate ? (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    <span className={`text-xs ${hasUpdate ? "text-amber-400" : "text-emerald-400"}`}>
                      {hasUpdate
                        ? `Aggiornamento disponibile: v${sysInfo.latestVersion}`
                        : "Sistema aggiornato"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-8 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={checkForUpdate}
                disabled={checkingUpdate || deployRunning}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              >
                {checkingUpdate
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCw className="h-4 w-4" />}
                Controlla aggiornamenti
              </button>

              <button
                onClick={triggerDeploy}
                disabled={deploying || deployRunning}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-300 hover:bg-indigo-600/20 transition-colors disabled:opacity-50"
              >
                {(deploying || deployRunning)
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Terminal className="h-4 w-4" />}
                Aggiorna sistema
              </button>

              <a
                href="/demo-site"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-400 hover:bg-emerald-600/10 transition-colors"
              >
                <Globe className="h-4 w-4" />
                Sito demo con chatbot
              </a>
            </div>

            {/* Deploy progress */}
            {(deployRunning || deploySteps.length > 0) && (
              <div className="space-y-3 border-t border-slate-700/50 pt-4">
                {/* Steps */}
                <div className="flex flex-wrap gap-2">
                  {deploySteps.map((step) => (
                    <span
                      key={step.key}
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                        step.status === "done"    ? "bg-emerald-500/15 text-emerald-400" :
                        step.status === "running" ? "bg-indigo-500/20 text-indigo-300"  :
                        step.status === "error"   ? "bg-red-500/15 text-red-400"        :
                                                    "bg-slate-800 text-slate-600"
                      }`}
                    >
                      {step.status === "done"    && <CheckCircle2 className="h-3 w-3" />}
                      {step.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {step.status === "error"   && <AlertCircle className="h-3 w-3" />}
                      {step.status === "pending" && <span className="h-3 w-3 rounded-full border border-slate-600 inline-block" />}
                      {step.label}
                    </span>
                  ))}
                </div>

                {/* Log terminal */}
                <div
                  ref={logBoxRef}
                  className="h-52 overflow-y-auto bg-black/70 rounded-lg border border-slate-800 p-3 font-mono text-xs leading-relaxed space-y-px"
                >
                  {deployLines.map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.includes("ERROR")        ? "text-red-400" :
                        line.includes("==> [deploy]") ? "text-indigo-300" :
                        line.includes("warn")         ? "text-amber-400" :
                                                        "text-slate-500"
                      }
                    >
                      {line}
                    </div>
                  ))}
                  {deployRunning && (
                    <div className="text-slate-600 animate-pulse select-none">▋</div>
                  )}
                </div>

                {/* Result */}
                {deployDone && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Deploy completato! La versione è stata aggiornata.
                  </div>
                )}
                {deployError && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Deploy interrotto — controlla il log sopra.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Dati Demo */}
        <section>
          <h2 className="text-lg font-bold mb-4">Dati Demo</h2>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Ambiente dimostrativo</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {demoSeeded
                    ? `Dati demo presenti — importati il ${new Date(demoSeededAt!).toLocaleDateString("it-IT")}`
                    : "Importa dati realistici per dimostrare il sistema: sale, menu, prenotazioni e utenti."}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                demoSeeded ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"
              }`}>
                {demoSeeded ? "Attivi" : "Vuoto"}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              {!demoSeeded && (
                <button
                  onClick={() => handleDemo("seed")}
                  disabled={demoLoading}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-300 hover:bg-indigo-600/20 transition-colors disabled:opacity-50"
                >
                  {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Importa dati demo
                </button>
              )}
              {demoSeeded && (
                <button
                  onClick={() => handleDemo("clean")}
                  disabled={demoLoading}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-red-700 text-red-400 hover:bg-red-600/10 transition-colors disabled:opacity-50"
                >
                  {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Pulisci dati demo
                </button>
              )}
            </div>

            {demoMsg && (
              <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700 font-mono">
                {demoMsg}
              </p>
            )}
          </div>
        </section>

        {/* Gestione Utenti */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Gestione Utenti</h2>
            <button
              onClick={() => { setCreatingUser(v => !v); setEditingUserId(null); setUserMsg(""); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-300 hover:bg-indigo-600/20 transition-colors"
            >
              {creatingUser ? <X className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {creatingUser ? "Annulla" : "Nuovo utente"}
            </button>
          </div>

          <div className="space-y-3">

            {/* Create form */}
            {creatingUser && (
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Nuovo utente</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Nome</label>
                    <Input
                      placeholder="Mario Rossi"
                      value={createForm.name}
                      onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-slate-900 border-slate-700 text-slate-100 text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Email</label>
                    <Input
                      type="email"
                      placeholder="mario@esempio.it"
                      value={createForm.email}
                      onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      className="bg-slate-900 border-slate-700 text-slate-100 text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Password</label>
                    <Input
                      type="password"
                      placeholder="Min. 8 caratteri"
                      value={createForm.password}
                      onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-slate-900 border-slate-700 text-slate-100 text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Ruolo</label>
                    <select
                      value={createForm.role}
                      onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as BsUser["role"] }))}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 h-8 text-sm"
                    >
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                      <option value="KITCHEN">Cucina</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={createUser}
                  disabled={userLoading}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-opacity"
                  style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                >
                  {userLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Crea utente
                </button>
              </div>
            )}

            {/* User list */}
            {users.length === 0 && !creatingUser && (
              <p className="text-sm text-slate-500 py-4 text-center rounded-xl border border-slate-800">
                Nessun utente. Creane uno con il pulsante sopra.
              </p>
            )}

            {users.map(user => (
              <div key={user.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60">
                {/* User row */}
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-100">{user.name}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[user.role]}`}>
                          {ROLE_LABEL[user.role]}
                        </span>
                        {!user.active && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                            Disabilitato
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => editingUserId === user.id ? setEditingUserId(null) : startEditUser(user)}
                      className={`p-1.5 rounded-lg transition-colors ${editingUserId === user.id ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-slate-200 hover:bg-slate-800"}`}
                      title="Modifica"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.name)}
                      disabled={userLoading}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Elimina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {editingUserId === user.id && (
                  <div className="border-t border-slate-700/60 px-4 py-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Nome</label>
                        <Input
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="bg-slate-950 border-slate-700 text-slate-100 text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400">Ruolo</label>
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm(f => ({ ...f, role: e.target.value as BsUser["role"] }))}
                          className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 h-8 text-sm"
                        >
                          <option value="STAFF">Staff</option>
                          <option value="ADMIN">Admin</option>
                          <option value="KITCHEN">Cucina</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 flex items-center gap-1">
                          <KeyRound className="h-3 w-3" /> Nuova password (opzionale)
                        </label>
                        <Input
                          type="password"
                          placeholder="Lascia vuoto per non cambiare"
                          value={editForm.password}
                          onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                          className="bg-slate-950 border-slate-700 text-slate-100 text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1 flex flex-col justify-end">
                        <label className="text-xs text-slate-400">Stato</label>
                        <button
                          onClick={() => setEditForm(f => ({ ...f, active: !f.active }))}
                          className="flex items-center gap-2 text-sm"
                        >
                          {editForm.active
                            ? <ToggleRight className="h-5 w-5 text-indigo-400" />
                            : <ToggleLeft className="h-5 w-5 text-slate-600" />}
                          <span className={editForm.active ? "text-slate-200" : "text-slate-500"}>
                            {editForm.active ? "Attivo" : "Disabilitato"}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveEditUser}
                        disabled={userLoading}
                        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition-opacity"
                        style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                      >
                        {userLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Salva
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="text-sm px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {userMsg && (
              <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700 font-mono">
                {userMsg}
              </p>
            )}
          </div>
        </section>

        {/* WhatsApp / SendApp */}
        <section>
          <h2 className="text-lg font-bold mb-4">WhatsApp / SendApp</h2>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-5">

            {/* Module toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Modulo WhatsApp</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attiva per abilitare la verifica telefono e l&apos;autoresponder SendApp.
                </p>
              </div>
              <button
                onClick={toggleWaEnabled}
                disabled={waSaving}
                className="shrink-0 mt-0.5"
                aria-label={waEnabled ? "Disattiva modulo" : "Attiva modulo"}
              >
                {waSaving
                  ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  : waEnabled
                  ? <ToggleRight className="h-6 w-6 text-indigo-400" />
                  : <ToggleLeft className="h-6 w-6 text-slate-600" />}
              </button>
            </div>

            {/* Token input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Token API SendApp
              </label>
              {waHasToken && !waTokenInput && (
                <p className="text-xs text-slate-500">Token configurato. Inserisci un nuovo valore per sostituirlo.</p>
              )}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={waHasToken ? "Nuovo token (lascia vuoto per non cambiarlo)" : "Incolla il token da SendApp"}
                  value={waTokenInput}
                  onChange={e => setWaTokenInput(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono"
                />
                {waTokenInput.trim() && (
                  <button
                    onClick={() => loadWaAccounts(waTokenInput.trim())}
                    disabled={waAccountsLoading}
                    className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors disabled:opacity-50"
                  >
                    {waAccountsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Carica account
                  </button>
                )}
              </div>
            </div>

            {/* Account selector */}
            {(waAccounts.length > 0 || waHasToken) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Account WhatsApp
                  </label>
                  {waHasToken && waAccounts.length === 0 && (
                    <button
                      onClick={() => loadWaAccounts()}
                      disabled={waAccountsLoading}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                    >
                      {waAccountsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Carica lista
                    </button>
                  )}
                </div>
                {waAccounts.length > 0 ? (
                  <select
                    value={waInstanceId}
                    onChange={e => setWaInstanceId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">— Seleziona account —</option>
                    {waAccounts.map(a => (
                      <option key={a.instance_id} value={a.instance_id}>
                        {a.name ?? a.instance_id} · {a.status}
                      </option>
                    ))}
                  </select>
                ) : waAccountsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Caricamento account…
                  </div>
                ) : waInstanceId ? (
                  <p className="text-xs text-slate-400 font-mono">Instance ID: {waInstanceId}</p>
                ) : null}
                {waAccountsError && (
                  <p className="text-xs text-red-400">{waAccountsError}</p>
                )}
              </div>
            )}

            {/* Autoresponder message */}
            <div className="space-y-2 border-t border-slate-700/50 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Messaggio autoresponder
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Usa <code className="bg-slate-800 px-1 rounded font-mono">{"{link}"}</code> per il link di prenotazione. Il logo del ristorante viene allegato automaticamente.
              </p>
              <textarea
                value={waMessage}
                onChange={e => setWaMessage(e.target.value)}
                rows={5}
                placeholder={"🍽️ Prenota il tuo tavolo!\n\n👇 {link}\n\nA presto! 😊"}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Parole chiave autoresponder
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                Quando un cliente invia un messaggio contenente una di queste parole, riceve automaticamente il link di prenotazione. Separa con virgola.
              </p>
              <Input
                type="text"
                placeholder="prenota,prenotazione,tavolo,menu,info,ciao,buongiorno,salve,buonasera"
                value={waKeywords}
                onChange={e => setWaKeywords(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            {/* Booking URL */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                URL pagina di prenotazione
              </label>
              <Input
                type="text"
                placeholder="https://tuodominio.it/prenota"
                value={waBookingUrl}
                onChange={e => setWaBookingUrl(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono"
              />
            </div>

            {/* Preview */}
            {waMessage && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Anteprima</p>
                <div className="rounded-xl p-4 text-sm leading-relaxed max-w-xs shadow" style={{ background: "#dcf8c6", color: "#111" }}>
                  <p className="whitespace-pre-wrap break-words">
                    {waMessage.replace("{link}", waBookingUrl || "https://…/prenota")}
                  </p>
                </div>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={saveWaSettings}
              disabled={waSaving}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-opacity"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
            >
              {waSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Salva impostazioni WhatsApp
            </button>

            {waMsg && (
              <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700 font-mono">
                {waMsg}
              </p>
            )}

            {/* Sync autoresponder */}
            <div className="space-y-2 border-t border-slate-700/50 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Autoresponder SendApp
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Invia il messaggio, le parole chiave e l&apos;URL qui configurati al chatbot di SendApp. Da eseguire dopo ogni modifica.
              </p>
              <button
                onClick={syncWaAutoresponder}
                disabled={waSyncLoading || !waHasToken}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-400 hover:bg-emerald-600/10 transition-colors disabled:opacity-50"
              >
                {waSyncLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Sincronizza autoresponder
              </button>
              {waSyncMsg && (
                <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700 font-mono">
                  {waSyncMsg}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Log WhatsApp */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Log WhatsApp</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sincronizzazioni autoresponder e messaggi inviati ai clienti</p>
            </div>
            <button
              onClick={loadWaLog}
              disabled={waLogLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors disabled:opacity-50"
            >
              {waLogLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Aggiorna
            </button>
          </div>

          <div className="space-y-3">

            {/* Ultima sync */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5" /> Ultima sincronizzazione autoresponder
              </p>
              {waLastSync ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      waLastSync.ok
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>
                      {waLastSync.ok
                        ? <CheckCircle2 className="h-3 w-3" />
                        : <AlertCircle className="h-3 w-3" />}
                      {waLastSync.ok ? "Successo" : "Errore"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(waLastSync.at).toLocaleString("it-IT")}
                    </span>
                    {waLastSync.ruleId && (
                      <span className="text-xs text-slate-500 font-mono">
                        Regola ID: <span className="text-slate-300">{waLastSync.ruleId}</span>
                      </span>
                    )}
                  </div>
                  {waLastSync.raw && (
                    <div>
                      <button
                        onClick={() => setWaRawExpanded(v => !v)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                      >
                        {waRawExpanded ? "▲ Nascondi" : "▼ Mostra risposta SendApp"}
                      </button>
                      {waRawExpanded && (
                        <pre className="mt-2 text-xs font-mono bg-black/60 rounded-lg border border-slate-800 p-3 overflow-x-auto text-slate-400 whitespace-pre-wrap break-all">
                          {(() => {
                            try { return JSON.stringify(JSON.parse(waLastSync.raw), null, 2); }
                            catch { return waLastSync.raw; }
                          })()}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">Nessuna sincronizzazione ancora eseguita.</p>
              )}
            </div>

            {/* Messaggi inviati */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                  <PhoneOutgoing className="h-3.5 w-3.5" /> Messaggi inviati ai clienti
                </p>
                <span className="text-xs text-slate-500">{waLog.length} record</span>
              </div>

              {waLog.length === 0 ? (
                <p className="text-xs text-slate-600 italic px-4 py-5 text-center">
                  Nessun messaggio registrato. I messaggi vengono tracciati dall&apos;attivazione del modulo.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/60 text-slate-500">
                        <th className="px-4 py-2 text-left font-medium">Data e ora</th>
                        <th className="px-4 py-2 text-left font-medium">Tipo</th>
                        <th className="px-4 py-2 text-left font-medium">Numero</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {waLog.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2 text-slate-400 tabular-nums whitespace-nowrap">
                            {new Date(entry.createdAt).toLocaleString("it-IT")}
                          </td>
                          <td className="px-4 py-2">
                            {entry.type === "verification" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-500/20 text-indigo-300">
                                <KeyRound className="h-2.5 w-2.5" /> Codice OTP
                              </span>
                            ) : entry.type === "cancellation" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400">
                                <ShieldAlert className="h-2.5 w-2.5" /> Disdetta
                              </span>
                            ) : (
                              <span className="text-slate-500">{entry.type}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-slate-400 font-mono">
                            {entry.phone.replace(/(\d{2})(\d+)(\d{3})$/, "$1•••$3")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Asterisk / SIP */}
        <section>
          <h2 className="text-lg font-bold mb-4">Asterisk / Messagenet SIP</h2>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-5">

            {/* Toggle modulo */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Modulo Asterisk</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attiva per abilitare il worker AMI che intercetta le chiamate entranti e invia messaggi WhatsApp.
                </p>
              </div>
              <button
                onClick={toggleAstEnabled}
                disabled={astSaving}
                className="shrink-0 mt-0.5"
                aria-label={astEnabled ? "Disattiva modulo" : "Attiva modulo"}
              >
                {astSaving
                  ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                  : astEnabled
                  ? <ToggleRight className="h-6 w-6 text-indigo-400" />
                  : <ToggleLeft className="h-6 w-6 text-slate-600" />}
              </button>
            </div>

            {/* Stato registrazione */}
            <div className="space-y-2 border-t border-slate-700/50 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Stato trunk SIP</p>
                <button
                  onClick={loadAstStatus}
                  disabled={astStatusLoading}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  {astStatusLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Aggiorna
                </button>
              </div>
              {astStatus ? (
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    astStatus.registered ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"
                  }`}>
                    <Phone className="h-3 w-3" />
                    {astStatus.registered ? "Registrato" : "Non registrato"}
                  </span>
                  {astStatus.peerState && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                      {astStatus.peerState}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    astStatus.workerActive ? "bg-indigo-500/15 text-indigo-300" : "bg-red-500/10 text-red-400"
                  }`}>
                    <PhoneMissed className="h-3 w-3" />
                    Worker {astStatus.workerActive ? "attivo" : "inattivo"}
                  </span>
                  {astStatus.lastCheck && (
                    <span className="text-xs text-slate-600">
                      Ultimo check: {new Date(astStatus.lastCheck).toLocaleString("it-IT")}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic">Stato non disponibile — avvia il worker.</p>
              )}
            </div>

            {/* Parametri AMI */}
            <div className="space-y-3 border-t border-slate-700/50 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Parametri AMI (Asterisk Manager Interface)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-slate-400">Host AMI</label>
                  <Input value={astAmiHost} onChange={e => setAstAmiHost(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8"
                    placeholder="127.0.0.1" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Porta</label>
                  <Input value={astAmiPort} onChange={e => setAstAmiPort(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8"
                    placeholder="5038" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Utente AMI</label>
                  <Input value={astAmiUser} onChange={e => setAstAmiUser(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8"
                    placeholder="admin" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Password AMI</label>
                {astHasAmiSecret && !astAmiSecretInput && (
                  <p className="text-xs text-slate-500">Password configurata. Inserisci un nuovo valore per sostituirla.</p>
                )}
                <Input
                  type="password"
                  value={astAmiSecretInput}
                  onChange={e => setAstAmiSecretInput(e.target.value)}
                  placeholder={astHasAmiSecret ? "Nuova password (lascia vuoto per non cambiare)" : "Password manager.conf"}
                  className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8"
                />
              </div>
            </div>

            {/* Parametri trunk SIP */}
            <div className="space-y-3 border-t border-slate-700/50 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Trunk SIP Messagenet</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Nome peer</label>
                  <Input value={astTrunkName} onChange={e => setAstTrunkName(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Username</label>
                  <Input value={astTrunkUsername} onChange={e => setAstTrunkUsername(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Fromuser</label>
                  <Input value={astTrunkFromuser} onChange={e => setAstTrunkFromuser(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-slate-400">Fromdomain / Host</label>
                  <Input value={astTrunkFromdomain} onChange={e => setAstTrunkFromdomain(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Port SIP</label>
                  <Input value={astTrunkPort} onChange={e => setAstTrunkPort(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8" />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-2">
                  <label className="text-xs text-slate-400">Context dialplan</label>
                  <Input value={astTrunkContext} onChange={e => setAstTrunkContext(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8" />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-3">
                  <label className="text-xs text-slate-400">Numero telefono register (dopo /)</label>
                  <Input value={astTrunkRegisterPhone} onChange={e => setAstTrunkRegisterPhone(e.target.value)}
                    placeholder={astTrunkUsername || "es. 5406423992"}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8" />
                  <p className="text-xs text-slate-500">Usato alla fine della register string: <span className="font-mono">…:{astTrunkPort}/{astTrunkRegisterPhone || astTrunkUsername}</span></p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Secret trunk SIP</label>
                {astHasTrunkSecret && !astTrunkSecretInput && (
                  <p className="text-xs text-slate-500">Secret configurato. Inserisci un nuovo valore per sostituirlo.</p>
                )}
                <Input
                  type="password"
                  value={astTrunkSecretInput}
                  onChange={e => setAstTrunkSecretInput(e.target.value)}
                  placeholder={astHasTrunkSecret ? "Nuovo secret (lascia vuoto per non cambiare)" : "ikxYoLNg"}
                  className="bg-slate-900 border-slate-700 text-slate-100 text-sm font-mono h-8"
                />
              </div>
            </div>

            {/* Snippet sip.conf */}
            <div className="space-y-2 border-t border-slate-700/50 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Snippet sip.conf</p>
              <p className="text-xs text-slate-500">Incolla in <code className="bg-slate-800 px-1 rounded">/etc/asterisk/sip.conf</code></p>
              <pre className="text-xs font-mono bg-black/60 rounded-lg border border-slate-800 p-3 overflow-x-auto text-slate-300 whitespace-pre leading-relaxed">
                {sipConfSnippet}
              </pre>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3">Register string (sezione [general])</p>
              <pre className="text-xs font-mono bg-black/60 rounded-lg border border-slate-800 p-3 overflow-x-auto text-slate-300 whitespace-pre">
                {registerString}
              </pre>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3">Snippet extensions.conf</p>
              <pre className="text-xs font-mono bg-black/60 rounded-lg border border-slate-800 p-3 overflow-x-auto text-slate-300 whitespace-pre">
                {extConfSnippet}
              </pre>
            </div>

            {/* Save + setup + reload */}
            <div className="flex flex-wrap gap-3 border-t border-slate-700/50 pt-4">
              <button
                onClick={saveAstSettings}
                disabled={astSaving}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-opacity"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
              >
                {astSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Salva configurazione
              </button>
              <button
                onClick={setupAsterisk}
                disabled={astSetupLoading || !astHasAmiSecret || !astHasTrunkSecret}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-400 hover:bg-emerald-600/10 transition-colors disabled:opacity-50"
                title={!astHasAmiSecret || !astHasTrunkSecret ? "Salva prima le credenziali AMI e il secret trunk" : ""}
              >
                {astSetupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Configura Asterisk sul server
              </button>
              <button
                onClick={reloadSip}
                disabled={astReloadLoading || !astHasAmiSecret}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-amber-700 text-amber-400 hover:bg-amber-600/10 transition-colors disabled:opacity-50"
              >
                {astReloadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Ricarica sip.conf
              </button>
            </div>

            {/* Setup output log */}
            {astSetupLines.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Output setup</p>
                <div className="bg-black/60 rounded-lg border border-slate-800 p-3 font-mono text-xs space-y-px max-h-48 overflow-y-auto">
                  {astSetupLines.map((line, i) => (
                    <div key={i} className={
                      line.includes("ERRORE") || line.includes("ATTENZIONE") ? "text-red-400" :
                      line.startsWith("---") ? "text-indigo-300" :
                      line.includes("aggiunto") || line.includes("completato") ? "text-emerald-400" :
                      "text-slate-400"
                    }>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {(astMsg || astReloadMsg) && (
              <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700 font-mono">
                {astMsg || astReloadMsg}
              </p>
            )}

            {/* Build & logs */}
            <div className="flex flex-wrap gap-3 border-t border-slate-700/50 pt-4">
              <button
                onClick={runBuild}
                disabled={astBuildRunning}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-indigo-700 text-indigo-400 hover:bg-indigo-600/10 transition-colors disabled:opacity-50"
              >
                {astBuildRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                {astBuildRunning ? "Build in corso..." : "Build & riavvia worker"}
              </button>
              <button
                onClick={loadAsteriskLogs}
                disabled={astLogsLoading}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700/30 transition-colors disabled:opacity-50"
              >
                {astLogsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />}
                Log worker
              </button>
            </div>

            {/* Build log */}
            {astBuildLines.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Output build {astBuildRunning && <span className="text-indigo-400 animate-pulse">● in corso</span>}
                </p>
                <div className="bg-black/60 rounded-lg border border-slate-800 p-3 font-mono text-xs space-y-px max-h-64 overflow-y-auto">
                  {astBuildLines.map((line, i) => (
                    <div key={i} className={
                      line.includes("error") || line.includes("Error") || line.includes("failed") ? "text-red-400" :
                      line.startsWith("---") ? "text-indigo-300" :
                      line.includes("✓") || line.includes("completato") || line.includes("riavviato") ? "text-emerald-400" :
                      "text-slate-400"
                    }>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {/* PM2 logs */}
            {astLogsVisible && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Log worker (ultime 50 righe)</p>
                  <button onClick={() => setAstLogsVisible(false)} className="text-slate-600 hover:text-slate-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="bg-black/60 rounded-lg border border-slate-800 p-3 font-mono text-xs text-slate-400 max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
                  {astLogsOutput || "Nessun log disponibile"}
                </pre>
              </div>
            )}

          </div>
        </section>

        {/* Sicurezza 2FA */}
        <section>
          <h2 className="text-lg font-bold mb-4">Sicurezza</h2>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Autenticazione a due fattori</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {totpEnabled
                    ? "Attiva. Al prossimo accesso sarà richiesto il codice."
                    : "Non attiva. Si consiglia di abilitarla."}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                totpEnabled ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"
              }`}>
                {totpEnabled ? "Attiva" : "Disattiva"}
              </span>
            </div>

            {totpStep === "idle" && !totpEnabled && (
              <button onClick={startTotpSetup} disabled={totpLoading}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Attiva 2FA
              </button>
            )}

            {totpStep === "idle" && totpEnabled && (
              <button onClick={() => setTotpStep("disabling")}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                <ShieldOff className="h-4 w-4" /> Disattiva 2FA
              </button>
            )}

            {totpStep === "setup" && (
              <div className="space-y-4 rounded-lg bg-slate-800/60 p-4 border border-slate-700">
                <p className="text-sm font-medium">1. Scansiona con l&apos;app autenticatore</p>
                {totpQr && (
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-lg">
                      <QRCodeSVG value={totpQr} size={150} />
                    </div>
                  </div>
                )}
                <p className="text-sm font-medium">2. Inserisci il codice generato</p>
                <div className="flex gap-2">
                  <Input type="text" inputMode="numeric" placeholder="000 000" maxLength={7}
                    value={totpCode} onChange={e => setTotpCode(e.target.value)}
                    className="w-32 text-center tracking-widest bg-slate-900 border-slate-700 text-slate-100" />
                  <button onClick={verifyAndEnableTotp}
                    disabled={totpLoading || totpCode.replace(/\s/g, "").length < 6}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                    style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                    {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma"}
                  </button>
                  <button onClick={() => { setTotpStep("idle"); setTotpCode(""); setTotpQr(""); }}
                    className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {totpStep === "disabling" && (
              <div className="space-y-3 rounded-lg bg-slate-800/60 p-4 border border-slate-700">
                <p className="text-sm text-slate-300">Inserisci la password per disattivare il 2FA:</p>
                <div className="flex gap-2">
                  <Input type="password" placeholder="Password" value={totpDisablePassword}
                    onChange={e => setTotpDisablePassword(e.target.value)}
                    className="max-w-48 bg-slate-900 border-slate-700 text-slate-100" />
                  <button onClick={disableTotp} disabled={totpLoading || !totpDisablePassword}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors">
                    {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disattiva"}
                  </button>
                  <button onClick={() => { setTotpStep("idle"); setTotpDisablePassword(""); }}
                    className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {totpError && (
              <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{totpError}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
