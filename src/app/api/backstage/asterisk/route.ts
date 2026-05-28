import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";

const AST_KEYS = [
  "asterisk.enabled",
  "asterisk.ami.host",
  "asterisk.ami.port",
  "asterisk.ami.user",
  "asterisk.ami.secret",
  "asterisk.trunk.name",
  "asterisk.trunk.username",
  "asterisk.trunk.secret",
  "asterisk.trunk.fromuser",
  "asterisk.trunk.fromdomain",
  "asterisk.trunk.host",
  "asterisk.trunk.port",
  "asterisk.trunk.context",
] as const;

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const rows = await prisma.setting.findMany({ where: { key: { in: [...AST_KEYS] } } });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const amiSecret = m["asterisk.ami.secret"] ?? "";
  const trunkSecret = m["asterisk.trunk.secret"] ?? "";

  return NextResponse.json({
    enabled: m["asterisk.enabled"] === "true",
    amiHost: m["asterisk.ami.host"] ?? "127.0.0.1",
    amiPort: m["asterisk.ami.port"] ?? "5038",
    amiUser: m["asterisk.ami.user"] ?? "",
    amiSecret: amiSecret.length > 4 ? `••••${amiSecret.slice(-4)}` : amiSecret ? "••••" : "",
    hasAmiSecret: amiSecret.length > 0,
    trunkName: m["asterisk.trunk.name"] ?? "messagenet",
    trunkUsername: m["asterisk.trunk.username"] ?? "5406386912",
    trunkSecret: trunkSecret.length > 4 ? `••••${trunkSecret.slice(-4)}` : trunkSecret ? "••••" : "",
    hasTrunkSecret: trunkSecret.length > 0,
    trunkFromuser: m["asterisk.trunk.fromuser"] ?? "5406386912",
    trunkFromdomain: m["asterisk.trunk.fromdomain"] ?? "sip.messagenet.it",
    trunkHost: m["asterisk.trunk.host"] ?? "sip.messagenet.it",
    trunkPort: m["asterisk.trunk.port"] ?? "5061",
    trunkContext: m["asterisk.trunk.context"] ?? "from-trunk",
  });
}

export async function PATCH(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const updates: Array<{ key: string; value: string }> = [];

  if (typeof body.enabled === "boolean")
    updates.push({ key: "asterisk.enabled", value: body.enabled ? "true" : "false" });
  if (typeof body.amiHost === "string" && body.amiHost.trim())
    updates.push({ key: "asterisk.ami.host", value: body.amiHost.trim() });
  if (typeof body.amiPort === "string" && body.amiPort.trim())
    updates.push({ key: "asterisk.ami.port", value: body.amiPort.trim() });
  if (typeof body.amiUser === "string")
    updates.push({ key: "asterisk.ami.user", value: body.amiUser.trim() });
  if (typeof body.amiSecret === "string" && body.amiSecret.trim())
    updates.push({ key: "asterisk.ami.secret", value: body.amiSecret.trim() });
  if (typeof body.trunkName === "string" && body.trunkName.trim())
    updates.push({ key: "asterisk.trunk.name", value: body.trunkName.trim() });
  if (typeof body.trunkUsername === "string")
    updates.push({ key: "asterisk.trunk.username", value: body.trunkUsername.trim() });
  if (typeof body.trunkSecret === "string" && body.trunkSecret.trim())
    updates.push({ key: "asterisk.trunk.secret", value: body.trunkSecret.trim() });
  if (typeof body.trunkFromuser === "string")
    updates.push({ key: "asterisk.trunk.fromuser", value: body.trunkFromuser.trim() });
  if (typeof body.trunkFromdomain === "string")
    updates.push({ key: "asterisk.trunk.fromdomain", value: body.trunkFromdomain.trim() });
  if (typeof body.trunkHost === "string")
    updates.push({ key: "asterisk.trunk.host", value: body.trunkHost.trim() });
  if (typeof body.trunkPort === "string" && body.trunkPort.trim())
    updates.push({ key: "asterisk.trunk.port", value: body.trunkPort.trim() });
  if (typeof body.trunkContext === "string")
    updates.push({ key: "asterisk.trunk.context", value: body.trunkContext.trim() });

  for (const { key, value } of updates) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  return NextResponse.json({ ok: true });
}
