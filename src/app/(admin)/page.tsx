import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarCheck, Users, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const session = await getAuth();
  if (!session) redirect("/login");

  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const [totalToday, arrivedToday, pendingToday, upcomingReservations] = await Promise.all([
    prisma.reservation.count({
      where: { date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
    }),
    prisma.reservation.count({
      where: { date: { gte: start, lte: end }, status: "ARRIVED" },
    }),
    prisma.reservation.count({
      where: { date: { gte: start, lte: end }, status: "PENDING" },
    }),
    prisma.reservation.findMany({
      where: { date: { gte: start, lte: end }, status: { in: ["PENDING", "ARRIVED"] } },
      include: { table: { include: { room: true } } },
      orderBy: [{ time: "asc" }, { insertionSeq: "asc" }],
      take: 10,
    }),
  ]);

  const totalCovers = await prisma.reservation.aggregate({
    _sum: { partySize: true },
    where: { date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
  });

  const statusLabel: Record<string, { label: string; variant: "default" | "warning" | "success" | "destructive" | "secondary" | "outline" }> = {
    PENDING: { label: "In attesa", variant: "warning" },
    ARRIVED: { label: "Arrivati", variant: "success" },
    CHECKED_OUT: { label: "Usciti", variant: "secondary" },
    CANCELLED: { label: "Cancellata", variant: "destructive" },
    NO_SHOW: { label: "No show", variant: "outline" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">{format(today, "EEEE d MMMM yyyy", { locale: it })}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" /> Prenotazioni oggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Coperti totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCovers._sum.partySize ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> In attesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Al tavolo ora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{arrivedToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni di oggi</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingReservations.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nessuna prenotazione attiva per oggi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left pb-2 pr-4">Orario</th>
                    <th className="text-left pb-2 pr-4">Cliente</th>
                    <th className="text-left pb-2 pr-4">Persone</th>
                    <th className="text-left pb-2 pr-4">Tavolo</th>
                    <th className="text-left pb-2">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upcomingReservations.map((r) => {
                    const s = statusLabel[r.status] ?? { label: r.status, variant: "outline" as const };
                    return (
                      <tr key={r.id} className="py-2">
                        <td className="py-2 pr-4 font-mono font-medium">{r.time}</td>
                        <td className="py-2 pr-4">{r.customerName}</td>
                        <td className="py-2 pr-4">{r.partySize}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {r.table ? `${r.table.name} (${r.table.room.name})` : "—"}
                        </td>
                        <td className="py-2">
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
