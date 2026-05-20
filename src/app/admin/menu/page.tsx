"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, AlertTriangle, ImagePlus, X, Loader2, Star, Search } from "lucide-react";
import { getAllergenIconDef } from "@/lib/allergen-icons";
import { cn } from "@/lib/utils";

interface Allergen {
  id: string;
  number: number;
  name: string;
  icon: string | null;
}

type MealPeriod = "ALWAYS" | "LUNCH" | "DINNER";

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  order: number;
  allergenIds: string[];
  imageUrl: string | null;
  mealPeriod: MealPeriod;
  featured: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
}

const MEAL_PERIODS: { value: MealPeriod; label: string }[] = [
  { value: "ALWAYS", label: "Sempre" },
  { value: "LUNCH",  label: "Pranzo" },
  { value: "DINNER", label: "Cena"   },
];

const EMPTY_ITEM = { name: "", description: "", price: "", available: true, allergenIds: [] as string[], mealPeriod: "ALWAYS" as MealPeriod, featured: false };

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState("");
  const [itemDialog, setItemDialog] = useState<{ open: boolean; categoryId: string | null; item: MenuItem | null }>({
    open: false, categoryId: null, item: null,
  });
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/menu/categories").then((r) => r.json()),
      fetch("/api/allergens").then((r) => r.json()),
    ]).then(([cats, alls]) => {
      setCategories(cats);
      setAllergens(alls);
    });
  }, []);

  async function createCategory() {
    if (!catName.trim()) return;
    const res = await fetch("/api/menu/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim(), order: categories.length }),
    });
    const cat = await res.json();
    setCategories((prev) => [...prev, { ...cat, items: [] }]);
    setCatDialog(false);
    setCatName("");
  }

  async function deleteCategory(id: string) {
    if (!confirm("Eliminare la categoria e tutti i suoi piatti?")) return;
    await fetch(`/api/menu/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  function openItemDialog(categoryId: string, item?: MenuItem) {
    setItemDialog({ open: true, categoryId, item: item ?? null });
    setItemForm({
      name: item?.name ?? "",
      description: item?.description ?? "",
      price: item?.price ? String(item.price) : "",
      available: item?.available ?? true,
      allergenIds: item?.allergenIds ?? [],
      mealPeriod: item?.mealPeriod ?? "ALWAYS",
      featured: item?.featured ?? false,
    });
    setImagePreview(item?.imageUrl ?? null);
    setImageFile(null);
    setRemoveImage(false);
  }

  function closeItemDialog() {
    setItemDialog({ open: false, categoryId: null, item: null });
    setImagePreview(null);
    setImageFile(null);
    setRemoveImage(false);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Immagine troppo grande (max 5 MB)", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleAllergen(id: string) {
    setItemForm((f) => ({
      ...f,
      allergenIds: f.allergenIds.includes(id)
        ? f.allergenIds.filter((a) => a !== id)
        : [...f.allergenIds, id],
    }));
  }

  async function saveItem() {
    const price = parseFloat(itemForm.price);
    if (!itemForm.name || isNaN(price) || price <= 0) {
      toast({ title: "Nome e prezzo obbligatori", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: itemForm.name,
        description: itemForm.description || null,
        price,
        available: itemForm.available,
        allergenIds: itemForm.allergenIds,
        mealPeriod: itemForm.mealPeriod,
        featured: itemForm.featured,
      };

      let savedItem: MenuItem;

      if (itemDialog.item) {
        const res = await fetch(`/api/menu/items/${itemDialog.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { toast({ title: data.error ?? "Errore salvataggio", variant: "destructive" }); return; }
        savedItem = data;
      } else {
        const cat = categories.find((c) => c.id === itemDialog.categoryId);
        const res = await fetch("/api/menu/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: itemDialog.categoryId, order: cat?.items.length ?? 0, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) { toast({ title: data.error ?? "Errore salvataggio", variant: "destructive" }); return; }
        savedItem = data;
      }

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const imgRes = await fetch(`/api/menu/items/${savedItem.id}/image`, { method: "POST", body: fd });
        const imgData = await imgRes.json();
        if (imgRes.ok) savedItem = imgData;
        else toast({ title: imgData.error ?? "Errore upload immagine", variant: "destructive" });
      } else if (removeImage && itemDialog.item?.imageUrl) {
        const imgRes = await fetch(`/api/menu/items/${savedItem.id}/image`, { method: "DELETE" });
        if (imgRes.ok) savedItem = await imgRes.json();
      }

      if (itemDialog.item) {
        setCategories((prev) =>
          prev.map((c) => ({ ...c, items: c.items.map((i) => (i.id === savedItem.id ? savedItem : i)) }))
        );
      } else {
        setCategories((prev) =>
          prev.map((c) => (c.id === itemDialog.categoryId ? { ...c, items: [...c.items, savedItem] } : c))
        );
      }

      closeItemDialog();
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(catId: string, itemId: string) {
    await fetch(`/api/menu/items/${itemId}`, { method: "DELETE" });
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c))
    );
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    const updated: MenuItem = await res.json();
    setCategories((prev) =>
      prev.map((c) => ({ ...c, items: c.items.map((i) => (i.id === updated.id ? updated : i)) }))
    );
  }

  const allergenMap = Object.fromEntries(allergens.map((a) => [a.id, a]));
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestione Menu</h1>
        <Button onClick={() => setCatDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Categoria
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca piatto…"
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">Nessuna categoria. Inizia aggiungendone una.</p>
      ) : (
        categories.map((cat) => {
          const visibleItems = query
            ? cat.items.filter(
                (i) =>
                  i.name.toLowerCase().includes(query) ||
                  (i.description ?? "").toLowerCase().includes(query)
              )
            : cat.items;
          if (query && visibleItems.length === 0) return null;
          return (
          <Card key={cat.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{cat.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openItemDialog(cat.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Piatto
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cat.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun piatto.</p>
              ) : (
                <div className="space-y-2">
                  {visibleItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 border-b pb-2 last:border-0">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded-md object-cover shrink-0 border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-slate-100 border shrink-0 flex items-center justify-center">
                          <ImagePlus className="h-4 w-4 text-slate-300" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-medium text-sm ${!item.available ? "line-through text-muted-foreground" : ""}`}>
                            {item.name}
                          </p>
                          {item.featured && (
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {item.mealPeriod === "LUNCH" ? "Pranzo" : item.mealPeriod === "DINNER" ? "Cena" : "Sempre"}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                        {item.allergenIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.allergenIds.map((aid) => {
                              const a = allergenMap[aid];
                              if (!a) return null;
                              const def = getAllergenIconDef(a.icon);
                              return def ? (
                                <Badge key={aid} variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${def.colorClass} border-current`}>
                                  <def.Icon className="h-2.5 w-2.5" />
                                </Badge>
                              ) : (
                                <Badge key={aid} variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-700 border-amber-300">
                                  {a.number}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-sm shrink-0">€{Number(item.price).toFixed(2)}</span>
                      <Switch checked={item.available} onCheckedChange={() => toggleAvailable(item)} />
                      <Button variant="ghost" size="icon" onClick={() => openItemDialog(cat.id, item)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteItem(cat.id, item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          );
        })
      )}

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova categoria</DialogTitle></DialogHeader>
          <Input
            placeholder="es. Antipasti, Primi, Dessert..."
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createCategory()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Annulla</Button>
            <Button onClick={createCategory}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialog.open} onOpenChange={(o) => { if (!o) closeItemDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{itemDialog.item ? "Modifica piatto" : "Nuovo piatto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrizione (opzionale)</Label>
              <Input value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Prezzo (€)</Label>
              <Input
                type="number" step="0.50" min="0"
                value={itemForm.price}
                onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImagePlus className="h-3.5 w-3.5" /> Foto (opzionale)
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImagePick}
              />
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Anteprima" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 text-xs bg-black/60 hover:bg-black/80 text-white rounded px-2 py-1 transition-colors"
                  >
                    Cambia
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm">Clicca per caricare (jpeg, png, webp · max 5 MB)</span>
                </button>
              )}
            </div>

            {allergens.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Allergeni e indicatori
                </Label>
                <div className="grid grid-cols-2 gap-1.5 p-3 border rounded-lg bg-slate-50 max-h-48 overflow-y-auto">
                  {allergens.map((a) => {
                    const selected = itemForm.allergenIds.includes(a.id);
                    const def = getAllergenIconDef(a.icon);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAllergen(a.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors ${
                          selected
                            ? "bg-amber-100 border border-amber-400 text-amber-800"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {def ? (
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${def.bgClass} border ${def.borderClass}`}>
                            <def.Icon className={`h-3 w-3 ${def.colorClass}`} />
                          </span>
                        ) : (
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            selected ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"
                          }`}>
                            {a.number}
                          </span>
                        )}
                        <span className="truncate">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Disponibilità oraria</Label>
              <div className="flex gap-2">
                {MEAL_PERIODS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setItemForm((f) => ({ ...f, mealPeriod: value }))}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                      itemForm.mealPeriod === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemForm.featured}
                  onCheckedChange={(v) => setItemForm((f) => ({ ...f, featured: v }))}
                />
                <Label className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-400" /> In evidenza
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemForm.available}
                  onCheckedChange={(v) => setItemForm((f) => ({ ...f, available: v }))}
                />
                <Label>Disponibile</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeItemDialog}>Annulla</Button>
            <Button onClick={saveItem} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
