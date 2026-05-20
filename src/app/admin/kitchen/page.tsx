"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface OrderItem {
  id: string;
  quantity: number;
  notes: string | null;
  menuItem: { name: string };
}

interface Order {
  id: string;
  status: "RECEIVED" | "PREPARING" | "READY" | "DELIVERED";
  notes: string | null;
  table: { name: string; room: { name: string } };
  items: OrderItem[];
  createdAt: string;
}

const STATUS_META = {
  RECEIVED:  { label: "Ricevuto",        variant: "warning"   as const, next: "PREPARING", nextLabel: "Inizia preparazione" },
  PREPARING: { label: "In preparazione", variant: "default"   as const, next: "READY",     nextLabel: "Segna come pronto" },
  READY:     { label: "Pronto",          variant: "success"   as const, next: "DELIVERED",  nextLabel: "Consegnato" },
  DELIVERED: { label: "Consegnato",      variant: "secondary" as const, next: null,          nextLabel: "" },
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [showAdvance, setShowAdvance] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?status=RECEIVED,PREPARING,READY");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch {
      // ignora errori transitori
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setShowAdvance(data["orders.show_status_kitchen"] !== "false"));
  }, []);

  // SSE per aggiornamenti real-time
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("order_created", fetchOrders);
    es.addEventListener("order_updated", fetchOrders);
    return () => es.close();
  }, [fetchOrders]);

  async function advanceStatus(order: Order) {
    const meta = STATUS_META[order.status];
    if (!meta.next) return;
    setUpdating((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: meta.next }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `Ordine tavolo ${order.table.name}: ${STATUS_META[meta.next as Order["status"]].label}` });
      fetchOrders();
    } catch {
      toast({ title: "Errore aggiornamento", variant: "destructive" });
    } finally {
      setUpdating((prev) => ({ ...prev, [order.id]: false }));
    }
  }

  const received  = orders.filter((o) => o.status === "RECEIVED");
  const preparing = orders.filter((o) => o.status === "PREPARING");
  const ready     = orders.filter((o) => o.status === "READY");

  const Column = ({
    title,
    icon,
    orders: colOrders,
    headerClass,
  }: {
    title: string;
    icon: React.ReactNode;
    orders: Order[];
    headerClass: string;
  }) => (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${headerClass}`}>
        <div className="flex items-center gap-2 font-semibold text-sm">
          {icon}
          {title}
        </div>
        <span className="text-sm font-bold">{colOrders.length}</span>
      </div>
      {colOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nessun ordine</p>
      ) : (
        colOrders.map((order) => {
          const meta = STATUS_META[order.status];
          return (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-base">Tavolo {order.table.name}</p>
                  <p className="text-xs text-muted-foreground">{order.table.room.name}</p>
                </div>
                <div className="text-right">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: it })}
                  </p>
                </div>
              </div>

              <ul className="space-y-1 text-sm border-t pt-2">
                {order.items.map((item) => (
                  <li key={item.id} className="flex gap-2">
                    <span className="font-mono font-bold text-primary w-5 shrink-0">{item.quantity}×</span>
                    <span className="flex-1">
                      {item.menuItem.name}
                      {item.notes && (
                        <span className="block text-xs text-muted-foreground italic">{item.notes}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {order.notes && (
                <p className="text-xs text-muted-foreground italic border-t pt-2">📝 {order.notes}</p>
              )}

              {meta.next && showAdvance && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => advanceStatus(order)}
                  disabled={updating[order.id]}
                >
                  {updating[order.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {meta.nextLabel}
                </Button>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Cucina</h1>
          {orders.length > 0 && (
            <Badge variant="destructive">{orders.length} attivi</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-1" /> Aggiorna
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nessun ordine attivo al momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Column
            title="Da preparare"
            icon={<Clock className="h-4 w-4" />}
            orders={received}
            headerClass="bg-yellow-50 text-yellow-800"
          />
          <Column
            title="In preparazione"
            icon={<ChefHat className="h-4 w-4" />}
            orders={preparing}
            headerClass="bg-blue-50 text-blue-800"
          />
          <Column
            title="Pronti"
            icon={<CheckCircle2 className="h-4 w-4" />}
            orders={ready}
            headerClass="bg-green-50 text-green-800"
          />
        </div>
      )}
    </div>
  );
}
