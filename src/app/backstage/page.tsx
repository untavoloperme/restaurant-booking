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

interface SystemInfo {
  version: string;
  gitHash: string;
  gitBranch: string;
  latestVersion: string | null;
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
    ]).then(([mods, me, sys, demo]) => {
      setModules(mods);
      setSaEmail(me.email ?? "");
      setTotpEnabled(me.totpEnabled ?? false);
      setSysInfo(sys);
      setDemoSeeded(demo.seeded ?? false);
      setDemoSeededAt(demo.seededAt ?? null);
    }).catch(() => router.push("/backstage/login"));
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
