"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Stage, Layer, Rect, Circle, Text, Group, Line } from "react-konva";
import { format, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTick, formatDuration } from "@/hooks/use-tick";
import { UserCheck, LogOut, ShoppingBag, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  extraTableIds: string[];
}

interface OrderItem {
  id: string;
  quantity: number;
  notes: string | null;
  menuItem: { name: string; price: string };
}

interface Order {
  id: string;
  status: "RECEIVED" | "PREPARING" | "READY" | "DELIVERED";
  notes: string | null;
  tableId: string;
  items: OrderItem[];
  createdAt: string;
}

const TABLE_COLORS: Record<string, { fill: string; stroke: string }> = {
  FREE:        { fill: "#bbf7d0", stroke: "#16a34a" },
  PENDING:     { fill: "#fef08a", stroke: "#ca8a04" },
  ARRIVED:     { fill: "#fca5a5", stroke: "#dc2626" },
  CHECKED_OUT: { fill: "#e2e8f0", stroke: "#94a3b8" },
};

const ORDER_STATUS_META = {
  RECEIVED:  { label: "Ricevuto",        variant: "warning"  as const },
  PREPARING: { label: "In preparazione", variant: "default"  as const },
  READY:     { label: "Pronto",          variant: "success"  as const },
  DELIVERED: { label: "Consegnato",      variant: "secondary" as const },
};

function getTableStatus(tableId: string, reservations: Reservation[]) {
  const res = reservations.find(
    (r) =>
      (r.tableId === tableId || r.extraTableIds?.includes(tableId)) &&
      ["PENDING", "ARRIVED"].includes(r.status)
  );
  if (!res) return { status: "FREE", reservation: null };
  return { status: res.status, reservation: res };
}

function orderTotal(items: OrderItem[]): number {
  return items.reduce((s, i) => s + i.quantity * parseFloat(i.menuItem.price), 0);
}

function LiveTimerInline({ arrivedAt }: { arrivedAt: string }) {
  useTick(1000);
  const ms = Date.now() - new Date(arrivedAt).getTime();
  return <span className="text-xs text-green-700 font-mono">{formatDuration(ms)}</span>;
}

export default function FloorView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeRoomIdx, setActiveRoomIdx] = useState(0);
  const [popover, setPopover] = useState<{ open: boolean; tableId: string | null }>({ open: false, tableId: null });
  const [mounted, setMounted] = useState(false);
  const [coperto, setCoperto] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setCoperto(parseFloat(data.coperto ?? "0") || 0))
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    const today = format(startOfDay(new Date()), "yyyy-MM-dd");

    // Prenotazioni e sale: critiche per i colori del canvas
    try {
      const [roomsRes, resRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch(`/api/reservations?date=${today}`),
      ]);
      setRooms(await roomsRes.json());
      const allRes: Reservation[] = await resRes.json();
      setReservations(allRes.filter((r) => ["PENDING", "ARRIVED"].includes(r.status)));
    } catch { /* ignora errori transitori */ }

    // Ordini di oggi (tutti gli status) per conto completo
    try {
      const ordersRes = await fetch(
        `/api/orders?status=RECEIVED,PREPARING,READY,DELIVERED&date=${today}`
      );
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }
    } catch { /* ignora errori transitori */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("reservation_created", loadData);
    es.addEventListener("reservation_updated", loadData);
    es.addEventListener("reservation_moved", loadData);
    es.addEventListener("order_created", loadData);
    es.addEventListener("order_updated", loadData);
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
  const popoverOrders = orders.filter((o) => o.tableId === popover.tableId);
  const popoverOrdersTotal = popoverOrders.reduce((s, o) => s + orderTotal(o.items), 0);
  const popoverCoperto = coperto > 0 && popoverInfo?.reservation
    ? popoverInfo.reservation.partySize * coperto
    : 0;
  const popoverGrandTotal = popoverOrdersTotal + popoverCoperto;

  // Raggruppa tutti gli ordini di oggi per tavolo
  const ordersByTable: Record<string, { total: number; activeCount: number }> = {};
  for (const order of orders) {
    if (!ordersByTable[order.tableId]) ordersByTable[order.tableId] = { total: 0, activeCount: 0 };
    ordersByTable[order.tableId].total += orderTotal(order.items);
    if (order.status !== "DELIVERED") ordersByTable[order.tableId].activeCount += 1;
  }

  // Linee di collegamento tra tavoli uniti nella sala attiva
  const linkedLines: Array<{ points: number[]; stroke: string }> = [];
  if (activeRoom) {
    for (const res of reservations) {
      if (!res.extraTableIds?.length) continue;
      const allIds = [res.tableId, ...(res.extraTableIds ?? [])].filter(Boolean) as string[];
      const inRoom = allIds
        .map((id) => activeRoom.tables.find((t) => t.id === id))
        .filter(Boolean) as Table[];
      if (inRoom.length < 2) continue;
      const color = TABLE_COLORS[res.status]?.stroke ?? "#94a3b8";
      for (let i = 0; i < inRoom.length - 1; i++) {
        linkedLines.push({
          points: [inRoom[i].x, inRoom[i].y, inRoom[i + 1].x, inRoom[i + 1].y],
          stroke: color,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Planimetria Live</h1>
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

      <div ref={containerRef} className="border rounded-lg p-2 bg-slate-50">
      {!mounted || !activeRoom || containerWidth === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Caricamento planimetria...</div>
      ) : (() => {
        const scale = Math.min(1, containerWidth / activeRoom.width);
        const stageWidth = containerWidth;
        const stageHeight = activeRoom.height * scale;
        return (
          <Stage width={stageWidth} height={stageHeight} scaleX={scale} scaleY={scale}>
            <Layer>
              {/* Linee di collegamento tra tavoli uniti */}
              {linkedLines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.stroke}
                  strokeWidth={5}
                  dash={[10, 6]}
                  opacity={0.7}
                  lineCap="round"
                />
              ))}
              {activeRoom.tables.map((table) => {
                const { status, reservation } = getTableStatus(table.id, reservations);
                const colors = TABLE_COLORS[status] || TABLE_COLORS.FREE;
                // Mostra ordini solo per tavoli ARRIVED (non per checkout o liberi)
                const tableOrders = status === "ARRIVED" ? ordersByTable[table.id] : undefined;
                const firstName = reservation ? reservation.customerName.split(" ")[0] : "";
                const mainLabel = `${table.name}\n${table.capacity}p${reservation ? `\n${firstName}\n${reservation.time}` : ""}`;

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
                      text={mainLabel}
                      fontSize={10}
                      fontStyle="bold"
                      align="center"
                      verticalAlign="middle"
                      x={-table.width / 2}
                      y={-table.height / 2}
                      width={table.width}
                      height={tableOrders ? table.height - 16 : table.height}
                      fill="#1e293b"
                    />
                    {tableOrders && (
                      <Text
                        text={(() => {
                          const copertoAmt = coperto > 0 && reservation ? reservation.partySize * coperto : 0;
                          const grand = tableOrders.total + copertoAmt;
                          return tableOrders.activeCount > 0
                            ? `▶ €${grand.toFixed(2)}`
                            : `✓ €${grand.toFixed(2)}`;
                        })()}
                        fontSize={9}
                        fontStyle="bold"
                        align="center"
                        x={-table.width / 2}
                        y={table.height / 2 - 14}
                        width={table.width}
                        fill={tableOrders.activeCount > 0 ? "#b45309" : "#64748b"}
                      />
                    )}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        );
      })()}
      </div>

      {/* Dialog dettaglio tavolo */}
      <Dialog open={popover.open} onOpenChange={(o) => setPopover({ open: o, tableId: null })}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Tavolo {popoverTable?.name}
              {popoverInfo?.status === "ARRIVED" && (popoverOrders.length > 0 || popoverCoperto > 0) && (
                <Badge variant="outline" className="text-amber-700 border-amber-400">
                  <ShoppingBag className="h-3 w-3 mr-1" />
                  €{popoverGrandTotal.toFixed(2)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Prenotazione */}
            {popoverInfo?.reservation ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prenotazione</p>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                  <p><strong>Cliente:</strong> {popoverInfo.reservation.customerName}</p>
                  <p><strong>Telefono:</strong> {popoverInfo.reservation.phone}</p>
                  <p><strong>Persone:</strong> {popoverInfo.reservation.partySize}</p>
                  <p><strong>Orario:</strong> {popoverInfo.reservation.time}</p>
                  {(popoverInfo.reservation.extraTableIds?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-amber-700">
                      <Link2 className="h-3 w-3" />
                      <span>
                        Tavoli uniti:{" "}
                        {[popoverInfo.reservation.tableId, ...(popoverInfo.reservation.extraTableIds ?? [])]
                          .filter(Boolean)
                          .map((tid) => activeRoom?.tables.find((t) => t.id === tid)?.name ?? tid)
                          .join(" + ")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <strong>Stato:</strong>
                    <Badge variant={popoverInfo.status === "ARRIVED" ? "success" : "warning"}>
                      {popoverInfo.status === "ARRIVED" ? "Al tavolo" : "In attesa"}
                    </Badge>
                  </div>
                  {popoverInfo.status === "ARRIVED" && popoverInfo.reservation.arrivedAt && (
                    <p><strong>Al tavolo da:</strong> <LiveTimerInline arrivedAt={popoverInfo.reservation.arrivedAt} /></p>
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

            {/* Ordini del tavolo — visibili solo se ARRIVED */}
            {popoverInfo?.status === "ARRIVED" && (popoverOrders.length > 0 || popoverCoperto > 0) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {popoverOrders.length > 0 ? `Ordini (${popoverOrders.length})` : "Conto"}
                </p>
                <div className="space-y-2">
                  {popoverOrders.map((order) => {
                    const meta = ORDER_STATUS_META[order.status];
                    const tot = orderTotal(order.items);
                    return (
                      <div key={order.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          <span className="text-sm font-bold">€{tot.toFixed(2)}</span>
                        </div>
                        <div className="divide-y">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between px-3 py-2 text-sm">
                              <span className="flex gap-2">
                                <span className="font-mono font-bold text-primary w-5">{item.quantity}×</span>
                                <span>
                                  {item.menuItem.name}
                                  {item.notes && (
                                    <span className="block text-xs text-muted-foreground italic">{item.notes}</span>
                                  )}
                                </span>
                              </span>
                              <span className="text-muted-foreground shrink-0 ml-2">
                                €{(item.quantity * parseFloat(item.menuItem.price)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {popoverCoperto > 0 && (
                  <div className="flex justify-between px-3 py-1.5 text-sm text-muted-foreground border rounded-lg">
                    <span>
                      Coperto ({popoverInfo!.reservation!.partySize} × €{coperto.toFixed(2)})
                    </span>
                    <span>€{popoverCoperto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2 bg-slate-800 rounded-lg text-sm font-bold text-white">
                  <span>Conto totale</span>
                  <span>€{popoverGrandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
