import { NextResponse } from "next/server";
import { getSaSession } from "@/lib/sa-auth";
import { execSync } from "child_process";
import { existsSync } from "fs";

export async function GET(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const lines = Math.min(parseInt(new URL(req.url).searchParams.get("lines") ?? "50", 10), 200);

  const outLog = "/root/.pm2/logs/asterisk-bridge-out.log";
  const errLog = "/root/.pm2/logs/asterisk-bridge-error.log";

  try {
    const files = [outLog, errLog].filter(existsSync).join(" ");
    if (!files) return NextResponse.json({ output: "Nessun file di log trovato." });
    const out = execSync(`tail -n ${lines} ${files}`, { timeout: 5000 }).toString();
    return NextResponse.json({ output: out });
  } catch (e) {
    return NextResponse.json({ output: (e as Error).message });
  }
}
