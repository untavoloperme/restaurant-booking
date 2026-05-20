import { NextResponse } from "next/server";
import { totpVerify } from "@/lib/totp";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code) return NextResponse.json({ error: "Codice mancante" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.totpSecret)
    return NextResponse.json({ error: "Avvia prima la configurazione 2FA" }, { status: 400 });

  const valid = totpVerify(code, user.totpSecret);
  if (!valid) return NextResponse.json({ error: "Codice non valido" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: true },
  });

  return NextResponse.json({ ok: true });
}
