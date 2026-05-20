import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totpVerify } from "@/lib/totp";
import {
  getSaPendingId,
  setSaSessionCookie,
  clearSaCookies,
} from "@/lib/sa-auth";

export async function POST(req: Request) {
  const pendingId = await getSaPendingId();
  if (!pendingId)
    return NextResponse.json({ error: "Sessione scaduta, effettua di nuovo il login" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code) return NextResponse.json({ error: "Codice mancante" }, { status: 400 });

  const sa = await prisma.superAdmin.findUnique({ where: { id: pendingId } });
  if (!sa || !sa.totpEnabled || !sa.totpSecret)
    return NextResponse.json({ error: "2FA non configurato" }, { status: 400 });

  const valid = totpVerify(code.replace(/\s/g, ""), sa.totpSecret);
  if (!valid) return NextResponse.json({ error: "Codice non valido" }, { status: 400 });

  clearSaCookies();
  await setSaSessionCookie(sa.id);
  return NextResponse.json({ ok: true });
}
