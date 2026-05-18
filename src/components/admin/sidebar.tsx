"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/admin/reservations", label: "Prenotazioni", icon: CalendarCheck, adminOnly: false },
  { href: "/admin/floor", label: "Planimetria Live", icon: Map, adminOnly: false },
  { href: "/admin/layout-editor", label: "Editor Tavoli", icon: PenTool, adminOnly: true },
  { href: "/admin/settings/hours", label: "Orari", icon: Clock, adminOnly: true },
  { href: "/admin/settings/closures", label: "Chiusure", icon: XCircle, adminOnly: true },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, adminOnly: true },
  { href: "/admin/users", label: "Utenti", icon: Users, adminOnly: true },
];

export default function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = role === "ADMIN";

  const Sidebar = () => (
    <nav className="flex flex-col gap-1 p-4 pt-6">
      <div className="flex items-center gap-2 px-3 mb-6">
        <UtensilsCrossed className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">Gestionale</span>
      </div>
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
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

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[var(--sidebar-width)] border-r bg-white shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[var(--sidebar-width)] bg-white shadow-xl">
            <Sidebar />
          </aside>
        </div>
      )}
    </>
  );
}
