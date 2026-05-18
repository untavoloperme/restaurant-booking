"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  order: number;
}

interface MenuCategory {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
}

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState("");
  const [itemDialog, setItemDialog] = useState<{ open: boolean; categoryId: string | null; item: MenuItem | null }>({
    open: false, categoryId: null, item: null,
  });
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "", available: true });

  useEffect(() => {
    fetch("/api/menu/categories").then((r) => r.json()).then(setCategories);
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
    });
  }

  async function saveItem() {
    const price = parseFloat(itemForm.price);
    if (!itemForm.name || isNaN(price) || price <= 0) {
      toast({ title: "Nome e prezzo obbligatori", variant: "destructive" });
      return;
    }

    if (itemDialog.item) {
      // Update
      const res = await fetch(`/api/menu/items/${itemDialog.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemForm.name, description: itemForm.description || null, price, available: itemForm.available }),
      });
      const updated: MenuItem = await res.json();
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          items: c.items.map((i) => (i.id === updated.id ? updated : i)),
        }))
      );
    } else {
      // Create
      const cat = categories.find((c) => c.id === itemDialog.categoryId);
      const res = await fetch("/api/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: itemDialog.categoryId,
          name: itemForm.name,
          description: itemForm.description || undefined,
          price,
          available: itemForm.available,
          order: cat?.items.length ?? 0,
        }),
      });
      const newItem: MenuItem = await res.json();
      setCategories((prev) =>
        prev.map((c) => (c.id === itemDialog.categoryId ? { ...c, items: [...c.items, newItem] } : c))
      );
    }
    setItemDialog({ open: false, categoryId: null, item: null });
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
      prev.map((c) => ({
        ...c,
        items: c.items.map((i) => (i.id === updated.id ? updated : i)),
      }))
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestione Menu</h1>
        <Button onClick={() => setCatDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">Nessuna categoria. Inizia aggiungendone una.</p>
      ) : (
        categories.map((cat) => (
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
                  {cat.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0">
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${!item.available ? "line-through text-muted-foreground" : ""}`}>
                          {item.name}
                        </p>
                        {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                      <span className="font-mono text-sm">€{Number(item.price).toFixed(2)}</span>
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
        ))
      )}

      {/* Dialog categoria */}
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

      {/* Dialog piatto */}
      <Dialog open={itemDialog.open} onOpenChange={(o) => setItemDialog({ open: o, categoryId: null, item: null })}>
        <DialogContent>
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
            <div className="flex items-center gap-2">
              <Switch
                checked={itemForm.available}
                onCheckedChange={(v) => setItemForm((f) => ({ ...f, available: v }))}
              />
              <Label>Disponibile</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog({ open: false, categoryId: null, item: null })}>
              Annulla
            </Button>
            <Button onClick={saveItem}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
