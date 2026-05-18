"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  active: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [createDialog, setCreateDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  async function createUser() {
    if (!form.name || !form.email || !form.password) {
      toast({ title: "Compila tutti i campi", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: data.error ?? "Errore", variant: "destructive" });
      return;
    }
    setUsers((prev) => [...prev, data]);
    setCreateDialog(false);
    setForm({ name: "", email: "", password: "", role: "STAFF" });
    toast({ title: "Utente creato" });
  }

  async function toggleActive(user: User) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    const data = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data : u)));
  }

  async function changeRole(userId: string, role: "ADMIN" | "STAFF") {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
  }

  async function resetPassword() {
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Password min. 8 caratteri", variant: "destructive" });
      return;
    }
    const res = await fetch(`/api/users/${resetDialog.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      toast({ title: "Errore nel reset", variant: "destructive" });
      return;
    }
    setResetDialog({ open: false, userId: null });
    setNewPassword("");
    toast({ title: "Password aggiornata" });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestione Utenti</h1>
        <Button onClick={() => setCreateDialog(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Nuovo utente
        </Button>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="bg-white border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.name}</span>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
                {!user.active && <Badge variant="destructive">Disabilitato</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={user.role}
                onValueChange={(v) => changeRole(user.id, v as "ADMIN" | "STAFF")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Switch checked={user.active} onCheckedChange={() => toggleActive(user)} />
                <span className="text-sm text-muted-foreground">{user.active ? "Attivo" : "Disab."}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetDialog({ open: true, userId: user.id })}
              >
                Reset pwd
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Crea utente */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo utente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Annulla</Button>
            <Button onClick={createUser}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={resetDialog.open} onOpenChange={(o) => setResetDialog({ open: o, userId: null })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nuova password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caratteri"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog({ open: false, userId: null })}>Annulla</Button>
            <Button onClick={resetPassword}>Aggiorna</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
