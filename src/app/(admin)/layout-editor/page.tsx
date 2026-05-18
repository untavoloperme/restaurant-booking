"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, PlusCircle, Edit2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { TableData } from "@/components/layout-editor/table-canvas";

const TableCanvas = dynamic(() => import("@/components/layout-editor/table-canvas"), { ssr: false });

interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: TableData[];
}

type Capacity = 4 | 6 | 8 | 10;
type Shape = "round" | "square" | "rect";

const DEFAULT_SIZES: Record<Capacity, { w: number; h: number }> = {
  4: { w: 80, h: 80 },
  6: { w: 90, h: 90 },
  8: { w: 100, h: 70 },
  10: { w: 120, h: 80 },
};

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

  const [addTableMode, setAddTableMode] = useState<{ capacity: Capacity; shape: Shape } | null>(null);

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

  function openAddTable(capacity: Capacity, shape: Shape) {
    setAddTableMode({ capacity, shape });
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
    const capacity = parseInt(tableForm.capacity) as Capacity;
    const sizes = DEFAULT_SIZES[capacity];

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
    setAddTableMode(null);
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
          tables: activeRoom.tables.map(({ id: _id, ...t }) => t),
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
          <div className="flex items-center gap-2 overflow-x-auto">
            <TabsList>
              {rooms.map((r) => (
                <TabsTrigger key={r.id} value={r.id} className="text-xs">
                  {r.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {activeRoom && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => deleteRoom(activeRoom.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {rooms.map((room) => (
            <TabsContent key={room.id} value={room.id} className="mt-4">
              {/* Toolbar tavoli */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm font-medium text-muted-foreground">Aggiungi tavolo:</span>
                {([4, 6, 8, 10] as Capacity[]).map((cap) => (
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
                <Label>Capacità</Label>
                <Select
                  value={tableForm.capacity}
                  onValueChange={(v) => setTableForm((f) => ({ ...f, capacity: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 persone</SelectItem>
                    <SelectItem value="6">6 persone</SelectItem>
                    <SelectItem value="8">8 persone</SelectItem>
                    <SelectItem value="10">10 persone</SelectItem>
                  </SelectContent>
                </Select>
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
    </div>
  );
}
