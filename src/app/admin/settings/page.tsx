"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Settings,
  Loader2,
  ImageOff,
  DoorOpen,
  ChefHat,
  Upload,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Store,
  Timer,
  MessageSquare,
} from "lucide-react";

interface SettingsData {
  "orders.show_status_customer": string;
  "orders.show_status_kitchen": string;
  "coperto": string;
  "ordering.enabled": string;
  "menu.show_images": string;
  "restaurant.name": string;
  "restaurant.phone": string;
  "restaurant.logo": string;
  "slot.driftThreshold": string;
  "slot.driftMinutes": string;
  "whatsapp.enabled": string;
  "whatsapp.service.enabled": string;
  "whatsapp.autoresponder.keywords": string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [copertoInput, setCopertoInput] = useState("");
  const [restaurantNameInput, setRestaurantNameInput] = useState("");
  const [restaurantPhoneInput, setRestaurantPhoneInput] = useState("");
  const [driftThreshold, setDriftThreshold] = useState("3");
  const [driftMinutes, setDriftMinutes] = useState("15");
  const copertoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp state
  const [waKeywordsInput, setWaKeywordsInput] = useState("");
  const [waSaving, setWaSaving] = useState(false);
  const waSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TOTP state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpStep, setTotpStep] = useState<"idle" | "setup" | "verify" | "disabling">("idle");
  const [totpQr, setTotpQr] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpDisablePassword, setTotpDisablePassword] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: SettingsData) => {
        setSettings(data);
        setCopertoInput(data.coperto ?? "0");
        setRestaurantNameInput(data["restaurant.name"] ?? "");
        setRestaurantPhoneInput(data["restaurant.phone"] ?? "");
        setDriftThreshold(data["slot.driftThreshold"] ?? "3");
        setDriftMinutes(data["slot.driftMinutes"] ?? "15");
        setWaKeywordsInput(data["whatsapp.autoresponder.keywords"] || "prenota,prenotazione,tavolo,menu,info,ciao,buongiorno,salve,buonasera");
      });

    fetch("/api/auth/totp/status")
      .then((r) => r.json())
      .then((d: { enabled: boolean }) => setTotpEnabled(d.enabled))
      .catch(() => null);
  }, []);

  async function toggle(key: "orders.show_status_customer" | "orders.show_status_kitchen" | "ordering.enabled" | "menu.show_images") {
    if (!settings) return;
    const newValue = settings[key] === "true" ? "false" : "true";
    setSettings({ ...settings, [key]: newValue });
    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Impostazione salvata" });
    } catch {
      setSettings({ ...settings, [key]: settings[key] });
      toast({ title: "Errore salvataggio", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function saveCoperto(value: string) {
    const parsed = parseFloat(value);
    const normalized = isNaN(parsed) || parsed < 0 ? "0" : parsed.toFixed(2);
    setSaving("coperto");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coperto: normalized }),
      });
      if (!res.ok) throw new Error();
      setCopertoInput(normalized);
      setSettings((s) => s ? { ...s, coperto: normalized } : s);
      toast({ title: "Coperto salvato" });
    } catch {
      toast({ title: "Errore salvataggio", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function saveDrift() {
    const t = Math.max(1, parseInt(driftThreshold, 10) || 3);
    const m = Math.max(1, parseInt(driftMinutes, 10) || 15);
    setDriftThreshold(String(t));
    setDriftMinutes(String(m));
    setSaving("slot.drift");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "slot.driftThreshold": String(t), "slot.driftMinutes": String(m) }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Impostazioni slittamento salvate" });
    } catch {
      toast({ title: "Errore salvataggio", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  function onCopertoChange(value: string) {
    setCopertoInput(value);
    if (copertoSaveTimer.current) clearTimeout(copertoSaveTimer.current);
    copertoSaveTimer.current = setTimeout(() => saveCoperto(value), 800);
  }

  async function saveRestaurantName(value: string) {
    setSaving("restaurant.name");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "restaurant.name": value }),
      });
      if (!res.ok) throw new Error();
      setSettings((s) => s ? { ...s, "restaurant.name": value } : s);
      toast({ title: "Nome salvato" });
    } catch {
      toast({ title: "Errore salvataggio", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  function onRestaurantNameChange(value: string) {
    setRestaurantNameInput(value);
    if (nameSaveTimer.current) clearTimeout(nameSaveTimer.current);
    nameSaveTimer.current = setTimeout(() => saveRestaurantName(value), 800);
  }

  async function saveRestaurantPhone(value: string) {
    setSaving("restaurant.phone");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "restaurant.phone": value }),
      });
      if (!res.ok) throw new Error();
      setSettings((s) => s ? { ...s, "restaurant.phone": value } : s);
      toast({ title: "Telefono salvato" });
    } catch {
      toast({ title: "Errore salvataggio", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function toggleWaService() {
    if (!settings) return;
    const newValue = settings["whatsapp.service.enabled"] === "true" ? "false" : "true";
    setSettings({ ...settings, "whatsapp.service.enabled": newValue });
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "whatsapp.service.enabled": newValue }),
      });
      toast({ title: newValue === "true" ? "Servizio WhatsApp attivato" : "Servizio WhatsApp disattivato" });
    } catch {
      setSettings((s) => s ? { ...s, "whatsapp.service.enabled": settings["whatsapp.service.enabled"] } : s);
      toast({ title: "Errore salvataggio", variant: "destructive" });
    }
  }

  function onWaKeywordsChange(value: string) {
    setWaKeywordsInput(value);
    if (waSaveTimer.current) clearTimeout(waSaveTimer.current);
    waSaveTimer.current = setTimeout(() => saveWaSettings(value), 800);
  }

  async function saveWaSettings(keywords: string) {
    setWaSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "whatsapp.autoresponder.keywords": keywords }),
      });
      setSettings((s) => s ? { ...s, "whatsapp.autoresponder.keywords": keywords } : s);
    } catch {
      toast({ title: "Errore salvataggio", variant: "destructive" });
    } finally {
      setWaSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    setSaving("restaurant.logo");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore upload");
      setSettings((s) => s ? { ...s, "restaurant.logo": data.url } : s);
      toast({ title: "Logo caricato" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function deleteLogo() {
    setSaving("restaurant.logo");
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSettings((s) => s ? { ...s, "restaurant.logo": "" } : s);
      toast({ title: "Logo rimosso" });
    } catch {
      toast({ title: "Errore rimozione logo", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  async function closeTables() {
    if (!confirm("Liberare tutti i tavoli? Tutte le prenotazioni attive verranno segnate come uscite.")) return;
    setActing("close-tables");
    try {
      const res = await fetch("/api/admin/close-tables", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast({ title: `${data.updated} tavol${data.updated === 1 ? "o liberato" : "i liberati"}` });
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    } finally {
      setActing(null);
    }
  }

  async function clearKitchen() {
    if (!confirm("Svuotare tutti gli ordini in cucina? L'operazione non è reversibile.")) return;
    setActing("clear-kitchen");
    try {
      const res = await fetch("/api/admin/clear-kitchen", { method: "POST" });
      if (!res.ok) throw new Error();
      toast({ title: "Ordini cucina svuotati" });
    } catch {
      toast({ title: "Errore", variant: "destructive" });
    } finally {
      setActing(null);
    }
  }

  // 2FA handlers
  async function startTotpSetup() {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/totp/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTotpQr(data.otpauthUrl);
      setTotpStep("setup");
    } catch {
      toast({ title: "Errore avvio configurazione 2FA", variant: "destructive" });
    } finally {
      setTotpLoading(false);
    }
  }

  async function verifyAndEnableTotp() {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/totp/enable", {
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
      toast({ title: "Autenticazione a due fattori attivata" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setTotpLoading(false);
    }
  }

  async function disableTotp() {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: totpDisablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore disattivazione");
      setTotpEnabled(false);
      setTotpStep("idle");
      setTotpDisablePassword("");
      toast({ title: "Autenticazione a due fattori disattivata" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setTotpLoading(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const logoUrl = settings["restaurant.logo"];

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Impostazioni</h1>
      </div>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" /> Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Nome ristorante */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="restaurant-name" className="text-sm font-medium">
                Nome del ristorante
              </Label>
              <p className="text-xs text-muted-foreground">
                Mostrato nella pagina di login al posto di &quot;Gestionale&quot;.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving === "restaurant.name" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Input
                id="restaurant-name"
                type="text"
                placeholder="Es. Trattoria da Mario"
                value={restaurantNameInput}
                onChange={(e) => onRestaurantNameChange(e.target.value)}
                onBlur={() => saveRestaurantName(restaurantNameInput)}
                className="w-48 h-8 text-sm"
                disabled={saving !== null}
              />
            </div>
          </div>

          {/* Telefono ristorante */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="restaurant-phone" className="text-sm font-medium">
                Telefono del ristorante
              </Label>
              <p className="text-xs text-muted-foreground">
                Mostrato nelle pagine di prenotazione sospesa.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving === "restaurant.phone" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Input
                id="restaurant-phone"
                type="tel"
                placeholder="Es. 0522 123456"
                value={restaurantPhoneInput}
                onChange={(e) => setRestaurantPhoneInput(e.target.value)}
                onBlur={() => saveRestaurantPhone(restaurantPhoneInput)}
                className="w-48 h-8 text-sm"
                disabled={saving !== null}
              />
            </div>
          </div>

          {/* Logo */}
          <div className="border-t pt-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Logo</Label>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP o SVG — max 2MB. Mostrato nella pagina di login.
              </p>
              {logoUrl && (
                <div className="relative mt-2 h-14 w-32 rounded border overflow-hidden bg-muted">
                  <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {saving === "restaurant.logo" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => logoInputRef.current?.click()}
                disabled={saving !== null}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                {logoUrl ? "Cambia logo" : "Carica logo"}
              </Button>
              {logoUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={deleteLogo}
                  disabled={saving !== null}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Rimuovi
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prezzi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prezzi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="coperto" className="text-sm font-medium">
                Coperto per persona
              </Label>
              <p className="text-xs text-muted-foreground">
                Importo aggiunto per ogni persona al tavolo. Metti 0 per non addebitarlo.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving === "coperto" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">€</span>
                <Input
                  id="coperto"
                  type="number"
                  min="0"
                  step="0.50"
                  value={copertoInput}
                  onChange={(e) => onCopertoChange(e.target.value)}
                  onBlur={() => saveCoperto(copertoInput)}
                  className="w-24 h-8 text-sm"
                  disabled={saving !== null}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => saveCoperto(copertoInput)}
                disabled={saving !== null}
              >
                Salva
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slittamento slot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" /> Slittamento slot prenotazioni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="drift-threshold" className="text-sm font-medium">
                Prenotazioni per attivare lo slittamento
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando questo numero di prenotazioni condivide lo stesso orario, il successivo viene spostato in avanti.
              </p>
            </div>
            <Input
              id="drift-threshold"
              type="number"
              min="1"
              step="1"
              value={driftThreshold}
              onChange={(e) => setDriftThreshold(e.target.value)}
              className="w-20 h-8 text-sm shrink-0"
              disabled={saving !== null}
            />
          </div>
          <div className="border-t pt-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="drift-minutes" className="text-sm font-medium">
                Minuti di spostamento
              </Label>
              <p className="text-xs text-muted-foreground">
                Di quanti minuti viene spostato lo slot quando la soglia è raggiunta.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                id="drift-minutes"
                type="number"
                min="1"
                step="5"
                value={driftMinutes}
                onChange={(e) => setDriftMinutes(e.target.value)}
                className="w-20 h-8 text-sm"
                disabled={saving !== null}
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end">
            <Button
              size="sm"
              onClick={saveDrift}
              disabled={saving !== null}
            >
              {saving === "slot.drift" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Salva
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visibilità ordini</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="ordering-enabled" className="text-sm font-medium">
                Ordinazione da QR code
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando disabilitato, il menu è visibile con prezzi ma il cliente non può inviare ordini.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving === "ordering.enabled" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                id="ordering-enabled"
                checked={settings["ordering.enabled"] === "true"}
                onCheckedChange={() => toggle("ordering.enabled")}
                disabled={saving !== null}
              />
            </div>
          </div>

          <div className="border-t pt-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="customer-status" className="text-sm font-medium">
                Stato avanzamento per il cliente
              </Label>
              <p className="text-xs text-muted-foreground">
                Il cliente può vedere la barra di avanzamento del proprio ordine sulla pagina di tracciamento.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving === "orders.show_status_customer" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                id="customer-status"
                checked={settings["orders.show_status_customer"] === "true"}
                onCheckedChange={() => toggle("orders.show_status_customer")}
                disabled={saving !== null}
              />
            </div>
          </div>

          <div className="border-t pt-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="kitchen-status" className="text-sm font-medium">
                Avanzamento ordini in cucina
              </Label>
              <p className="text-xs text-muted-foreground">
                I pulsanti di avanzamento stato sono visibili nella schermata cucina.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving === "orders.show_status_kitchen" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                id="kitchen-status"
                checked={settings["orders.show_status_kitchen"] === "true"}
                onCheckedChange={() => toggle("orders.show_status_kitchen")}
                disabled={saving !== null}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageOff className="h-4 w-4" /> Menu online
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="menu-show-images" className="text-sm font-medium">
                Mostra immagini dei piatti
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando disabilitato, le foto non vengono mostrate nel menu QR code.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving === "menu.show_images" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                id="menu-show-images"
                checked={settings["menu.show_images"] === "true"}
                onCheckedChange={() => toggle("menu.show_images")}
                disabled={saving !== null}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sicurezza / 2FA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Sicurezza — Autenticazione a due fattori
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                2FA per il tuo account ({session?.user?.email})
              </p>
              <p className="text-xs text-muted-foreground">
                {totpEnabled
                  ? "Attiva. Al prossimo accesso ti verrà chiesto il codice dall'app autenticatore."
                  : "Non attiva. Proteggi l'accesso con Google Authenticator, Authy o Microsoft Authenticator."}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                totpEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {totpEnabled ? "Attiva" : "Non attiva"}
            </span>
          </div>

          {/* Stato: idle */}
          {totpStep === "idle" && !totpEnabled && (
            <Button
              size="sm"
              onClick={startTotpSetup}
              disabled={totpLoading}
            >
              {totpLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              )}
              Attiva 2FA
            </Button>
          )}

          {totpStep === "idle" && totpEnabled && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setTotpStep("disabling")}
            >
              <ShieldOff className="h-3.5 w-3.5 mr-1" />
              Disattiva 2FA
            </Button>
          )}

          {/* Stato: setup — mostra QR code */}
          {totpStep === "setup" && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <p className="text-sm font-medium">1. Inquadra il QR code con la tua app autenticatore</p>
              {totpQr && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <QRCodeSVG value={totpQr} size={160} />
                  </div>
                </div>
              )}
              <p className="text-sm font-medium">2. Inserisci il codice generato per confermare</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]{6,7}"
                  placeholder="000 000"
                  maxLength={7}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-32 text-center text-lg tracking-widest"
                />
                <Button
                  size="sm"
                  onClick={verifyAndEnableTotp}
                  disabled={totpLoading || totpCode.replace(/\s/g, "").length < 6}
                >
                  {totpLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  Conferma
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setTotpStep("idle"); setTotpCode(""); setTotpQr(""); }}
                >
                  Annulla
                </Button>
              </div>
            </div>
          )}

          {/* Stato: disabling */}
          {totpStep === "disabling" && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <p className="text-sm">Inserisci la tua password per disattivare il 2FA:</p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={totpDisablePassword}
                  onChange={(e) => setTotpDisablePassword(e.target.value)}
                  className="max-w-48"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={disableTotp}
                  disabled={totpLoading || !totpDisablePassword}
                >
                  {totpLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Disattiva
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setTotpStep("idle"); setTotpDisablePassword(""); }}
                >
                  Annulla
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Azioni rapide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Azioni rapide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Libera tutti i tavoli</Label>
              <p className="text-xs text-muted-foreground">
                Segna tutte le prenotazioni in stato &quot;Arrivato&quot; come uscite. Usa a fine serata.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={closeTables}
              disabled={acting !== null}
            >
              {acting === "close-tables" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <DoorOpen className="h-3.5 w-3.5 mr-1" />
              )}
              Libera tavoli
            </Button>
          </div>

          <div className="border-t pt-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Svuota ordini cucina</Label>
              <p className="text-xs text-muted-foreground">
                Elimina tutti gli ordini ancora in lavorazione. Usa a fine serata.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={clearKitchen}
              disabled={acting !== null}
            >
              {acting === "clear-kitchen" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <ChefHat className="h-3.5 w-3.5 mr-1" />
              )}
              Svuota cucina
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      {settings?.["whatsapp.enabled"] === "true" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Prenotazioni via WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Service on/off */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Verifica telefono e autoresponder</Label>
                <p className="text-xs text-muted-foreground">
                  Quando attivo: alla fine della prenotazione il cliente riceve un codice via WhatsApp da inserire per confermare. L&apos;autoresponder risponde automaticamente ai messaggi in arrivo con il link di prenotazione.
                </p>
              </div>
              <Switch
                checked={settings["whatsapp.service.enabled"] === "true"}
                onCheckedChange={toggleWaService}
              />
            </div>

            {/* Autoresponder keywords */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Parole chiave autoresponder</Label>
              <p className="text-xs text-muted-foreground">
                Quando un cliente invia un messaggio contenente una di queste parole, riceve automaticamente il link di prenotazione. Separa con virgola.
              </p>
              <Input
                value={waKeywordsInput}
                onChange={e => onWaKeywordsChange(e.target.value)}
                placeholder="prenota,tavolo,info,ciao,buongiorno…"
                className="font-mono text-sm"
              />
              {waSaving && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Salvataggio…</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
