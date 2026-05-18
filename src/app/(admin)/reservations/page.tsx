"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useTick, formatDuration } from "@/hooks/use-tick";
import { UserCheck, LogOut, ArrowRightLeft, Plus, RefreshCw, Phone, Users, Clock } from "lucide-react";

interface Table {
  id: string;
  name: string;
  capacity: number;
  room: { id: string; name: string };
}

interface Reservation {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  status: string;
  arrivedAt: string | null;
  checkedOutAt: string | null;
  notes: string | null;
  insertionSeq: number;
  source: string;
  table: Table | null;
}

const STATUS_META: Record<string, { label: string; variant: "default" | "warning" | "success" | "destructive" | "secondary" | "outline" }> = {
  PENDING: { label: "In attesa", variant: "warning" },
  ARRIVED: { label: "Arrivati", variant: "success" },
  CHECKED_OUT: { label: "Usciti", variant: "secondary" },
  CANCELLED: { label: "Cancellata", variant: "destructive" },
  NO_SHOW: { label: "No show", variant: "outline" },
};

function LiveTimer({ arrivedAt }: { arrivedAt: string }) {
  useTick(1000);
  const ms = Date.now() - new Date(arrivedAt).getTime();
  return <span className="font-mono text-green-600 font-medium">{formatDuration(ms)}</span>;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; reservation: Reservation | null }>({ open: false, reservation: null });
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: dateFilter });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();
      setReservations(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // SSE per aggiornamenti real-time
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("reservation_created", fetchReservations);
    es.addEventListener("reservation_updated", fetchReservations);
    es.addEventListener("reservation_moved", fetchReservations);
    return () => es.close();
  }, [fetchReservations]);

  async function arrive(id: string) {
    await fetch(`/api/reservations/${id}/arrive`, { method: "POST" });
    toast({ title: "Cliente segnato come arrivato", variant: "default" });
    fetchReservations();
  }

  async function checkout(id: string) {
    await fetch(`/api/reservations/${id}/checkout`, { method: "POST" });
    toast({ title: "Checkout effettuato", variant: "default" });
    fetchReservations();
  }

  async function openMoveDialog(res: Reservation) {
    setMoveDialog({ open: true, reservation: res });
    setSelectedTableId("");
    const tablesRes = await fetch("/api/tables");
    const tables: Table[] = await tablesRes.json();
    setAvailableTables(tables.filter((t) => t.id !== res.table?.id));
  }

  async function moveTable() {
    if (!moveDialog.reservation || !selectedTableId) return;
    const res = await fetch(`/api/reservations/${moveDialog.reservation.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: selectedTableId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast({ title: data.error ?? "Errore", variant: "destructive" });
      return;
    }
    toast({ title: "Tavolo spostato" });
    setMoveDialog({ open: false, reservation: null });
    fetchReservations();
  }

  async function cancel(id: string) {
    if (!confirm("Cancellare questa prenotazione?")) return;
    await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    toast({ title: "Prenotazione cancellata" });
    fetchReservations();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Prenotazioni</h1>
        <Button size="sm" variant="outline" onClick={fetchReservations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Aggiorna
        </Button>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
        />
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tutti gli stati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="PENDING">In attesa</SelectItem>
            <SelectItem value="ARRIVED">Arrivati</SelectItem>
            <SelectItem value="CHECKED_OUT">Usciti</SelectItem>
            <SelectItem value="CANCELLED">Cancellate</SelectItem>
            <SelectItem value="NO_SHOW">No show</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">
          {reservations.length} prenotazioni
        </span>
      </div>

      {/* Lista */}
      {reservations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nessuna prenotazione trovata per i filtri selezionati.
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r, idx) => {
            const sm = STATUS_META[r.status] ?? { label: r.status, variant: "outline" as const };
            const dateLabel = format(parseISO(r.date.split("T")[0]), "EEE d MMM", { locale: it });

            return (
              <div
                key={r.id}
                className="bg-white border rounded-lg p-4 space-y-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                    <span className="font-semibold">{r.customerName}</span>
                    <Badge variant={sm.variant}>{sm.label}</Badge>
                    {r.source === "ADMIN" && (
                      <Badge variant="outline" className="text-xs">Admin</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{r.code}</span>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {dateLabel} · {r.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {r.partySize} pers.
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.phone}
                  </span>
                  {r.table && (
                    <span>🪑 {r.table.name} — {r.table.room.name}</span>
                  )}
                </div>

                {/* Timer per ARRIVED */}
                {r.status === "ARRIVED" && r.arrivedAt && (
                  <div className="text-sm flex items-center gap-1">
                    ⏱️ Al tavolo da: <LiveTimer arrivedAt={r.arrivedAt} />
                  </div>
                )}

                {/* Durata per CHECKED_OUT */}
                {r.status === "CHECKED_OUT" && r.arrivedAt && r.checkedOutAt && (
                  <p className="text-sm text-muted-foreground">
                    ⏱️ Durata seduta:{" "}
                    {formatDuration(new Date(r.checkedOutAt).getTime() - new Date(r.arrivedAt).getTime())}
                  </p>
                )}

                {r.notes && <p className="text-sm text-muted-foreground italic">📝 {r.notes}</p>}

                {/* Azioni */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.status === "PENDING" && (
                    <Button size="sm" variant="outline" onClick={() => arrive(r.id)}>
                      <UserCheck className="h-3 w-3 mr-1" /> Arrivati
                    </Button>
                  )}
                  {r.status === "ARRIVED" && (
                    <Button size="sm" variant="outline" onClick={() => checkout(r.id)}>
                      <LogOut className="h-3 w-3 mr-1" /> Checkout
                    </Button>
                  )}
                  {["PENDING", "ARRIVED"].includes(r.status) && (
                    <Button size="sm" variant="outline" onClick={() => openMoveDialog(r)}>
                      <ArrowRightLeft className="h-3 w-3 mr-1" /> Sposta tavolo
                    </Button>
                  )}
                  {["PENDING"].includes(r.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => cancel(r.id)}
                    >
                      Cancella
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Move dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(o) => setMoveDialog({ open: o, reservation: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sposta tavolo — {moveDialog.reservation?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli tavolo di destinazione" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.room.name}) — {t.capacity} posti
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ open: false, reservation: null })}>
              Annulla
            </Button>
            <Button onClick={moveTable} disabled={!selectedTableId}>
              Sposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
