"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  user: { name: string; email: string; role: string };
}

export default function AdminTopbar({ user }: TopbarProps) {
  return (
    <header className="h-14 border-b bg-white flex items-center justify-end px-4 md:px-6 gap-3 shrink-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user.name}</span>
        <span className="text-xs bg-secondary rounded px-1.5 py-0.5">{user.role}</span>
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
