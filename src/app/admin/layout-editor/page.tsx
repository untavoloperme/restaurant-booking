"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, PlusCircle, Edit2, QrCode, Printer, Check, PowerOff, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import dynamic from "next/dynamic";
import type { TableData } from "@/components/layout-editor/table-canvas";

const TableCanvas = dynamic(() => import("@/components/layout-editor/table-canvas"), { ssr: false });
const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })), { ssr: false });

interface Room {
  id: string;
  name: string;
  active: boolean;
  width: number;
  height: number;
  tables: TableData[];
}

type Shape = "round" | "square" | "rect";

const QUICK_CAPACITIES = [2, 4, 6, 8, 10] as const;

function defaultSize(capacity: number): { w: number; h: number } {
  if (capacity <= 4) return { w: 80, h: 80 };
  if (capacity <= 6) return { w: 90, h: 90 };
  return { w: Math.min(200, 100 + (capacity - 8) * 10), h: 80 };
}

export default function LayoutEditorPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newRoomDialog, setNewRoomDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const [tableDialog, setTableDialog] = useState<{ open: boolean; tableId: string | null }>({
    open: false,
    tableId: null,
  });
  const [tableForm, setTableForm] = useState({
    name: "",
    capacity: "4" as string,
    shape: "round" as Shape,
  });

  const [qrDialog, setQrDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState(false);
  const [renameName, setRenameName] = useState("");

  useEffect(() => {
    fetch("/api/rooms")
      .then((r) => r.json())
      .then((data: Room[]) => {
        setRooms(data);
        if (data.length > 0) setActiveRoomId(data[0].id);
      });
  }, []);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;

  const updateLocalTables = (roomId: string, updater: (tables: TableData[]) => TableData[]) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, tables: updater(r.tables) } : r))
    );
  };

  const handleTableMove = useCallback(
    (id: string, x: number, y: number) => {
      if (!activeRoomId) return;
      updateLocalTables(activeRoomId, (tables) =>
        tables.map((t) => (t.id === id ? { ...t, x, y } : t))
      );
    },
    [activeRoomId]
  );

  const handleTableChange = useCallback(
    (id: string, data: Partial<import("@/components/layout-editor/table-canvas").TableData>) => {
      if (!activeRoomId) return;
      updateLocalTables(activeRoomId, (tables) =>
        tables.map((t) => (t.id === id ? { ...t, ...data } : t))
      );
    },
    [activeRoomId]
  );

  async function createRoom() {
    if (!newRoomName.trim()) return;
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoomName.trim() }),
    });
    if (!res.ok) {
      toast({ title: "Errore", description: "Nome già esistente", variant: "destructive" });
      return;
    }
    const room: Room = await res.json();
    room.tables = [];
    setRooms((prev) => [...prev, room]);
    setActiveRoomId(room.id);
    setNewRoomDialog(false);
    setNewRoomName("");
  }

  async function deleteRoom(roomId: string) {
    if (!confirm("Eliminare questa sala e tutti i suoi tavoli?")) return;
    await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setActiveRoomId(rooms.find((r) => r.id !== roomId)?.id ?? null);
  }

  async function patchRoom(roomId: string, data: Partial<Pick<Room, "name" | "active">>) {
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast({ title: "Errore aggiornamento sala", variant: "destructive" });
      return;
    }
    const updated: Room = await res.json();
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, ...updated, tables: r.tables } : r)));
  }

  function openRenameDialog() {
    if (!activeRoom) return;
    setRenameName(activeRoom.name);
    setRenameDialog(true);
  }

  async function saveRename() {
    if (!activeRoomId || !renameName.trim()) return;
    await patchRoom(activeRoomId, { name: renameName.trim() });
    setRenameDialog(false);
  }

  async function toggleRoomActive(roomId: string, current: boolean) {
    await patchRoom(roomId, { active: !current });
  }

  function openAddTable(capacity: number, shape: Shape) {
    setTableDialog({ open: true, tableId: null });
    setTableForm({ name: "", capacity: String(capacity), shape });
  }

  function openEditTable(tableId: string) {
    const table = activeRoom?.tables.find((t) => t.id === tableId);
    if (!table) return;
    setTableDialog({ open: true, tableId });
    setTableForm({ name: table.name, capacity: String(table.capacity), shape: table.shape });
  }

  function applyTableEdit() {
    if (!activeRoomId || !tableForm.name.trim()) {
      toast({ title: "Errore", description: "Inserisci un nome/numero per il tavolo", variant: "destructive" });
      return;
    }
    const capacity = parseInt(tableForm.capacity);
    if (isNaN(capacity) || capacity < 1) {
      toast({ title: "Errore", description: "Inserisci una capacità valida", variant: "destructive" });
      return;
    }
    const sizes = defaultSize(capacity);

    if (tableDialog.tableId) {
      updateLocalTables(activeRoomId, (tables) =>
        tables.map((t) =>
          t.id === tableDialog.tableId
            ? { ...t, name: tableForm.name.trim(), capacity, shape: tableForm.shape }
            : t
        )
      );
    } else {
      const id = `new-${Date.now()}`;
      const newTable: TableData = {
        id,
        name: tableForm.name.trim(),
        capacity,
        shape: tableForm.shape,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: sizes.w,
        height: tableForm.shape === "round" ? sizes.w : sizes.h,
        rotation: 0,
      };
      updateLocalTables(activeRoomId, (tables) => [...tables, newTable]);
    }
    setTableDialog({ open: false, tableId: null });
  }

  function deleteSelectedTable() {
    if (!activeRoomId || !selectedTableId) return;
    if (!confirm("Eliminare questo tavolo?")) return;
    updateLocalTables(activeRoomId, (tables) => tables.filter((t) => t.id !== selectedTableId));
    setSelectedTableId(null);
  }

  async function saveLayout() {
    if (!activeRoomId || !activeRoom) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tables", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoomId,
          tables: activeRoom.tables,
        }),
      });
      if (!res.ok) throw new Error();
      const savedTables: TableData[] = await res.json();
      setRooms((prev) =>
        prev.map((r) => (r.id === activeRoomId ? { ...r, tables: savedTables } : r))
      );
      setSelectedTableId(null);
      toast({ title: "Layout salvato", variant: "default" });
    } catch {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Editor Disposizione Tavoli</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewRoomDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-1" /> Nuova sala
          </Button>
          {activeRoom && (
            <Button size="sm" onClick={saveLayout} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Salvataggio…" : "Salva layout"}
            </Button>
          )}
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p>Nessuna sala configurata. Crea la prima sala.</p>
        </div>
      ) : (
        <Tabs value={activeRoomId ?? ""} onValueChange={setActiveRoomId}>
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList>
              {rooms.map((r) => (
                <TabsTrigger key={r.id} value={r.id} className={cn("text-xs", !r.active && "opacity-50")}>
                  {!r.active && <PowerOff className="h-3 w-3 mr-1 text-muted-foreground" />}
                  {r.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {activeRoom && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={openRenameDialog}>
                  <Edit2 className="h-3 w-3" /> Rinomina
                </Button>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs">
                  {activeRoom.active
                    ? <Power className="h-3 w-3 text-green-600" />
                    : <PowerOff className="h-3 w-3 text-muted-foreground" />}
                  <span className="text-muted-foreground">{activeRoom.active ? "Attiva" : "Disattiva"}</span>
                  <Switch
                    checked={activeRoom.active}
                    onCheckedChange={() => toggleRoomActive(activeRoom.id, activeRoom.active)}
                    className="scale-75"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-7 w-7 shrink-0"
                  onClick={() => deleteRoom(activeRoom.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {rooms.map((room) => (
            <TabsContent key={room.id} value={room.id} className="mt-4">
              {/* Toolbar tavoli */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm font-medium text-muted-foreground">Aggiungi tavolo:</span>
                {QUICK_CAPACITIES.map((cap) => (
                  <Button
                    key={cap}
                    variant="outline"
                    size="sm"
                    onClick={() => openAddTable(cap, cap >= 8 ? "rect" : "round")}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {cap} pers.
                  </Button>
                ))}
                {selectedTableId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditTable(selectedTableId)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Modifica
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrDialog(true)}
                    >
                      <QrCode className="h-3 w-3 mr-1" /> QR Code
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelectedTable}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Elimina
                    </Button>
                  </>
                )}
              </div>

              <div className="overflow-auto">
                <TableCanvas
                  tables={room.tables}
                  roomWidth={room.width}
                  roomHeight={room.height}
                  onTableMove={handleTableMove}
                  onTableChange={handleTableChange}
                  onTableSelect={setSelectedTableId}
                  selectedId={selectedTableId}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Trascina i tavoli per posizionarli. Seleziona un tavolo per modificarlo o eliminarlo. Ricorda di salvare il layout.
              </p>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Dialog rinomina sala */}
      <Dialog open={renameDialog} onOpenChange={setRenameDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rinomina sala</DialogTitle></DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveRename()}
            placeholder="Nome sala"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(false)}>Annulla</Button>
            <Button onClick={saveRename}><Check className="h-3.5 w-3.5 mr-1" /> Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nuova sala */}
      <Dialog open={newRoomDialog} onOpenChange={setNewRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova sala</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome della sala</Label>
            <Input
              placeholder="es. Sala Principale"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoomDialog(false)}>Annulla</Button>
            <Button onClick={createRoom}>Crea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tavolo */}
      <Dialog open={tableDialog.open} onOpenChange={(o) => setTableDialog({ open: o, tableId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tableDialog.tableId ? "Modifica tavolo" : "Aggiungi tavolo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome / Numero tavolo *</Label>
              <Input
                placeholder="es. T1 o Veranda 3"
                value={tableForm.name}
                onChange={(e) => setTableForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Posti</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_CAPACITIES.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setTableForm((f) => ({ ...f, capacity: String(cap) }))}
                      className={cn(
                        "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                        tableForm.capacity === String(cap)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      )}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="Altro"
                    value={QUICK_CAPACITIES.map(String).includes(tableForm.capacity) ? "" : tableForm.capacity}
                    onChange={(e) => setTableForm((f) => ({ ...f, capacity: e.target.value }))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">posti personalizzati</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Forma</Label>
                <Select
                  value={tableForm.shape}
                  onValueChange={(v) => setTableForm((f) => ({ ...f, shape: v as Shape }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round">Rotondo</SelectItem>
                    <SelectItem value="square">Quadrato</SelectItem>
                    <SelectItem value="rect">Rettangolare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog({ open: false, tableId: null })}>
              Annulla
            </Button>
            <Button onClick={applyTableEdit}>
              {tableDialog.tableId ? "Salva modifiche" : "Aggiungi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code dialog */}
      {selectedTableId && (() => {
        const selectedTable = activeRoom?.tables.find((t) => t.id === selectedTableId);
        if (!selectedTable) return null;
        const qrUrl = typeof window !== "undefined"
          ? `${window.location.origin}/menu/${selectedTableId}`
          : "";
        return (
          <Dialog open={qrDialog} onOpenChange={setQrDialog}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>QR Code — Tavolo {selectedTable.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2">
                <div id="qr-print-area" className="p-4 bg-white border rounded-xl flex flex-col items-center gap-3">
                  <QRCodeSVG value={qrUrl} size={200} />
                  <p className="font-bold text-lg">Tavolo {selectedTable.name}</p>
                  <p className="text-xs text-muted-foreground text-center">Scansiona per vedere il menu e ordinare</p>
                </div>
                <p className="text-xs text-muted-foreground break-all text-center">{qrUrl}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setQrDialog(false)}>Chiudi</Button>
                <Button onClick={() => {
                  const area = document.getElementById("qr-print-area");
                  if (!area) return;
                  const win = window.open("", "_blank");
                  if (!win) return;
                  win.document.write(`
                    <html><head><title>QR Tavolo ${selectedTable.name}</title>
                    <style>body{font-family:sans-serif;text-align:center;padding:40px}img{width:200px}p{margin:8px 0}</style>
                    </head><body>${area.innerHTML}<script>window.print();window.close()<\/script></body></html>
                  `);
                  win.document.close();
                }}>
                  <Printer className="h-4 w-4 mr-1" /> Stampa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
