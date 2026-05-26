import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PUBLIC_KEYS = [
  "orders.show_status_customer",
  "ordering.enabled",
  "menu.show_images",
  "restaurant.name",
  "restaurant.phone",
  "restaurant.logo",
];

const DEFAULTS: Record<string, string> = {
  "orders.show_status_customer": "true",
  "ordering.enabled": "true",
  "menu.show_images": "true",
  "restaurant.name": "",
  "restaurant.phone": "",
  "restaurant.logo": "",
};

export async function GET() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: PUBLIC_KEYS } },
  });
  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return NextResponse.json(settings);
}
