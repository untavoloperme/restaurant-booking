import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, string> = {
  "orders.show_status_customer": "true",
  "orders.show_status_kitchen": "true",
  "coperto": "0",
  "ordering.enabled": "true",
  "menu.show_images": "true",
  "restaurant.name": "",
  "restaurant.phone": "",
  "restaurant.logo": "",
  "slot.driftThreshold": "3",
  "slot.driftMinutes": "15",
  "whatsapp.service.enabled": "false",
  "whatsapp.message": "",
  "whatsapp.booking.url": "",
  "whatsapp.autoresponder.keywords": "prenota,prenotazione,tavolo,menu,info,ciao,buongiorno,salve,buonasera",
};

// Read-only keys exposed in GET but not writable via PATCH
const READONLY_KEYS = ["whatsapp.enabled"];

export async function GET() {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const allKeys = [...Object.keys(DEFAULTS), ...READONLY_KEYS];
  const rows = await prisma.setting.findMany({ where: { key: { in: allKeys } } });
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const session = await getAuth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const updates = Object.entries(body as Record<string, string>).filter(([key]) =>
    key in DEFAULTS
  );

  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }

  return NextResponse.json({ ok: true });
}
