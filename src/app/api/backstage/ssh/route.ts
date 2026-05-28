import { NextResponse } from "next/server";
import { getSaSession } from "@/lib/sa-auth";
import { execSync } from "child_process";

function getSshStatus(): boolean {
  try {
    // SSH usa socket activation: è "attivo" se ssh.service O ssh.socket sono up
    const svc = execSync("systemctl is-active ssh", { timeout: 5_000 }).toString().trim();
    if (svc === "active") return true;
    const sock = execSync("systemctl is-active ssh.socket", { timeout: 5_000 }).toString().trim();
    return sock === "active";
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  return NextResponse.json({ active: getSshStatus() });
}

export async function POST(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { action } = (await req.json()) as { action: "start" | "stop" };
  if (action !== "start" && action !== "stop") {
    return NextResponse.json({ error: "action deve essere start o stop" }, { status: 400 });
  }

  try {
    if (action === "stop") {
      // Ferma sia il servizio che il socket, altrimenti il socket riattiva il servizio alla prossima connessione
      execSync("systemctl stop ssh ssh.socket", { timeout: 10_000 });
    } else {
      execSync("systemctl start ssh", { timeout: 10_000 });
    }
    return NextResponse.json({ ok: true, active: action === "start" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
