"use client";

import { useState, useEffect } from "react";
import { UtensilsCrossed, Loader2, CheckCircle2, ChefHat, Clock, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
  table: { name: string; room: { name: string } };
  items: OrderItem[];
  createdAt: string;
}

const STATUS_STEPS: { key: Order["status"]; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "RECEIVED",  label: "Ricevuto",        icon: <CheckCircle2 className="h-5 w-5" />, desc: "Il tuo ordine è stato ricevuto" },
  { key: "PREPARING", label: "In preparazione", icon: <ChefHat className="h-5 w-5" />,     desc: "La cucina sta preparando il tuo ordine" },
  { key: "READY",     label: "Pronto",          icon: <Clock className="h-5 w-5" />,        desc: "Pronto! Il personale porta l'ordine al tavolo" },
  { key: "DELIVERED", label: "Consegnato",      icon: <PartyPopper className="h-5 w-5" />, desc: "Buon appetito! 🍽️" },
];

export default function OrderStatusPage({
  params,
}: {
  params: { tableId: string; orderId: string };
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [showStatus, setShowStatus] = useState(true);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => setShowStatus(data["orders.show_status_customer"] !== "false"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/public/orders/${params.orderId}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Ordine non trovato"); return; }
        if (!cancelled) setOrder(data);
        if (data.status !== "DELIVERED" && !cancelled) {
          setTimeout(poll, 5000);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 8000);
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [params.orderId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2 px-4 text-center">
        <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">Ordine non trovato</p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const currentStep = STATUS_STEPS[currentStepIdx];

  const total = order.items.reduce(
    (s, i) => s + i.quantity * parseFloat(i.menuItem.price),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10 shadow">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" />
          <div>
            <p className="font-bold leading-tight">Tavolo {order.table.name}</p>
            <p className="text-xs opacity-80">{order.table.room.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Current status */}
        {showStatus && (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center space-y-2">
            <div className="flex justify-center text-primary">{currentStep?.icon}</div>
            <p className="text-xl font-bold">{currentStep?.label}</p>
            <p className="text-sm text-muted-foreground">{currentStep?.desc}</p>
            {order.status !== "DELIVERED" && (
              <p className="text-xs text-muted-foreground animate-pulse">Aggiornamento automatico ogni 5 secondi…</p>
            )}
          </div>
        )}

        {/* Progress bar */}
        {showStatus && (
          <>
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, idx) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div
                    className={`h-2 w-full rounded-full transition-colors duration-500 ${
                      idx <= currentStepIdx ? "bg-primary" : "bg-slate-200"
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground -mt-4">
              {STATUS_STEPS.map((step) => (
                <span key={step.key} className="text-center leading-tight w-14">{step.label}</span>
              ))}
            </div>
          </>
        )}

        {/* Order items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-semibold">Riepilogo ordine</p>
          </div>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  {item.quantity}× {item.menuItem.name}
                  {item.notes && (
                    <span className="block text-xs text-muted-foreground italic">{item.notes}</span>
                  )}
                </span>
                <span className="font-medium">
                  €{(item.quantity * parseFloat(item.menuItem.price)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-4 py-3 font-bold border-t bg-slate-50">
            <span>Totale</span>
            <span>€{total.toFixed(2)}</span>
          </div>
        </div>

        {order.status === "DELIVERED" && (
          <Link href={`/menu/${params.tableId}`}>
            <Button variant="outline" className="w-full">Nuovo ordine</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
