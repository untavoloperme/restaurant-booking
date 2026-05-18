"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { format, startOfDay, addMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTick, formatDuration } from "@/hooks/use-tick";
import { UserCheck, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });
const Rect = dynamic(() => import("react-konva").then((m) => m.Rect), { ssr: false });
const Circle = dynamic(() => import("react-konva").then((m) => m.Circle), { ssr: false });
const Text = dynamic(() => import("react-konva").then((m) => m.Text), { ssr: false });
const Group = dynamic(() => import("react-konva").then((m) => m.Group), { ssr: false });

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: Table[];
}

interface Reservation {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  partySize: number;
  time: string;
  status: string;
  arrivedAt: string | null;
  tableId: string | null;
}

// Colori per stato tavolo
const TABLE_COLORS: Record<string, { fill: string; stroke: string }> = {
  FREE: { fill: "#bbf7d0", stroke: "#16a34a" },       // verde
  PENDING: { fill: "#fef08a", stroke: "#ca8a04" },    // giallo
  ARRIVED: { fill: "#fca5a5", stroke: "#dc2626" },    // rosso
  CHECKED_OUT: { fill: "#e2e8f0", stroke: "#94a3b8" }, // grigio
};

function getTableStatus(tableId: string, reservations: Reservation[]): { status: string; reservation: Reservation | null } {
  const res = reservations.find((r) => r.tableId === tableId && ["PENDING", "ARRIVED"].includes(r.status));
  if (!res) return { status: "FREE", reservation: null };
  return { status: res.status, reservation: res };
}

function LiveTimerInline({ arrivedAt }: { arrivedAt: string }) {
  useTick(1000);
  const ms = Date.now() - new Date(arrivedAt).getTime();
  return <span className="text-xs text-green-700 font-mono">{formatDuration(ms)}</span>;
}

export default function FloorView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [popover, setPopover] = useState<{ open: boolean; tableId: string | null }>({ open: false, tableId: null });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const loadData = useCallback(async () => {
    const today = format(startOfDay(new Date()), "yyyy-MM-dd");
    const [roomsRes, resRes] = await Promise.all([
      fetch("/api/rooms"),
      fetch(`/api/reservations?date=${today}`),
    ]);
    setRooms(await roomsRes.json());
    const allRes: Reservation[] = await resRes.json();
    setReservations(allRes.filter((r) => ["PENDING", "ARRIVED"].includes(r.status)));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("reservation_created", loadData);
    es.addEventListener("reservation_updated", loadData);
    es.addEventListener("reservation_moved", loadData);
    return () => es.close();
  }, [loadData]);

  async function arrive(id: string) {
    await fetch(`/api/reservations/${id}/arrive`, { method: "POST" });
    toast({ title: "Cliente segnato come arrivato" });
    setPopover({ open: false, tableId: null });
    loadData();
  }

  async function checkout(id: string) {
    await fetch(`/api/reservations/${id}/checkout`, { method: "POST" });
    toast({ title: "Checkout effettuato" });
    setPopover({ open: false, tableId: null });
    loadData();
  }

  const activeRoom = rooms[activeRoomIdx];
  const popoverTable = activeRoom?.tables.find((t) => t.id === popover.tableId) ?? null;
  const popoverInfo = popover.tableId ? getTableStatus(popover.tableId, reservations) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Planimetria Live</h1>
        {/* Legenda */}
        <div className="flex gap-3 flex-wrap text-xs">
          {Object.entries({ PENDING: "Prenotato", ARRIVED: "Al tavolo", FREE: "Libero", CHECKED_OUT: "Uscito" }).map(([k, v]) => {
            const c = TABLE_COLORS[k] || TABLE_COLORS.FREE;
            return (
              <span key={k} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: c.fill, border: `1.5px solid ${c.stroke}` }} />
                {v}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tab sale */}
      {rooms.length > 1 && (
        <div className="flex gap-2">
          {rooms.map((room, idx) => (
            <button
              key={room.id}
              onClick={() => setActiveRoomIdx(idx)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                idx === activeRoomIdx ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>
      )}

      {!mounted || !activeRoom ? (
        <div className="text-center py-16 text-muted-foreground">Caricamento planimetria...</div>
      ) : (
        <div className="overflow-auto border rounded-lg p-2 bg-slate-50">
          <Stage width={activeRoom.width} height={activeRoom.height}>
            <Layer>
              {activeRoom.tables.map((table) => {
                const { status, reservation } = getTableStatus(table.id, reservations);
                const colors = TABLE_COLORS[status] || TABLE_COLORS.FREE;
                const label = `${table.name}\n${table.capacity}p${reservation ? `\n${reservation.time}` : ""}`;

                return (
                  <Group
                    key={table.id}
                    x={table.x}
                    y={table.y}
                    rotation={table.rotation}
                    onClick={() => setPopover({ open: true, tableId: table.id })}
                    onTap={() => setPopover({ open: true, tableId: table.id })}
                    style={{ cursor: "pointer" }}
                  >
                    {table.shape === "round" ? (
                      <Circle
                        x={0} y={0} radius={table.width / 2}
                        fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
                      />
                    ) : (
                      <Rect
                        x={-table.width / 2} y={-table.height / 2}
                        width={table.width} height={table.height}
                        fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
                        cornerRadius={6}
                      />
                    )}
                    <Text
                      text={label}
                      fontSize={10}
                      fontStyle="bold"
                      align="center"
                      verticalAlign="middle"
                      x={-table.width / 2}
                      y={-table.height / 2}
                      width={table.width}
                      height={table.height}
                      fill="#1e293b"
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>
      )}

      {/* Popover dettaglio tavolo */}
      <Dialog open={popover.open} onOpenChange={(o) => setPopover({ open: o, tableId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {popoverTable ? `Tavolo ${popoverTable.name}` : "Tavolo"}
            </DialogTitle>
          </DialogHeader>
          {popoverInfo?.reservation ? (
            <div className="space-y-3">
              <div className="space-y-1 text-sm">
                <p><strong>Cliente:</strong> {popoverInfo.reservation.customerName}</p>
                <p><strong>Telefono:</strong> {popoverInfo.reservation.phone}</p>
                <p><strong>Persone:</strong> {popoverInfo.reservation.partySize}</p>
                <p><strong>Orario:</strong> {popoverInfo.reservation.time}</p>
                <p>
                  <strong>Stato:</strong>{" "}
                  <Badge variant={popoverInfo.status === "ARRIVED" ? "success" : "warning"}>
                    {popoverInfo.status === "ARRIVED" ? "Al tavolo" : "In attesa"}
                  </Badge>
                </p>
                {popoverInfo.status === "ARRIVED" && popoverInfo.reservation.arrivedAt && (
                  <p>
                    <strong>Al tavolo da:</strong>{" "}
                    <LiveTimerInline arrivedAt={popoverInfo.reservation.arrivedAt} />
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {popoverInfo.status === "PENDING" && (
                  <Button size="sm" onClick={() => arrive(popoverInfo.reservation!.id)}>
                    <UserCheck className="h-3 w-3 mr-1" /> Arrivati
                  </Button>
                )}
                {popoverInfo.status === "ARRIVED" && (
                  <Button size="sm" onClick={() => checkout(popoverInfo.reservation!.id)}>
                    <LogOut className="h-3 w-3 mr-1" /> Checkout
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Tavolo libero — {popoverTable?.capacity} posti ({activeRoom?.name ?? ""})
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
