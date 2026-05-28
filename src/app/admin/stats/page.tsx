"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, TrendingUp, UtensilsCrossed, Clock, RefreshCw, Loader2, MessageCircle } from "lucide-react";

interface ReservationDay {
  date: string;
  total: number;
  people: number;
  cancelled: number;
  noshow: number;
}

interface RevenueDay {
  date: string;
  orders: number;
  total: number;
}

interface TopDish {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface AvgDuration {
  avgMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  samples: number;
}

interface WhatsappStats {
  sent: number;
  cancellations: number;
  fromChatbot: number;
}

interface StatsData {
  reservationsByDate: ReservationDay[];
  revenueByDate: RevenueDay[];
  totalRevenue: number;
  topDishes: TopDish[];
  avgDuration: AvgDuration | null;
  whatsapp: WhatsappStats | null;
}

function fmtDate(d: string) {
  return format(new Date(d + "T12:00:00"), "EEE d MMM", { locale: it });
}

function fmtMinutes(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const TODAY = format(new Date(), "yyyy-MM-dd");

export default function StatsPage() {
  const [from, setFrom]   = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [to, setTo]       = useState(TODAY);
  const [data, setData]   = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]  = useState("");

  const load = useCallback(async (f: string, t: string) => {
    if (!f || !t || f > t) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stats?from=${f}&to=${t}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Errore"); return; }
      setData(json);
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(from, to); }, [load, from, to]);

  function applyPreset(preset: string) {
    const today = new Date();
    let f = TODAY, t = TODAY;
    if (preset === "today")   { f = t = TODAY; }
    if (preset === "week")    { f = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"); t = TODAY; }
    if (preset === "month")   { f = format(startOfMonth(today), "yyyy-MM-dd"); t = TODAY; }
    if (preset === "last30")  { f = format(subDays(today, 30), "yyyy-MM-dd"); t = TODAY; }
    if (preset === "last3m")  { f = format(startOfMonth(subMonths(today, 2)), "yyyy-MM-dd"); t = TODAY; }
    setFrom(f); setTo(t);
  }

  const totalReservations = data?.reservationsByDate.reduce((s, d) => s + d.total, 0) ?? 0;
  const totalPeople       = data?.reservationsByDate.reduce((s, d) => s + d.people, 0) ?? 0;
  const totalCancelled    = data?.reservationsByDate.reduce((s, d) => s + d.cancelled + d.noshow, 0) ?? 0;
  const maxRevenue        = Math.max(...(data?.revenueByDate.map((d) => d.total) ?? [0]));
  const maxDish           = data?.topDishes[0]?.quantity ?? 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Statistiche</h1>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Preset rapidi */}
            {[
              { key: "today",  label: "Oggi" },
              { key: "week",   label: "Settimana" },
              { key: "month",  label: "Mese corrente" },
              { key: "last30", label: "Ultimi 30 gg" },
              { key: "last3m", label: "Ultimi 3 mesi" },
            ].map((p) => (
              <Button key={p.key} size="sm" variant="outline" onClick={() => applyPreset(p.key)}>
                {p.label}
              </Button>
            ))}

            <span className="text-muted-foreground text-sm hidden sm:block">|</span>

            <div className="flex items-center gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36 h-8 text-sm" />
              <span className="text-muted-foreground text-sm">→</span>
              <Input type="date" value={to}   onChange={(e) => setTo(e.target.value)}   className="w-36 h-8 text-sm" />
              <Button size="sm" onClick={() => load(from, to)} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Prenotazioni</p>
                <p className="text-3xl font-bold">{totalReservations}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Coperti serviti</p>
                <p className="text-3xl font-bold">{totalPeople}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Incasso totale</p>
                <p className="text-3xl font-bold">€{data.totalRevenue.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Disdette / No-show</p>
                <p className="text-3xl font-bold text-destructive">{totalCancelled}</p>
              </CardContent>
            </Card>
          </div>

          {/* WhatsApp */}
          {data.whatsapp && (data.whatsapp.sent > 0 || data.whatsapp.fromChatbot > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{data.whatsapp.sent}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Messaggi inviati</p>
                    <p className="text-xs text-muted-foreground">(codici OTP)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">{data.whatsapp.cancellations}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Avvisi disdetta</p>
                    <p className="text-xs text-muted-foreground">inviati</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-700">{data.whatsapp.fromChatbot}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prenotazioni</p>
                    <p className="text-xs text-muted-foreground">dal chatbot</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prenotazioni per data */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-primary" /> Prenotazioni per data
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.reservationsByDate.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nessuna prenotazione nel periodo</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="pb-2 pr-4 font-medium">Data</th>
                        <th className="pb-2 pr-4 font-medium text-right">Prenotazioni</th>
                        <th className="pb-2 pr-4 font-medium text-right">Coperti</th>
                        <th className="pb-2 pr-4 font-medium text-right">Cancellate</th>
                        <th className="pb-2 font-medium text-right">No-show</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.reservationsByDate.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50">
                          <td className="py-2 pr-4 font-medium capitalize">{fmtDate(d.date)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{d.total}</td>
                          <td className="py-2 pr-4 text-right tabular-nums font-semibold">{d.people}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {d.cancelled > 0 ? <span className="text-destructive">{d.cancelled}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {d.noshow > 0 ? <span className="text-amber-600">{d.noshow}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t">
                      <tr className="font-semibold text-sm">
                        <td className="pt-2 pr-4">Totale</td>
                        <td className="pt-2 pr-4 text-right tabular-nums">{totalReservations}</td>
                        <td className="pt-2 pr-4 text-right tabular-nums">{totalPeople}</td>
                        <td className="pt-2 pr-4 text-right tabular-nums text-destructive">{data.reservationsByDate.reduce((s, d) => s + d.cancelled, 0) || "—"}</td>
                        <td className="pt-2 text-right tabular-nums text-amber-600">{data.reservationsByDate.reduce((s, d) => s + d.noshow, 0) || "—"}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incasso giornaliero */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Incasso giornaliero
                <Badge variant="outline" className="ml-auto font-bold text-green-700 border-green-300">
                  Totale €{data.totalRevenue.toFixed(2)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenueByDate.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nessun ordine nel periodo</p>
              ) : (
                <div className="space-y-2">
                  {data.revenueByDate.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-sm">
                      <span className="w-36 text-muted-foreground capitalize shrink-0">{fmtDate(d.date)}</span>
                      <MiniBar value={d.total} max={maxRevenue} color="bg-green-500" />
                      <span className="w-20 text-right tabular-nums font-semibold shrink-0">€{d.total.toFixed(2)}</span>
                      <span className="w-16 text-right text-xs text-muted-foreground shrink-0">{d.orders} ord.</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Piatti più ordinati */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-amber-600" /> Piatti più ordinati
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topDishes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nessun ordine nel periodo</p>
              ) : (
                <div className="space-y-2.5">
                  {data.topDishes.map((dish, i) => (
                    <div key={dish.menuItemId} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-center text-xs font-bold text-muted-foreground shrink-0">{i + 1}</span>
                      <span className="w-44 truncate font-medium shrink-0">{dish.name}</span>
                      <MiniBar value={dish.quantity} max={maxDish} color="bg-amber-400" />
                      <span className="w-16 text-right tabular-nums font-semibold shrink-0">{dish.quantity}×</span>
                      <span className="w-20 text-right tabular-nums text-muted-foreground shrink-0">€{dish.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tempo medio di permanenza */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" /> Tempo medio al tavolo
                {data.avgDuration && (
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    su {data.avgDuration.samples} checkout
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.avgDuration ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nessun checkout nel periodo
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4 py-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Media</p>
                    <p className="text-3xl font-bold text-blue-600">{fmtMinutes(data.avgDuration.avgMinutes)}</p>
                  </div>
                  <div className="text-center border-x">
                    <p className="text-xs text-muted-foreground mb-1">Minimo</p>
                    <p className="text-3xl font-bold text-green-600">{fmtMinutes(data.avgDuration.minMinutes)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Massimo</p>
                    <p className="text-3xl font-bold text-amber-600">{fmtMinutes(data.avgDuration.maxMinutes)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
