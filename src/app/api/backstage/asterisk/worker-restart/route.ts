import { NextResponse } from "next/server";
import { getSaSession } from "@/lib/sa-auth";
import { execSync } from "child_process";

export async function POST() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  try {
    execSync("pm2 restart asterisk-bridge", { timeout: 10_000 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
