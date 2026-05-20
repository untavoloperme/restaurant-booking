"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Edit2, AlertTriangle, ImagePlus, X, Loader2,
  Star, Search, GripVertical, ChevronDown, ChevronRight, Wine,
} from "lucide-react";
import { getAllergenIconDef } from "@/lib/allergen-icons";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
  type CollisionDetection,
  type DroppableContainer,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Allergen { id: string; number: number; name: string; icon: string | null; }
type MealPeriod = "ALWAYS" | "LUNCH" | "DINNER";
interface WinePairing { id: string; name: string; price: string | number; }
interface MenuItem {
  id: string; categoryId: string; subcategoryId: string | null;
  name: string; description: string | null; price: number;
  available: boolean; order: number; allergenIds: string[];
  imageUrl: string | null; mealPeriod: MealPeriod; featured: boolean;
  winePairings: WinePairing[];
}
interface MenuSubcategory { id: string; categoryId: string; name: string; order: number; }
interface MenuCategory { id: string; name: string; order: number; subcategories: MenuSubcategory[]; items: MenuItem[]; }

const MEAL_PERIODS: { value: MealPeriod; label: string }[] = [
  { value: "ALWAYS", label: "Sempre" }, { value: "LUNCH", label: "Pranzo" }, { value: "DINNER", label: "Cena" },
];
const EMPTY_ITEM = {
  name: "", description: "", price: "", available: true,
  allergenIds: [] as string[], mealPeriod: "ALWAYS" as MealPeriod, featured: false,
  categoryId: "", subcategoryId: null as string | null, winePairingIds: [] as string[],
};

// ── Custom collision detection: only matches droppables of the same type ───────
const typeAwareCollision: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type as string | undefined;
  let candidates: DroppableContainer[] = Array.from(args.droppableContainers);

  if (activeType === "category") {
    candidates = candidates.filter((c) => c.data?.current?.type === "category");
  } else if (activeType === "subcategory") {
    const catId = args.active.data.current?.categoryId;
    candidates = candidates.filter(
      (c) => c.data?.current?.type === "subcategory" && c.data?.current?.categoryId === catId
    );
  } else if (activeType === "item") {
    candidates = candidates.filter(
      (c) => c.data?.current?.type === "item" || c.data?.current?.type === "itemDrop"
    );
  }

  return closestCenter({ ...args, droppableContainers: candidates });
};

// ── Droppable empty-container target ──────────────────────────────────────────
function ItemDropZone({
  id, categoryId, subcategoryId, children, className,
}: {
  id: string; categoryId: string; subcategoryId: string | null;
  children?: React.ReactNode; className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id, data: { type: "itemDrop", categoryId, subcategoryId },
  });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "ring-1 ring-primary/40 rounded-md bg-primary/5")}>
      {children}
    </div>
  );
}

// ── Sortable wrappers ──────────────────────────────────────────────────────────
function SortableCategory({ cat, children }: { cat: MenuCategory; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id, data: { type: "category" },
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <Card className="overflow-hidden">
        <div className="flex items-start gap-0">
          <button {...attributes} {...listeners}
            className="flex items-center justify-center px-2 pt-3.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
            tabIndex={-1}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </Card>
    </div>
  );
}

function SortableSubcategory({ sub, children }: { sub: MenuSubcategory; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `sub-${sub.id}`, data: { type: "subcategory", categoryId: sub.categoryId },
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-start gap-1">
      <button {...attributes} {...listeners}
        className="flex items-center justify-center p-1 mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function SortableItem({ item, children }: { item: MenuItem; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item", categoryId: item.categoryId, subcategoryId: item.subcategoryId ?? null },
  });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      className="flex items-center gap-1 border-b pb-2 last:border-0">
      <button {...attributes} {...listeners}
        className="flex items-center justify-center p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-3">{children}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);

  // category dialogs
  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // subcategory
  const [subDialog, setSubDialog] = useState<{ open: boolean; categoryId: string | null; sub: MenuSubcategory | null }>({
    open: false, categoryId: null, sub: null,
  });
  const [subName, setSubName] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // item dialog
  const [itemDialog, setItemDialog] = useState<{ open: boolean; categoryId: string | null; item: MenuItem | null }>({
    open: false, categoryId: null, item: null,
  });
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);
  const [wineSearch, setWineSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  // DnD state
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const dragOrigin = useRef<{ categoryId: string; subcategoryId: string | null } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    Promise.all([
      fetch("/api/menu/categories").then((r) => r.json()),
      fetch("/api/allergens").then((r) => r.json()),
    ]).then(([cats, alls]) => {
      setCategories(cats);
      setAllergens(alls);
      setExpandedCats(new Set(cats.map((c: MenuCategory) => c.id)));
    });
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const allergenMap = Object.fromEntries(allergens.map((a) => [a.id, a]));
  const query = search.trim().toLowerCase();
  const allItems = categories.flatMap((c) => c.items);

  function findItem(id: string): MenuItem | null {
    for (const cat of categories) {
      const f = cat.items.find((i) => i.id === id);
      if (f) return f;
    }
    return null;
  }

  // ── DnD handlers ─────────────────────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    if (active.data.current?.type !== "item") return;
    setActiveItemId(String(active.id));
    dragOrigin.current = {
      categoryId: active.data.current.categoryId,
      subcategoryId: active.data.current.subcategoryId ?? null,
    };
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.data.current?.type !== "item") return;

    const activeId = String(active.id);
    const activeCatId = active.data.current.categoryId as string;
    const activeSubId = (active.data.current.subcategoryId ?? null) as string | null;

    const overType = over.data.current?.type as string | undefined;
    if (overType !== "item" && overType !== "itemDrop") return;

    const targetCatId = over.data.current?.categoryId as string;
    const targetSubId = (over.data.current?.subcategoryId ?? null) as string | null;

    if (activeCatId === targetCatId && activeSubId === targetSubId) return; // same container

    setCategories((prev) => {
      let activeItem: MenuItem | null = null;
      for (const cat of prev) {
        const f = cat.items.find((i) => i.id === activeId);
        if (f) { activeItem = { ...f }; break; }
      }
      if (!activeItem) return prev;

      const moved: MenuItem = { ...activeItem, categoryId: targetCatId, subcategoryId: targetSubId };

      return prev.map((cat) => {
        const isSource = cat.id === activeCatId;
        const isTarget = cat.id === targetCatId;

        if (isSource && isTarget) {
          // Same category, different subcategory
          return { ...cat, items: cat.items.map((i) => (i.id === activeId ? moved : i)) };
        }
        if (isSource) {
          return { ...cat, items: cat.items.filter((i) => i.id !== activeId) };
        }
        if (isTarget) {
          if (overType === "item") {
            const overIdx = cat.items.findIndex((i) => i.id === String(over.id));
            if (overIdx >= 0) {
              const next = [...cat.items];
              next.splice(overIdx, 0, moved);
              return { ...cat, items: next };
            }
          }
          return { ...cat, items: [...cat.items, moved] };
        }
        return cat;
      });
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveItemId(null);
    if (!over) { dragOrigin.current = null; return; }

    const activeType = active.data.current?.type as string | undefined;

    // ── Category reorder ─────────────────────────────────────────────────────
    if (activeType === "category") {
      if (over.data.current?.type !== "category") return;
      const aId = String(active.id), oId = String(over.id);
      if (aId === oId) return;
      setCategories((prev) => {
        const next = arrayMove(prev, prev.findIndex((c) => c.id === aId), prev.findIndex((c) => c.id === oId))
          .map((c, i) => ({ ...c, order: i }));
        fetch("/api/menu/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "categories", items: next.map((c) => ({ id: c.id, order: c.order })) }) });
        return next;
      });
      return;
    }

    // ── Subcategory reorder ───────────────────────────────────────────────────
    if (activeType === "subcategory") {
      if (over.data.current?.type !== "subcategory") return;
      const catId = active.data.current?.categoryId;
      if (over.data.current?.categoryId !== catId) return;
      const aId = String(active.id).replace("sub-", ""), oId = String(over.id).replace("sub-", "");
      if (aId === oId) return;
      setCategories((prev) => prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const next = arrayMove(cat.subcategories, cat.subcategories.findIndex((s) => s.id === aId), cat.subcategories.findIndex((s) => s.id === oId))
          .map((s, i) => ({ ...s, order: i }));
        fetch("/api/menu/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "subcategories", items: next.map((s) => ({ id: s.id, order: s.order })) }) });
        return { ...cat, subcategories: next };
      }));
      return;
    }

    // ── Item move/reorder ─────────────────────────────────────────────────────
    if (activeType !== "item") return;

    const origin = dragOrigin.current;
    dragOrigin.current = null;
    const activeId = String(active.id);

    // Find where the item currently sits (after onDragOver updates)
    let curCatId: string | null = null, curSubId: string | null = null;
    for (const cat of categories) {
      const f = cat.items.find((i) => i.id === activeId);
      if (f) { curCatId = cat.id; curSubId = f.subcategoryId; break; }
    }
    if (!curCatId) return;

    const crossContainer = origin && (origin.categoryId !== curCatId || origin.subcategoryId !== curSubId);

    if (crossContainer) {
      // Persist move: update categoryId + subcategoryId, then recalculate order
      fetch(`/api/menu/items/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: curCatId, subcategoryId: curSubId }),
      });
      setCategories((prev) => prev.map((cat) => {
        if (cat.id !== curCatId) return cat;
        const container = cat.items.filter((i) => i.subcategoryId === curSubId).map((i, idx) => ({ ...i, order: idx }));
        const rest = cat.items.filter((i) => i.subcategoryId !== curSubId);
        fetch("/api/menu/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "items", items: container.map((i) => ({ id: i.id, order: i.order })) }) });
        return { ...cat, items: [...rest, ...container] };
      }));
      return;
    }

    // Same container: reorder
    const overId = String(over.id);
    if (activeId === overId) return;
    const overType = over.data.current?.type as string | undefined;
    if (overType !== "item") return;
    if (over.data.current?.categoryId !== curCatId || over.data.current?.subcategoryId !== curSubId) return;

    setCategories((prev) => prev.map((cat) => {
      if (cat.id !== curCatId) return cat;
      const container = cat.items.filter((i) => i.subcategoryId === curSubId);
      const rest = cat.items.filter((i) => i.subcategoryId !== curSubId);
      const oldIdx = container.findIndex((i) => i.id === activeId);
      const newIdx = container.findIndex((i) => i.id === overId);
      if (oldIdx === newIdx || newIdx === -1) return cat;
      const next = arrayMove(container, oldIdx, newIdx).map((i, idx) => ({ ...i, order: idx }));
      fetch("/api/menu/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "items", items: next.map((i) => ({ id: i.id, order: i.order })) }) });
      return { ...cat, items: [...rest, ...next] };
    }));
  }

  function handleDragCancel() {
    setActiveItemId(null);
    dragOrigin.current = null;
  }

  // ── Category actions ──────────────────────────────────────────────────────────
  async function createCategory() {
    if (!catName.trim()) return;
    const res = await fetch("/api/menu/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: catName.trim(), order: categories.length }) });
    const cat = await res.json();
    setCategories((prev) => [...prev, { ...cat, items: [], subcategories: [] }]);
    setCatDialog(false); setCatName("");
    setExpandedCats((prev) => new Set(Array.from(prev).concat(cat.id)));
  }

  async function renameCategory(id: string, name: string) {
    if (!name.trim()) { setEditingCatId(null); return; }
    await fetch(`/api/menu/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
    setEditingCatId(null);
  }

  async function deleteCategory(id: string) {
    if (!confirm("Eliminare la categoria e tutti i suoi piatti?")) return;
    await fetch(`/api/menu/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  // ── Subcategory actions ───────────────────────────────────────────────────────
  function openSubDialog(categoryId: string, sub?: MenuSubcategory) {
    setSubDialog({ open: true, categoryId, sub: sub ?? null });
    setSubName(sub?.name ?? "");
  }

  async function saveSubcategory() {
    if (!subName.trim() || !subDialog.categoryId) return;
    if (subDialog.sub) {
      const res = await fetch(`/api/menu/subcategories/${subDialog.sub.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: subName.trim() }) });
      const updated = await res.json();
      setCategories((prev) => prev.map((c) => c.id === subDialog.categoryId ? { ...c, subcategories: c.subcategories.map((s) => s.id === updated.id ? updated : s) } : c));
    } else {
      const cat = categories.find((c) => c.id === subDialog.categoryId);
      const res = await fetch("/api/menu/subcategories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: subDialog.categoryId, name: subName.trim(), order: cat?.subcategories.length ?? 0 }) });
      const created = await res.json();
      setCategories((prev) => prev.map((c) => c.id === subDialog.categoryId ? { ...c, subcategories: [...c.subcategories, created] } : c));
    }
    setSubDialog({ open: false, categoryId: null, sub: null }); setSubName("");
  }

  async function deleteSubcategory(catId: string, subId: string) {
    if (!confirm("Eliminare la sottocategoria? I piatti rimarranno nella categoria.")) return;
    await fetch(`/api/menu/subcategories/${subId}`, { method: "DELETE" });
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId), items: c.items.map((i) => i.subcategoryId === subId ? { ...i, subcategoryId: null } : i) } : c));
  }

  // ── Item actions ──────────────────────────────────────────────────────────────
  function openItemDialog(categoryId: string, item?: MenuItem) {
    setItemDialog({ open: true, categoryId, item: item ?? null });
    setItemForm({
      name: item?.name ?? "", description: item?.description ?? "",
      price: item?.price ? String(item.price) : "", available: item?.available ?? true,
      allergenIds: item?.allergenIds ?? [], mealPeriod: item?.mealPeriod ?? "ALWAYS",
      featured: item?.featured ?? false,
      categoryId: item?.categoryId ?? categoryId,
      subcategoryId: item?.subcategoryId ?? null,
      winePairingIds: item?.winePairings?.map((w) => w.id) ?? [],
    });
    setImagePreview(item?.imageUrl ?? null); setImageFile(null); setRemoveImage(false); setWineSearch("");
  }

  function closeItemDialog() {
    setItemDialog({ open: false, categoryId: null, item: null });
    setImagePreview(null); setImageFile(null); setRemoveImage(false);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Immagine troppo grande (max 5 MB)", variant: "destructive" }); return; }
    setImageFile(file); setRemoveImage(false); setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setImageFile(null); setImagePreview(null); setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function toggleAllergen(id: string) {
    setItemForm((f) => ({ ...f, allergenIds: f.allergenIds.includes(id) ? f.allergenIds.filter((a) => a !== id) : [...f.allergenIds, id] }));
  }

  function toggleWine(id: string) {
    setItemForm((f) => ({ ...f, winePairingIds: f.winePairingIds.includes(id) ? f.winePairingIds.filter((w) => w !== id) : [...f.winePairingIds, id] }));
  }

  async function saveItem() {
    const price = parseFloat(itemForm.price);
    if (!itemForm.name || isNaN(price) || price <= 0) { toast({ title: "Nome e prezzo obbligatori", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const targetCatId = itemForm.categoryId || itemDialog.categoryId!;
      const payload = { name: itemForm.name, description: itemForm.description || null, price, available: itemForm.available, allergenIds: itemForm.allergenIds, mealPeriod: itemForm.mealPeriod, featured: itemForm.featured, categoryId: targetCatId, subcategoryId: itemForm.subcategoryId, winePairingIds: itemForm.winePairingIds };
      let savedItem: MenuItem;
      if (itemDialog.item) {
        const res = await fetch(`/api/menu/items/${itemDialog.item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) { toast({ title: data.error ?? "Errore salvataggio", variant: "destructive" }); return; }
        savedItem = data;
      } else {
        const cat = categories.find((c) => c.id === targetCatId);
        const res = await fetch("/api/menu/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: cat?.items.length ?? 0, ...payload }) });
        const data = await res.json();
        if (!res.ok) { toast({ title: data.error ?? "Errore salvataggio", variant: "destructive" }); return; }
        savedItem = data;
      }
      if (imageFile) {
        const fd = new FormData(); fd.append("file", imageFile);
        const imgRes = await fetch(`/api/menu/items/${savedItem.id}/image`, { method: "POST", body: fd });
        const imgData = await imgRes.json();
        if (imgRes.ok) savedItem = imgData;
        else toast({ title: imgData.error ?? "Errore upload immagine", variant: "destructive" });
      } else if (removeImage && itemDialog.item?.imageUrl) {
        const imgRes = await fetch(`/api/menu/items/${savedItem.id}/image`, { method: "DELETE" });
        if (imgRes.ok) savedItem = { ...savedItem, ...(await imgRes.json()) };
      }
      if (itemDialog.item) {
        const oldCatId = itemDialog.item.categoryId;
        if (oldCatId !== targetCatId) {
          // moved to a different category
          setCategories((prev) => prev.map((c) => {
            if (c.id === oldCatId) return { ...c, items: c.items.filter((i) => i.id !== savedItem.id) };
            if (c.id === targetCatId) return { ...c, items: [...c.items, savedItem] };
            return c;
          }));
        } else {
          setCategories((prev) => prev.map((c) => ({ ...c, items: c.items.map((i) => i.id === savedItem.id ? savedItem : i) })));
        }
      } else {
        setCategories((prev) => prev.map((c) => c.id === targetCatId ? { ...c, items: [...c.items, savedItem] } : c));
      }
      closeItemDialog();
    } finally { setSaving(false); }
  }

  async function deleteItem(catId: string, itemId: string) {
    await fetch(`/api/menu/items/${itemId}`, { method: "DELETE" });
    setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c));
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/menu/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available: !item.available }) });
    const updated: MenuItem = await res.json();
    setCategories((prev) => prev.map((c) => ({ ...c, items: c.items.map((i) => i.id === updated.id ? updated : i) })));
  }

  function toggleCatExpand(id: string) {
    setExpandedCats((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  // ── Item row renderer ─────────────────────────────────────────────────────────
  const renderItemRow = useCallback((item: MenuItem, catId: string) => (
    <>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-md object-cover shrink-0 border" />
      ) : (
        <div className="h-10 w-10 rounded-md bg-slate-100 border shrink-0 flex items-center justify-center">
          <ImagePlus className="h-4 w-4 text-slate-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`font-medium text-sm ${!item.available ? "line-through text-muted-foreground" : ""}`}>{item.name}</p>
          {item.featured && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {item.mealPeriod === "LUNCH" ? "Pranzo" : item.mealPeriod === "DINNER" ? "Cena" : "Sempre"}
          </Badge>
        </div>
        {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {item.allergenIds.map((aid) => {
            const a = allergenMap[aid]; if (!a) return null;
            const def = getAllergenIconDef(a.icon);
            return def ? (
              <Badge key={aid} variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${def.colorClass} border-current`}><def.Icon className="h-2.5 w-2.5" /></Badge>
            ) : (
              <Badge key={aid} variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-700 border-amber-300">{a.number}</Badge>
            );
          })}
          {item.winePairings?.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-purple-600 border-purple-300 gap-0.5">
              <Wine className="h-2.5 w-2.5" />{item.winePairings.length}
            </Badge>
          )}
        </div>
      </div>
      <span className="font-mono text-sm shrink-0">€{Number(item.price).toFixed(2)}</span>
      <Switch checked={item.available} onCheckedChange={() => toggleAvailable(item)} />
      <Button variant="ghost" size="icon" onClick={() => openItemDialog(catId, item)}><Edit2 className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteItem(catId, item.id)}><Trash2 className="h-3 w-3" /></Button>
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [allergenMap]);

  const currentItemId = itemDialog.item?.id;
  const wineQuery = wineSearch.trim().toLowerCase();
  const selectableWines = allItems.filter((i) => i.id !== currentItemId && (!wineQuery || i.name.toLowerCase().includes(wineQuery)));

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestione Menu</h1>
        <Button onClick={() => setCatDialog(true)}><Plus className="h-4 w-4 mr-1" /> Categoria</Button>
      </div>

      {categories.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca piatto…" className="pl-9 pr-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">Nessuna categoria. Inizia aggiungendone una.</p>
      ) : (
        /* Single DndContext for ALL drag operations */
        <DndContext
          sensors={sensors}
          collisionDetection={typeAwareCollision}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* Category sorting */}
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {categories.map((cat) => {
                const visibleItems = query
                  ? cat.items.filter((i) => i.name.toLowerCase().includes(query) || (i.description ?? "").toLowerCase().includes(query))
                  : cat.items;
                if (query && visibleItems.length === 0) return null;
                const isExpanded = expandedCats.has(cat.id);

                return (
                  <SortableCategory key={cat.id} cat={cat}>
                    {/* Category header */}
                    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                      <button onClick={() => toggleCatExpand(cat.id)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {editingCatId === cat.id ? (
                        <Input autoFocus value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)}
                          onBlur={() => renameCategory(cat.id, editingCatName)}
                          onKeyDown={(e) => { if (e.key === "Enter") renameCategory(cat.id, editingCatName); if (e.key === "Escape") setEditingCatId(null); }}
                          className="h-7 text-sm font-semibold flex-1" />
                      ) : (
                        <button className="font-semibold text-base flex-1 text-left hover:text-primary transition-colors"
                          onDoubleClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                          title="Doppio click per rinominare">{cat.name}</button>
                      )}
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Rinomina" onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openSubDialog(cat.id)}><Plus className="h-3 w-3 mr-0.5" /> Sotto</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openItemDialog(cat.id)}><Plus className="h-3 w-3 mr-0.5" /> Piatto</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <CardContent className="pt-0 pb-3">
                        {/* Subcategories */}
                        {cat.subcategories.length > 0 && (
                          <SortableContext items={cat.subcategories.map((s) => `sub-${s.id}`)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3 mb-3">
                              {cat.subcategories.map((sub) => {
                                const subItems = visibleItems.filter((i) => i.subcategoryId === sub.id);
                                return (
                                  <SortableSubcategory key={sub.id} sub={sub}>
                                    <div className="border rounded-lg bg-slate-50/50">
                                      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-slate-100/60 rounded-t-lg">
                                        <span className="text-xs font-semibold text-slate-600 flex-1">{sub.name}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openSubDialog(cat.id, sub)}><Edit2 className="h-2.5 w-2.5" /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openItemDialog(cat.id)}><Plus className="h-2.5 w-2.5" /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteSubcategory(cat.id, sub.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                                      </div>
                                      <ItemDropZone id={`drop-sub-${sub.id}`} categoryId={cat.id} subcategoryId={sub.id} className="px-2 py-1.5 min-h-[40px]">
                                        {subItems.length === 0 ? (
                                          <p className="text-xs text-muted-foreground px-1 py-2">Trascina qui i piatti di questa sottocategoria.</p>
                                        ) : (
                                          <SortableContext items={subItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-1">
                                              {subItems.map((item) => (
                                                <SortableItem key={item.id} item={item}>{renderItemRow(item, cat.id)}</SortableItem>
                                              ))}
                                            </div>
                                          </SortableContext>
                                        )}
                                      </ItemDropZone>
                                    </div>
                                  </SortableSubcategory>
                                );
                              })}
                            </div>
                          </SortableContext>
                        )}

                        {/* Free items (no subcategory) */}
                        {(() => {
                          const freeItems = visibleItems.filter((i) => !i.subcategoryId);
                          const label = cat.subcategories.length > 0 ? "Senza sottocategoria" : null;
                          return (
                            <ItemDropZone id={`drop-cat-${cat.id}`} categoryId={cat.id} subcategoryId={null} className="min-h-[32px]">
                              {label && freeItems.length > 0 && (
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{label}</p>
                              )}
                              {freeItems.length === 0 && cat.subcategories.length === 0 ? (
                                <p className="text-sm text-muted-foreground px-1 py-1">Nessun piatto.</p>
                              ) : freeItems.length === 0 ? (
                                <p className="text-xs text-muted-foreground px-1 py-1 border border-dashed rounded-md text-center">Trascina qui i piatti senza sottocategoria</p>
                              ) : (
                                <SortableContext items={freeItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                                  <div className="space-y-1">
                                    {freeItems.map((item) => (
                                      <SortableItem key={item.id} item={item}>{renderItemRow(item, cat.id)}</SortableItem>
                                    ))}
                                  </div>
                                </SortableContext>
                              )}
                            </ItemDropZone>
                          );
                        })()}
                      </CardContent>
                    )}
                  </SortableCategory>
                );
              })}
            </div>
          </SortableContext>

          {/* Drag overlay: shows while dragging an item */}
          <DragOverlay>
            {activeItemId ? (() => {
              const item = findItem(activeItemId);
              if (!item) return null;
              return (
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-primary/30 rounded-lg shadow-lg opacity-95 text-sm">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded object-cover shrink-0 border" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-slate-100 border shrink-0 flex items-center justify-center">
                      <ImagePlus className="h-3.5 w-3.5 text-slate-300" />
                    </div>
                  )}
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="font-mono text-muted-foreground shrink-0">€{Number(item.price).toFixed(2)}</span>
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── New category dialog ─────────────────────────────────────────────── */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova categoria</DialogTitle></DialogHeader>
          <Input placeholder="es. Antipasti, Primi, Dessert…" value={catName} onChange={(e) => setCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCategory()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Annulla</Button>
            <Button onClick={createCategory}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Subcategory dialog ──────────────────────────────────────────────── */}
      <Dialog open={subDialog.open} onOpenChange={(o) => { if (!o) setSubDialog({ open: false, categoryId: null, sub: null }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{subDialog.sub ? "Rinomina sottocategoria" : "Nuova sottocategoria"}</DialogTitle></DialogHeader>
          <Input placeholder="es. Rossi, Spumanti, Antipasti freddi…" value={subName} onChange={(e) => setSubName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveSubcategory()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog({ open: false, categoryId: null, sub: null })}>Annulla</Button>
            <Button onClick={saveSubcategory}>{subDialog.sub ? "Salva" : "Crea"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Item dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={itemDialog.open} onOpenChange={(o) => { if (!o) closeItemDialog(); }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <DialogHeader><DialogTitle className="text-base">{itemDialog.item ? "Modifica piatto" : "Nuovo piatto"}</DialogTitle></DialogHeader>
          </div>
          <div className="overflow-y-auto overflow-x-hidden max-h-[75vh] px-6 pb-2">
          <div className="space-y-3 text-sm">

            {/* Nome + Prezzo (riga) */}
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input className="h-8 text-sm" value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prezzo (€)</Label>
                <Input className="h-8 text-sm" type="number" step="0.50" min="0" value={itemForm.price} onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>

            {/* Descrizione */}
            <div className="space-y-1">
              <Label className="text-xs">Descrizione (opzionale)</Label>
              <Input className="h-8 text-sm" value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <div className="flex flex-wrap gap-1">
                {categories.map((c) => (
                  <button key={c.id} type="button"
                    onClick={() => setItemForm((f) => ({ ...f, categoryId: c.id, subcategoryId: null }))}
                    className={cn("px-2.5 py-0.5 rounded border text-xs transition-colors", itemForm.categoryId === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted")}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sottocategoria */}
            {(() => {
              const cat = categories.find((c) => c.id === itemForm.categoryId);
              if (!cat || cat.subcategories.length === 0) return null;
              return (
                <div className="space-y-1">
                  <Label className="text-xs">Sottocategoria</Label>
                  <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => setItemForm((f) => ({ ...f, subcategoryId: null }))}
                      className={cn("px-2.5 py-0.5 rounded border text-xs transition-colors", !itemForm.subcategoryId ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted")}>
                      Nessuna
                    </button>
                    {cat.subcategories.map((s) => (
                      <button key={s.id} type="button" onClick={() => setItemForm((f) => ({ ...f, subcategoryId: s.id }))}
                        className={cn("px-2.5 py-0.5 rounded border text-xs transition-colors", itemForm.subcategoryId === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted")}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Foto */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><ImagePlus className="h-3 w-3" /> Foto (opzionale)</Label>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagePick} />
              {imagePreview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Anteprima" className="w-full h-full object-cover" />
                  <button type="button" onClick={handleRemoveImage} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center"><X className="h-3 w-3 text-white" /></button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-1.5 right-1.5 text-xs bg-black/60 hover:bg-black/80 text-white rounded px-2 py-0.5">Cambia</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 rounded-lg py-5 flex flex-col items-center gap-1 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">Clicca per caricare (jpeg, png, webp · max 5 MB)</span>
                </button>
              )}
            </div>

            {/* Allergeni */}
            {allergens.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" /> Allergeni e indicatori</Label>
                <div className="grid grid-cols-3 gap-1 p-2 border rounded-lg bg-slate-50 max-h-36 overflow-y-auto">
                  {allergens.map((a) => {
                    const selected = itemForm.allergenIds.includes(a.id);
                    const def = getAllergenIconDef(a.icon);
                    return (
                      <button key={a.id} type="button" onClick={() => toggleAllergen(a.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left transition-colors ${selected ? "bg-amber-100 border border-amber-400 text-amber-800" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                        {def ? (
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${def.bgClass} border ${def.borderClass}`}><def.Icon className={`h-2.5 w-2.5 ${def.colorClass}`} /></span>
                        ) : (
                          <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${selected ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600"}`}>{a.number}</span>
                        )}
                        <span className="truncate">{a.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Abbinamento vini */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Wine className="h-3 w-3 text-purple-600" /> Abbinamento vini</Label>
              <div className="border rounded-lg bg-slate-50">
                <div className="relative px-2 pt-2">
                  <Search className="absolute left-4 top-1/2 translate-y-[-2px] h-3 w-3 text-muted-foreground pointer-events-none" />
                  <Input value={wineSearch} onChange={(e) => setWineSearch(e.target.value)} placeholder="Cerca…" className="pl-7 h-7 text-xs" />
                </div>
                <div className="max-h-36 overflow-y-auto px-2 pb-2 pt-1 space-y-0.5">
                  {selectableWines.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1 py-1">Nessun piatto trovato.</p>
                  ) : selectableWines.map((w) => {
                    const selected = itemForm.winePairingIds.includes(w.id);
                    return (
                      <button key={w.id} type="button" onClick={() => toggleWine(w.id)}
                        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left transition-colors ${selected ? "bg-purple-100 border border-purple-400 text-purple-800" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`}>
                        <Wine className={`h-3 w-3 shrink-0 ${selected ? "text-purple-600" : "text-slate-400"}`} />
                        <span className="flex-1 truncate">{w.name}</span>
                        <span className="text-xs tabular-nums shrink-0 text-muted-foreground">€{Number(w.price).toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
                {itemForm.winePairingIds.length > 0 && (
                  <div className="border-t px-2.5 py-1">
                    <span className="text-xs text-purple-600 font-medium">{itemForm.winePairingIds.length} selezionato/i</span>
                  </div>
                )}
              </div>
            </div>

            {/* Disponibilità oraria */}
            <div className="space-y-1">
              <Label className="text-xs">Disponibilità oraria</Label>
              <div className="flex gap-1.5">
                {MEAL_PERIODS.map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setItemForm((f) => ({ ...f, mealPeriod: value }))}
                    className={cn("flex-1 px-2 py-1 rounded border text-xs font-medium transition-colors", itemForm.mealPeriod === value ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={itemForm.featured} onCheckedChange={(v) => setItemForm((f) => ({ ...f, featured: v }))} />
                <Label className="text-xs flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> In evidenza</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={itemForm.available} onCheckedChange={(v) => setItemForm((f) => ({ ...f, available: v }))} />
                <Label className="text-xs">Disponibile</Label>
              </div>
            </div>
          </div>
          </div>
          <div className="px-6 py-4 border-t">
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={closeItemDialog}>Annulla</Button>
              <Button size="sm" onClick={saveItem} disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}Salva
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
