import { Snowflake, Flame, Leaf, Fish, Wheat, Nut, Milk, Egg, type LucideIcon } from "lucide-react";

export const ALLERGEN_ICON_KEYS = [
  "Snowflake", "Flame", "Leaf", "Fish", "Wheat", "Nut", "Milk", "Egg",
] as const;

export type AllergenIconKey = typeof ALLERGEN_ICON_KEYS[number];

export const ALLERGEN_ICONS: {
  key: AllergenIconKey;
  label: string;
  Icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}[] = [
  { key: "Snowflake", label: "Surgelato", Icon: Snowflake, colorClass: "text-blue-400", bgClass: "bg-blue-400/20", borderClass: "border-blue-400/30" },
  { key: "Flame",     label: "Piccante",  Icon: Flame,     colorClass: "text-red-400",  bgClass: "bg-red-400/20",  borderClass: "border-red-400/30" },
  { key: "Leaf",      label: "Vegano",    Icon: Leaf,      colorClass: "text-green-400",bgClass: "bg-green-400/20",borderClass: "border-green-400/30" },
  { key: "Fish",      label: "Pesce",     Icon: Fish,      colorClass: "text-cyan-400", bgClass: "bg-cyan-400/20", borderClass: "border-cyan-400/30" },
  { key: "Wheat",     label: "Glutine",   Icon: Wheat,     colorClass: "text-amber-400",bgClass: "bg-amber-400/20",borderClass: "border-amber-400/30" },
  { key: "Nut",       label: "Frutta s.", Icon: Nut,       colorClass: "text-orange-400",bgClass: "bg-orange-400/20",borderClass: "border-orange-400/30" },
  { key: "Milk",      label: "Latte",     Icon: Milk,      colorClass: "text-slate-300", bgClass: "bg-slate-400/20", borderClass: "border-slate-400/30" },
  { key: "Egg",       label: "Uova",      Icon: Egg,       colorClass: "text-yellow-400",bgClass: "bg-yellow-400/20",borderClass: "border-yellow-400/30" },
];

export function getAllergenIconDef(key: string | null | undefined) {
  if (!key) return null;
  return ALLERGEN_ICONS.find((i) => i.key === key) ?? null;
}
