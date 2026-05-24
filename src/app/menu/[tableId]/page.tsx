"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShoppingCart, Plus, Minus, UtensilsCrossed,
  Loader2, Send, ChevronDown, AlertTriangle, X,
} from "lucide-react";
import { getAllergenIconDef } from "@/lib/allergen-icons";

interface Allergen {
  id: string; number: number; name: string; icon: string | null; color: string | null;
}
interface WinePairing {
  id: string; name: string; price: string | number;
}
interface MenuItem {
  id: string; name: string; description: string | null; price: string;
  available: boolean; allergenIds: string[]; imageUrl: string | null;
  mealPeriod: string | null; featured: boolean; subcategoryId: string | null;
  winePairings: WinePairing[];
}
interface MenuSubcategory {
  id: string; name: string; order: number;
}
interface Category {
  id: string; name: string; order: number;
  subcategories: MenuSubcategory[];
  items: MenuItem[];
}
interface Table {
  id: string; name: string; room: { name: string };
}
interface CartItem {
  item: MenuItem; quantity: number;
}

// Wine bottle SVG icon — styled like allergen icons
function WineBottleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3h6M10 3v3.5c0 .5-.3 1-.7 1.5L8 10.5C7.3 11.5 7 12.5 7 14v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-5c0-1.5-.3-2.5-1-3.5l-1.3-2.5c-.4-.5-.7-1-.7-1.5V3" />
      <path d="M7 15h10" />
    </svg>
  );
}

export default function MenuPage({ params }: { params: { tableId: string } }) {
  const router = useRouter();
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());
  const [activeAllergenItem, setActiveAllergenItem] = useState<string | null>(null);
  const [activeWineItem, setActiveWineItem] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tableIsFree, setTableIsFree] = useState(false);
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [showImages, setShowImages] = useState(true);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantLogo, setRestaurantLogo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/public/menu?tableId=${params.tableId}`).then((r) => r.json()),
      fetch("/api/public/settings").then((r) => r.json()),
    ])
      .then(([menuData, settingsData]) => {
        setOrderingEnabled(settingsData["ordering.enabled"] !== "false");
        setShowImages(settingsData["menu.show_images"] !== "false");
        setRestaurantName(settingsData["restaurant.name"] ?? "");
        setRestaurantLogo(settingsData["restaurant.logo"] ?? "");
        if (menuData.error) { setError(menuData.error); return; }
        if (menuData.tableIsFree) { setTableIsFree(true); setTable(menuData.table); return; }
        setTable(menuData.table);
        setCategories(menuData.categories);
        setAllergens(menuData.allergens ?? []);
      })
      .catch(() => setError("Errore di connessione"))
      .finally(() => setLoading(false));
  }, [params.tableId]);

  const allergenMap = Object.fromEntries(allergens.map((a) => [a.id, a]));

  function toggleCat(id: string) {
    setOpenCats((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleSub(id: string) {
    setOpenSubs((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAllergenPanel(itemId: string) {
    setActiveAllergenItem((prev) => (prev === itemId ? null : itemId));
    setActiveWineItem(null);
  }
  function toggleWinePanel(itemId: string) {
    setActiveWineItem((prev) => (prev === itemId ? null : itemId));
    setActiveAllergenItem(null);
  }
  function addToCart(item: MenuItem) {
    setCart((prev) => ({ ...prev, [item.id]: { item, quantity: (prev[item.id]?.quantity ?? 0) + 1 } }));
  }
  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current || current.quantity <= 1) { const n = { ...prev }; delete n[itemId]; return n; }
      return { ...prev, [itemId]: { ...current, quantity: current.quantity - 1 } };
    });
  }

  const cartItems = Object.values(cart).filter((c) => c.quantity > 0);
  const totalItems = cartItems.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = cartItems.reduce((s, c) => s + c.quantity * parseFloat(c.item.price), 0);

  async function submitOrder() {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: params.tableId,
          items: cartItems.map((c) => ({ menuItemId: c.item.id, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Errore nell'invio"); return; }
      router.push(`/menu/${params.tableId}/ordine/${data.id}`);
    } catch {
      setError("Errore di connessione");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── loading / error states ─────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }
  if (tableIsFree) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-6 bg-stone-950 animate-fade-in">
        <UtensilsCrossed className="h-14 w-14 text-amber-400/50" />
        <p className="text-2xl font-semibold text-stone-200">Il tavolo risulta libero.</p>
        <p className="text-sm text-stone-500">Chiedi al personale di attivare il tavolo.</p>
      </div>
    );
  }
  if (error || !table) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-center px-6 bg-stone-950 animate-fade-in">
        <UtensilsCrossed className="h-12 w-12 text-stone-600" />
        <p className="font-semibold text-stone-200">Tavolo non disponibile</p>
        <p className="text-sm text-stone-500">{error}</p>
      </div>
    );
  }

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const activePeriod = nowMins < 14 * 60 + 30 ? "LUNCH" : nowMins >= 17 * 60 ? "DINNER" : "BETWEEN";

  function isPeriodVisible(mealPeriod: string | null | undefined): boolean {
    if (!mealPeriod || mealPeriod === "ALWAYS") return true;
    if (activePeriod === "LUNCH") return mealPeriod === "LUNCH";
    if (activePeriod === "DINNER") return mealPeriod === "DINNER";
    return false;
  }

  const featuredItems = categories
    .flatMap((c) => c.items)
    .filter((i) => i.available && i.featured && isPeriodVisible(i.mealPeriod));

  const visibleCats = categories.filter((c) =>
    c.items.some((i) => i.available && isPeriodVisible(i.mealPeriod))
  );

  if (visibleCats.length === 0 && featuredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-center px-6 bg-stone-950 animate-fade-in">
        <UtensilsCrossed className="h-12 w-12 text-stone-600" />
        <p className="font-semibold text-stone-200">Menu non ancora disponibile</p>
        <p className="text-sm text-stone-500">Chiedi al personale.</p>
      </div>
    );
  }

  const cartHasItems = orderingEnabled && totalItems > 0;

  /* ── Item card ──────────────────────────────────────── */
  function ItemCard({ item, delay }: { item: MenuItem; delay?: string }) {
    const qty = cart[item.id]?.quantity ?? 0;
    const itemAllergens = (item.allergenIds ?? []).map((id) => allergenMap[id]).filter(Boolean) as Allergen[];
    const numbered: Allergen[] = [], iconic: Allergen[] = [];
    for (const a of itemAllergens) (a.icon ? iconic : numbered).push(a);
    const allergenOpen = activeAllergenItem === item.id;
    const wineOpen = activeWineItem === item.id;
    const hasWines = item.winePairings?.length > 0;

    return (
      <div
        className="bg-stone-800/50 rounded-xl overflow-hidden animate-slide-in-up"
        style={delay ? { animationDelay: delay } : undefined}
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="w-0.5 self-stretch rounded-full bg-amber-500/40 shrink-0" />
          {showImages && item.imageUrl && (
            <button
              onClick={() => setLightboxUrl(item.imageUrl!)}
              className="shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-stone-700 transition-transform duration-200 hover:scale-105"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-stone-100 text-sm leading-snug">{item.name}</p>
              {numbered.length > 0 && (
                <button
                  onClick={() => toggleAllergenPanel(item.id)}
                  className={`shrink-0 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 transition-colors ${allergenOpen ? "bg-amber-500/20 text-amber-400" : "text-stone-500 hover:text-amber-400"}`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-semibold">{numbered.map((a) => a.number).join(",")}</span>
                </button>
              )}
              {iconic.map((a) => {
                const def = getAllergenIconDef(a.icon);
                if (!def) return null;
                return (
                  <button key={a.id} onClick={() => toggleAllergenPanel(item.id)} title={a.name} className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center bg-stone-700 border border-stone-600 hover:opacity-80 transition-opacity">
                    <def.Icon className={`h-2.5 w-2.5 ${def.colorClass}`} />
                  </button>
                );
              })}
              {hasWines && (
                <button
                  onClick={() => toggleWinePanel(item.id)}
                  title="Abbinamento vini"
                  className={`shrink-0 h-5 w-5 rounded-full flex items-center justify-center border transition-all ${wineOpen ? "bg-purple-500/20 border-purple-500/50 text-purple-400" : "bg-stone-700 border-stone-600 text-stone-400 hover:opacity-80"}`}
                >
                  <WineBottleIcon className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
            {item.description && <p className="text-xs text-stone-500 leading-snug mt-0.5 line-clamp-2">{item.description}</p>}
            <p className="text-amber-400 font-semibold text-sm mt-1">€{parseFloat(item.price).toFixed(2)}</p>
          </div>
          {orderingEnabled && (
            <div className="flex items-center gap-2 shrink-0">
              {qty > 0 ? (
                <>
                  <button onClick={() => removeFromCart(item.id)} className="h-7 w-7 rounded-full bg-stone-700 flex items-center justify-center hover:bg-stone-600 active:scale-90 transition-all">
                    <Minus className="h-3 w-3 text-stone-200" />
                  </button>
                  <span className="w-5 text-center font-bold text-stone-100 text-sm tabular-nums">{qty}</span>
                  <button onClick={() => addToCart(item)} className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 active:scale-90 transition-all">
                    <Plus className="h-3 w-3 text-stone-950" />
                  </button>
                </>
              ) : (
                <button onClick={() => addToCart(item)} className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center hover:bg-amber-400 active:scale-90 transition-all">
                  <Plus className="h-3.5 w-3.5 text-stone-950" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Allergen panel */}
        <div className={`grid transition-all duration-200 ${allergenOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden min-h-0">
            <div className="mx-3 mb-3 rounded-lg bg-stone-900 border border-amber-500/20 px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" /> Allergeni e indicatori
                </span>
                <button onClick={() => setActiveAllergenItem(null)}><X className="h-3 w-3 text-stone-500 hover:text-stone-300" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {itemAllergens.map((a) => {
                  const def = getAllergenIconDef(a.icon);
                  if (def) return (
                    <span key={a.id} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-stone-700 border-stone-600 ${def.colorClass}`}>
                      <def.Icon className={`h-3 w-3 shrink-0 ${def.colorClass}`} /><span>{a.name}</span>
                    </span>
                  );
                  return (
                    <span key={a.id} className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 text-xs text-amber-300">
                      <span className="font-bold">{a.number}</span><span className="text-amber-400/80">{a.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Wine pairing panel */}
        <div className={`grid transition-all duration-200 ${wineOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="overflow-hidden min-h-0">
            <div className="mx-3 mb-3 rounded-lg bg-stone-900 border border-purple-500/20 px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/80 flex items-center gap-1">
                  <WineBottleIcon className="h-2.5 w-2.5" /> Abbinamento vini
                </span>
                <button onClick={() => setActiveWineItem(null)}><X className="h-3 w-3 text-stone-500 hover:text-stone-300" /></button>
              </div>
              <div className="flex flex-col gap-1.5">
                {(item.winePairings ?? []).map((wine) => (
                  <div key={wine.id} className="flex items-center gap-2 bg-stone-800/60 rounded-lg px-2.5 py-1.5">
                    <WineBottleIcon className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <span className="flex-1 text-xs text-stone-200">{wine.name}</span>
                    <span className="text-xs text-amber-400 font-semibold tabular-nums">€{Number(wine.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── main page ──────────────────────────────────────── */

  return (
    <div className={`min-h-screen bg-stone-950 ${cartHasItems ? "pb-28" : "pb-10"}`}>

      {/* Hero header */}
      <div className="relative overflow-hidden animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/60 via-stone-900 to-stone-950" />
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-amber-500/10 blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-36 h-36 rounded-full bg-amber-600/8 blur-2xl" />
        <div className="relative px-5 pt-8 pb-8 max-w-lg mx-auto">
          {(restaurantLogo || restaurantName) && (
            <div className="flex items-center gap-3 mb-5">
              {restaurantLogo ? (
                <div className="relative h-9 w-28 shrink-0">
                  <Image src={restaurantLogo} alt={restaurantName || "Logo"} fill className="object-contain object-left" priority />
                </div>
              ) : (
                <>
                  <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-stone-950" />
                  </div>
                  <span className="text-white font-semibold text-base leading-tight">{restaurantName}</span>
                </>
              )}
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {!restaurantLogo && !restaurantName && (
                  <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-stone-950" />
                  </div>
                )}
                <span className="text-amber-400 text-xs font-semibold uppercase tracking-widest">{table.room.name}</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Tavolo {table.name}</h1>
              <p className="text-stone-400 text-sm mt-1">
                {orderingEnabled ? "Sfoglia il menu e ordina direttamente dal tavolo" : "Sfoglia il menu — chiedi al personale per ordinare"}
              </p>
            </div>
            {orderingEnabled && totalItems > 0 && (
              <div className="shrink-0 flex flex-col items-center bg-amber-500 rounded-2xl px-3 py-2 min-w-[52px] animate-fade-in-scale">
                <ShoppingCart className="h-4 w-4 text-stone-950" />
                <span className="text-stone-950 font-bold text-lg leading-none mt-0.5">{totalItems}</span>
              </div>
            )}
            {!orderingEnabled && (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider bg-stone-800 text-stone-400 rounded-full px-3 py-1.5 mt-1">Solo menu</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-6">
            <div className="h-px flex-1 bg-gradient-to-r from-amber-500/50 to-transparent" />
            <span className="text-amber-500/70 text-xs">✦</span>
            <div className="h-px flex-1 bg-gradient-to-l from-amber-500/50 to-transparent" />
          </div>
        </div>
      </div>

      {/* Featured section */}
      {featuredItems.length > 0 && (
        <div className="max-w-lg mx-auto px-4 mt-4 animate-slide-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="rounded-2xl overflow-hidden border border-amber-500/40 bg-stone-900">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20">
              <svg className="h-4 w-4 fill-amber-400 text-amber-400" style={{ animation: "float-drift 3s ease-in-out infinite" }} viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="font-semibold text-amber-400 text-sm">In evidenza</span>
            </div>
            <div className="px-3 pb-3 pt-1 space-y-2">
              {featuredItems.map((item, idx) => (
                <ItemCard key={`featured-${item.id}`} item={item} delay={`${0.15 + idx * 0.07}s`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category accordion */}
      <div className="max-w-lg mx-auto px-4 mt-4 space-y-2">
        {visibleCats.map((cat, catIdx) => {
          const isOpen = openCats.has(cat.id);
          const availableItems = cat.items.filter((i) => i.available && isPeriodVisible(i.mealPeriod));
          const catCartQty = availableItems.reduce((s, i) => s + (cart[i.id]?.quantity ?? 0), 0);

          // Group items by subcategory
          const subs = cat.subcategories ?? [];
          const itemsBySubcat: Record<string, MenuItem[]> = {};
          const noSubItems: MenuItem[] = [];
          for (const item of availableItems) {
            if (item.subcategoryId) {
              if (!itemsBySubcat[item.subcategoryId]) itemsBySubcat[item.subcategoryId] = [];
              itemsBySubcat[item.subcategoryId].push(item);
            } else {
              noSubItems.push(item);
            }
          }
          const visibleSubs = subs.filter((s) => itemsBySubcat[s.id]?.length > 0);
          const hasSubs = visibleSubs.length > 0;

          return (
            <div
              key={cat.id}
              className="rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 animate-slide-in-up"
              style={{ animationDelay: `${0.2 + catIdx * 0.06}s` }}
            >
              {/* Category header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-stone-800/60 active:bg-stone-800"
                onClick={() => toggleCat(cat.id)}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-stone-100 text-base">{cat.name}</span>
                  <span className="text-stone-500 text-xs ml-2">
                    {availableItems.length} {availableItems.length === 1 ? "piatto" : "piatti"}
                  </span>
                </div>
                {orderingEnabled && catCartQty > 0 && (
                  <span className="shrink-0 bg-amber-500 text-stone-950 text-xs font-bold rounded-full px-2 py-0.5 animate-fade-in-scale">{catCartQty}</span>
                )}
                <ChevronDown className={`shrink-0 h-4 w-4 text-stone-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Accordion body */}
              <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden min-h-0">
                  <div className="px-3 pb-3 pt-1 space-y-3 border-t border-stone-800">

                    {/* Subcategories */}
                    {hasSubs && visibleSubs.map((sub, subIdx) => {
                      const subItems = itemsBySubcat[sub.id] ?? [];
                      const isSubOpen = openSubs.has(sub.id);
                      const subCartQty = subItems.reduce((s, i) => s + (cart[i.id]?.quantity ?? 0), 0);
                      return (
                        <div key={sub.id} className="rounded-xl overflow-hidden border border-stone-700/60">
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left bg-stone-800/40 hover:bg-stone-800/70 transition-colors"
                            onClick={() => toggleSub(sub.id)}
                            style={{ animationDelay: `${subIdx * 0.04}s` }}
                          >
                            <span className="flex-1 text-sm font-semibold text-stone-300">{sub.name}</span>
                            {orderingEnabled && subCartQty > 0 && (
                              <span className="shrink-0 bg-amber-500 text-stone-950 text-xs font-bold rounded-full px-2 py-0.5">{subCartQty}</span>
                            )}
                            <ChevronDown className={`shrink-0 h-3.5 w-3.5 text-stone-500 transition-transform duration-200 ${isSubOpen ? "rotate-180" : ""}`} />
                          </button>
                          <div className={`grid transition-all duration-200 ${isSubOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                            <div className="overflow-hidden min-h-0">
                              <div className="px-2 pb-2 pt-1.5 space-y-2">
                                {subItems.map((item, itemIdx) => (
                                  <ItemCard
                                    key={item.id}
                                    item={item}
                                    delay={isSubOpen ? `${itemIdx * 0.04}s` : undefined}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Items without subcategory */}
                    {noSubItems.map((item, itemIdx) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        delay={isOpen ? `${itemIdx * 0.04}s` : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Powered by footer */}
      <div className="max-w-lg mx-auto mt-6 flex flex-col items-center gap-1.5 py-3 px-4 border-t border-white/10">
        <div className="relative h-40 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/untavoloperlogo.svg" alt="Un Tavolo Per" className="max-h-full max-w-full object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        </div>
        <p className="text-xs text-white/40">
          Powered by{" "}
          <a href="mailto:info@tekdata.it" className="hover:underline text-white/60">Tekdata</a>
          {" "}—{" "}
          <a href="mailto:info@tekdata.it" className="hover:underline text-white/60">info@tekdata.it</a>
        </p>
      </div>

      {/* Cart footer */}
      {cartHasItems && (
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-5 pt-3 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent animate-slide-in-up">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 max-h-24 overflow-y-auto space-y-1">
              {cartItems.map((c) => (
                <div key={c.item.id} className="flex justify-between text-xs text-stone-400">
                  <span className="truncate mr-2">{c.quantity}× {c.item.name}</span>
                  <span className="shrink-0 tabular-nums">€{(c.quantity * parseFloat(c.item.price)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-base h-12 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Invia ordine · €{totalPrice.toFixed(2)}
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4 animate-fade-in" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" onClick={() => setLightboxUrl(null)}>
            <X className="h-5 w-5 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl animate-fade-in-scale" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
