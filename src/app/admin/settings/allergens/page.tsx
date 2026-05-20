"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Trash2, Edit2, Loader2, Check } from "lucide-react";
import { ALLERGEN_ICONS, getAllergenIconDef } from "@/lib/allergen-icons";

interface Allergen {
  id: string;
  number: number;
  name: string;
  icon: string | null;
}

const EMPTY_FORM = { number: "", name: "", icon: "" as string };

function IconPickerButton({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-xs transition-all border-2 ${
        selected
          ? "border-foreground bg-muted shadow-sm"
          : "border-border bg-transparent hover:bg-muted/50 text-muted-foreground"
      }`}
    >
      {selected && (
        <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-foreground flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-background" />
        </span>
      )}
      {children}
      <span className={selected ? "font-semibold text-foreground" : ""}>{label}</span>
    </button>
  );
}

export default function AllergensPage() {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{ open: boolean; editing: Allergen | null }>({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/allergens", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { setAllergens(data); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") setLoading(false); });
    return () => controller.abort();
  }, []);

  function openNew() {
    const nextNum = allergens.length > 0 ? Math.max(...allergens.map((a) => a.number)) + 1 : 1;
    setForm({ number: String(nextNum), name: "", icon: "" });
    setDialog({ open: true, editing: null });
  }

  function openEdit(a: Allergen) {
    setForm({ number: String(a.number), name: a.name, icon: a.icon ?? "" });
    setDialog({ open: true, editing: a });
  }

  async function save() {
    const num = parseInt(form.number);
    if (isNaN(num) || num <= 0 || !form.name.trim()) {
      toast({ title: "Numero e nome obbligatori", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!dialog.editing;
      const url = isEdit ? `/api/allergens/${dialog.editing!.id}` : "/api/allergens";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, name: form.name.trim(), icon: form.icon || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error ?? "Errore", variant: "destructive" }); return; }

      if (isEdit) {
        setAllergens((prev) => prev.map((a) => (a.id === data.id ? data : a)).sort((a, b) => a.number - b.number));
      } else {
        setAllergens((prev) => [...prev, data].sort((a, b) => a.number - b.number));
      }
      toast({ title: isEdit ? "Allergene aggiornato" : "Allergene aggiunto" });
      setDialog({ open: false, editing: null });
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: Allergen) {
    if (!confirm(`Eliminare "${a.number} - ${a.name}"?`)) return;
    const res = await fetch(`/api/allergens/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      setAllergens((prev) => prev.filter((x) => x.id !== a.id));
      toast({ title: "Allergene eliminato" });
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Allergeni e indicatori</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Aggiungi
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            Definisci allergeni con numero di riferimento e, opzionalmente, un&apos;icona personalizzata
            (es. fiocco di neve per prodotti surgelati).
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allergens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun allergene configurato.
            </p>
          ) : (
            <div className="divide-y">
              {allergens.map((a) => {
                const iconDef = getAllergenIconDef(a.icon);
                return (
                  <div key={a.id} className="flex items-center gap-3 py-3">
                    {iconDef ? (
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${iconDef.bgClass} border ${iconDef.borderClass}`}>
                        <iconDef.Icon className={`h-4 w-4 ${iconDef.colorClass}`} />
                      </span>
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold shrink-0">
                        {a.number}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{a.name}</span>
                      {iconDef && (
                        <span className="text-xs text-muted-foreground ml-2">· #{a.number} · {iconDef.label}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(a)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o, editing: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.editing ? "Modifica" : "Nuovo allergene / indicatore"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Numero di riferimento</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome / descrizione</Label>
                <Input
                  placeholder="es. Glutine, Surgelato…"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Icona personalizzata <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
              <div className="grid grid-cols-3 gap-2">
                <IconPickerButton
                  selected={!form.icon}
                  onClick={() => setForm((f) => ({ ...f, icon: "" }))}
                  label="Solo numero"
                >
                  <span className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold">
                    {form.number || "1"}
                  </span>
                </IconPickerButton>

                {ALLERGEN_ICONS.map((def) => (
                  <IconPickerButton
                    key={def.key}
                    selected={form.icon === def.key}
                    onClick={() => setForm((f) => ({ ...f, icon: def.key }))}
                    label={def.label}
                  >
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center border ${def.bgClass} ${def.borderClass}`}>
                      <def.Icon className={`h-4 w-4 ${def.colorClass}`} />
                    </span>
                  </IconPickerButton>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>
              Annulla
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
