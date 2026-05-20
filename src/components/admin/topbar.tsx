"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/version";

export default function AdminTopbar() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="h-14 border-b bg-white flex items-center justify-end px-4 md:px-6 gap-3 shrink-0">
      <span className="text-xs text-muted-foreground/50 hidden md:block mr-auto">v{APP_VERSION}</span>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user?.name}</span>
        <span className="text-xs bg-secondary rounded px-1.5 py-0.5">{user?.role}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-muted-foreground"
      >
        <LogOut className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Esci</span>
      </Button>
    </header>
  );
}
