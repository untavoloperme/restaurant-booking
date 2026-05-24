"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useTick, formatDuration } from "@/hooks/use-tick";
import { UserCheck, LogOut, ArrowRightLeft, Plus, RefreshCw, Phone, Users, Clock, Loader2, Link2, Search } from "lucide-react";

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

interface AvailableSlot {
  time: string;
  shift: number;
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
  const [statusFilter, setStatusFilter] = useState("PENDING,ARRIVED");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; reservation: Reservation | null }>({ open: false, reservation: null });
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");

  // Nuova prenotazione manuale
  const [newDialog, setNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({
    customerName: "",
    phone: "",
    partySize: "2",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "",
    notes: "",
  });
  const [newSlots, setNewSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  // Tavoli uniti (per gruppi > 8)
  const [roomTables, setRoomTables] = useState<Table[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [linkedTableIds, setLinkedTableIds] = useState<string[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);

  const isLinkedMode = Number(newForm.partySize) > 8;

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
    setAvailableTables(tables.filter((t) => t.id !== res.table?.id && t.capacity >= res.partySize));
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

  async function loadRooms() {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      if (Array.isArray(data)) {
        setRooms(data.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
      }
    } catch { /* ignore */ }
  }

  async function loadRoomTables(roomId: string) {
    if (!roomId) { setRoomTables([]); return; }
    try {
      const res = await fetch(`/api/tables?roomId=${roomId}`);
      const data = await res.json();
      setRoomTables(Array.isArray(data) ? data : []);
    } catch { setRoomTables([]); }
  }

  function toggleLinkedTable(tableId: string) {
    setLinkedTableIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  }

  async function loadSlots(date: string, partySize: string) {
    if (!date || !partySize || Number(partySize) < 1) { setNewSlots([]); return; }
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/public/availability?date=${date}&partySize=${partySize}`);
      const data = await res.json();
      setNewSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch {
      setNewSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function updateNewForm(field: string, value: string) {
    const updated = { ...newForm, [field]: value };
    if (field === "date" || field === "partySize") {
      // Data o persone cambiate: azzera orario e ricarica slot
      setNewForm({ ...updated, time: "" });
      loadSlots(
        field === "date" ? value : newForm.date,
        field === "partySize" ? value : newForm.partySize
      );
      if (field === "partySize") {
        setLinkedTableIds([]);
        setSelectedRoomId("");
        setRoomTables([]);
      }
    } else {
      // Nome, telefono, note, orario: aggiorna solo il campo toccato
      setNewForm(updated);
    }
  }

  function openNewDialog() {
    setNewForm({
      customerName: "",
      phone: "",
      partySize: "2",
      date: dateFilter,
      time: "",
      notes: "",
    });
    setNewSlots([]);
    setLinkedTableIds([]);
    setSelectedRoomId("");
    setRoomTables([]);
    setNewError(null);
    setNewDialog(true);
    loadSlots(dateFilter, "2");
    loadRooms();
  }

  async function submitNewReservation() {
    const { customerName, phone, partySize, date, time, notes } = newForm;
    if (!customerName || !phone || !date || !time) {
      toast({ title: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    if (isLinkedMode && linkedTableIds.length < 2) {
      toast({ title: "Seleziona almeno 2 tavoli da unire", variant: "destructive" });
      return;
    }

    const primaryTableId = isLinkedMode ? linkedTableIds[0] : undefined;
    const extraIds = isLinkedMode ? linkedTableIds.slice(1) : [];

    setNewSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          partySize: Number(partySize),
          date,
          time,
          notes: notes || undefined,
          source: "ADMIN",
          ...(isLinkedMode ? { tableId: primaryTableId, extraTableIds: extraIds } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewError(data.error ?? "Errore sconosciuto");
        return;
      }
      setNewError(null);
      toast({ title: `Prenotazione creata — ${data.code}` });
      setNewDialog(false);
      if (date === dateFilter) {
        fetchReservations();
      } else {
        setDateFilter(date);
      }
    } catch {
      toast({ title: "Errore di connessione", variant: "destructive" });
    } finally {
      setNewSubmitting(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm("Cancellare questa prenotazione?")) return;
    await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    toast({ title: "Prenotazione cancellata" });
    fetchReservations();
  }

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? reservations.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.code.toLowerCase().includes(q)
      )
    : reservations;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Prenotazioni</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-1" /> Nuova prenotazione
          </Button>
          <Button size="sm" variant="outline" onClick={fetchReservations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Aggiorna
          </Button>
        </div>
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tutti gli stati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING,ARRIVED">In attesa e arrivati</SelectItem>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="PENDING">Solo in attesa</SelectItem>
            <SelectItem value="ARRIVED">Solo arrivati</SelectItem>
            <SelectItem value="CHECKED_OUT">Usciti</SelectItem>
            <SelectItem value="CANCELLED">Cancellate</SelectItem>
            <SelectItem value="NO_SHOW">No show</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cerca cliente, telefono, codice…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-64"
          />
        </div>
      </div>

      {/* Statistiche giornaliere */}
      {filtered.length > 0 && (() => {
        const active = filtered.filter((r) => !["CANCELLED", "NO_SHOW"].includes(r.status));
        const totalPeople = active.reduce((s, r) => s + r.partySize, 0);
        const byStatus = Object.entries(STATUS_META).map(([key, meta]) => ({
          key,
          meta,
          count: filtered.filter((r) => r.status === key).length,
        })).filter((s) => s.count > 0);

        return (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-slate-50 border rounded-lg text-sm">
            <span className="font-semibold text-slate-700">{filtered.length} prenotazioni</span>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1 text-slate-700">
              <Users className="h-3.5 w-3.5" />
              <strong>{totalPeople}</strong> persone
            </span>
            <span className="text-slate-400">·</span>
            <span className="flex flex-wrap gap-1.5">
              {byStatus.map(({ key, meta, count }) => (
                <Badge key={key} variant={meta.variant} className="text-xs">
                  {count} {meta.label.toLowerCase()}
                </Badge>
              ))}
            </span>
          </div>
        );
      })()}

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nessuna prenotazione trovata per i filtri selezionati.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, idx) => {
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

      {/* Dialog nuova prenotazione manuale */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova prenotazione</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={newForm.date}
                  onChange={(e) => updateNewForm("date", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Persone *</Label>
                <Input
                  type="number"
                  min={1}
                  value={newForm.partySize}
                  onChange={(e) => updateNewForm("partySize", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Orario *</Label>
              {!isLinkedMode && slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Caricamento orari…
                </div>
              ) : !isLinkedMode && newSlots.length > 0 ? (
                <Select value={newForm.time} onValueChange={(v) => updateNewForm("time", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli orario" />
                  </SelectTrigger>
                  <SelectContent>
                    {newSlots.map((s) => (
                      <SelectItem key={`${s.time}-${s.shift}`} value={s.time}>
                        {s.time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="time"
                  value={newForm.time}
                  onChange={(e) => updateNewForm("time", e.target.value)}
                  placeholder="HH:MM"
                />
              )}
              {!isLinkedMode && newSlots.length === 0 && !slotsLoading && newForm.date && (
                <p className="text-xs text-muted-foreground">Nessuno slot automatico — inserisci l&apos;orario manualmente.</p>
              )}
            </div>

            {/* Selezione tavoli uniti — solo quando partySize > 8 */}
            {isLinkedMode && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <Link2 className="h-4 w-4" />
                  Unisci tavoli ({Number(newForm.partySize)} persone)
                </div>
                <Select
                  value={selectedRoomId}
                  onValueChange={(v) => {
                    setSelectedRoomId(v);
                    setLinkedTableIds([]);
                    loadRoomTables(v);
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Scegli sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {roomTables.length > 0 && (
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {roomTables.map((t) => {
                      const checked = linkedTableIds.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                            checked ? "bg-amber-200 text-amber-900 font-medium" : "hover:bg-amber-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLinkedTable(t.id)}
                            className="accent-amber-600"
                          />
                          <span>Tavolo {t.name}</span>
                          <span className="ml-auto text-xs text-amber-700">{t.capacity} posti</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {linkedTableIds.length > 0 && (
                  <p className="text-xs font-medium text-amber-800">
                    Coperti selezionati:{" "}
                    {roomTables
                      .filter((t) => linkedTableIds.includes(t.id))
                      .reduce((s, t) => s + t.capacity, 0)}{" "}
                    / {newForm.partySize} richiesti
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label>Nome cliente *</Label>
              <Input
                value={newForm.customerName}
                onChange={(e) => updateNewForm("customerName", e.target.value)}
                placeholder="Mario Rossi"
              />
            </div>

            <div className="space-y-1">
              <Label>Telefono *</Label>
              <Input
                value={newForm.phone}
                onChange={(e) => updateNewForm("phone", e.target.value)}
                placeholder="333 1234567"
              />
            </div>

            <div className="space-y-1">
              <Label>Note</Label>
              <Input
                value={newForm.notes}
                onChange={(e) => updateNewForm("notes", e.target.value)}
                placeholder="Allergie, occasioni speciali…"
              />
            </div>
          </div>

          {newError && (
            <div className="rounded border border-red-300 bg-red-50 p-2">
              <p className="text-xs font-semibold text-red-700 mb-1">Errore dal server:</p>
              <pre className="text-xs text-red-800 whitespace-pre-wrap break-all select-text font-mono">
                {newError}
              </pre>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={submitNewReservation}
              disabled={
                newSubmitting ||
                !newForm.customerName ||
                !newForm.phone ||
                !newForm.time ||
                (isLinkedMode && linkedTableIds.length < 2)
              }
            >
              {newSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crea prenotazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
