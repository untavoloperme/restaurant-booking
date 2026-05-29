import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";

type ClearTarget =
  | "reservations"
  | "orders"
  | "whatsapp_log"
  | "missed_calls"
  | "menu"
  | "users"
  | "all";

const VALID_TARGETS: ClearTarget[] = [
  "reservations",
  "orders",
  "whatsapp_log",
  "missed_calls",
  "menu",
  "users",
  "all",
];

export async function POST(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { target, password } = await req.json() as { target?: string; password?: string };

  if (!password) return NextResponse.json({ error: "Password mancante" }, { status: 400 });
  if (!target || !VALID_TARGETS.includes(target as ClearTarget))
    return NextResponse.json({ error: "Target non valido" }, { status: 400 });

  const sa = await prisma.superAdmin.findUnique({ where: { id: session.id } });
  if (!sa) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const valid = await compare(password, sa.password);
  if (!valid) return NextResponse.json({ error: "Password non corretta" }, { status: 400 });

  let deleted = 0;

  const t = target as ClearTarget;

  if (t === "reservations" || t === "all") {
    const r = await prisma.reservation.deleteMany();
    deleted += r.count;
  }

  if (t === "orders" || t === "all") {
    const ri = await prisma.orderItem.deleteMany();
    const ro = await prisma.order.deleteMany();
    deleted += ri.count + ro.count;
  }

  if (t === "whatsapp_log" || t === "all") {
    const r = await prisma.whatsappLog.deleteMany();
    deleted += r.count;
  }

  if (t === "missed_calls" || t === "all") {
    const r = await prisma.missedCall.deleteMany();
    deleted += r.count;
  }

  if (t === "menu" || t === "all") {
    const ri = await prisma.menuItem.deleteMany();
    const rs = await prisma.menuSubcategory.deleteMany();
    const rc = await prisma.menuCategory.deleteMany();
    deleted += ri.count + rs.count + rc.count;
  }

  if (t === "users" || t === "all") {
    const r = await prisma.user.deleteMany();
    deleted += r.count;
  }

  return NextResponse.json({ ok: true, deleted });
}
