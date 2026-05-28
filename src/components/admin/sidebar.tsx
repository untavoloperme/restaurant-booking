"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarCheck,
  Map,
  PenTool,
  Clock,
  XCircle,
  Users,
  UtensilsCrossed,
  Menu,
  X,
  ChefHat,
  BarChart2,
  Settings,
  AlertTriangle,
  PhoneMissed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin",                 label: "Dashboard",        icon: LayoutDashboard, roles: ["ADMIN", "STAFF"] },
  { href: "/admin/reservations",    label: "Prenotazioni",     icon: CalendarCheck,   roles: ["ADMIN", "STAFF"] },
  { href: "/admin/floor",           label: "Planimetria Live", icon: Map,             roles: ["ADMIN", "STAFF", "KITCHEN"] },
  { href: "/admin/kitchen",         label: "Cucina",           icon: ChefHat,         roles: ["ADMIN", "KITCHEN"] },
  { href: "/admin/stats",            label: "Statistiche",      icon: BarChart2,       roles: ["ADMIN"] },
  { href: "/admin/layout-editor",   label: "Editor Tavoli",    icon: PenTool,         roles: ["ADMIN"] },
  { href: "/admin/settings",            label: "Impostazioni",  icon: Settings,       roles: ["ADMIN"] },
  { href: "/admin/settings/hours",      label: "Orari",         icon: Clock,          roles: ["ADMIN"] },
  { href: "/admin/settings/closures",   label: "Chiusure",      icon: XCircle,        roles: ["ADMIN"] },
  { href: "/admin/settings/allergens",  label: "Allergeni",     icon: AlertTriangle,  roles: ["ADMIN"] },
  { href: "/admin/menu",            label: "Menu",             icon: UtensilsCrossed, roles: ["ADMIN"] },
  { href: "/admin/users",           label: "Utenti",           icon: Users,           roles: ["ADMIN"] },
  { href: "/admin/asterisk",        label: "Chiamate perse",   icon: PhoneMissed,     roles: ["ADMIN", "STAFF"] },
];

function dispatchNavStart() {
  window.dispatchEvent(new Event("admin-nav-start"));
}

function SidebarNav({ modules, onNavigate }: { modules: Record<string, boolean>; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";

  const visibleItems = navItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    const moduleKey = item.href.replace("/admin/", "module.").replace(/\/.*/, "");
    if (moduleKey in modules && modules[moduleKey] === false) return false;
    return true;
  });

  return (
    <nav className="flex flex-col gap-1 p-4 pt-6">
      <div className="flex items-center gap-2 px-3 mb-6">
        <UtensilsCrossed className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">Gestionale</span>
      </div>
      {visibleItems.map((item) => {
        const active =
          item.href === "/admin" || item.href === "/admin/settings"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => { dispatchNavStart(); onNavigate?.(); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminSidebar({ modules }: { modules: Record<string, boolean> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex flex-col w-[var(--sidebar-width)] border-r bg-white shrink-0 h-full">
        <div className="flex-1 overflow-y-auto">
          <SidebarNav modules={modules} />
        </div>
        <div className="pt-3 pb-2 border-t">
          <div className="h-28 w-full flex items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/untavoloperlogo.svg" alt="Un Tavolo Per" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-3 left-3 z-50">
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[var(--sidebar-width)] bg-white shadow-xl flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <SidebarNav modules={modules} onNavigate={() => setOpen(false)} />
            </div>
            <div className="px-3 py-3 border-t">
              <div className="h-24 w-full flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/untavoloperlogo.svg" alt="Un Tavolo Per" className="max-h-full max-w-full object-contain" />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
