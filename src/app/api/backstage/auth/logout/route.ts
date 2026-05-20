import { NextResponse } from "next/server";
import { clearSaCookies } from "@/lib/sa-auth";

export async function POST() {
  clearSaCookies();
  return NextResponse.json({ ok: true });
}
