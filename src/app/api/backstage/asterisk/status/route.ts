import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const keys = [
    "asterisk.status.registered",
    "asterisk.status.peer_state",
    "asterisk.status.last_check",
    "asterisk.status.worker_alive",
  ];
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const workerAlive = m["asterisk.status.worker_alive"];
  const workerActive = workerAlive
    ? Date.now() - new Date(workerAlive).getTime() < 90_000
    : false;

  return NextResponse.json({
    registered: m["asterisk.status.registered"] === "true",
    peerState: m["asterisk.status.peer_state"] ?? null,
    lastCheck: m["asterisk.status.last_check"] ?? null,
    workerAlive,
    workerActive,
  });
}
