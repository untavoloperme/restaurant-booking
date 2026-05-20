import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totpVerify } from "@/lib/totp";
import { getSaSession } from "@/lib/sa-auth";

export async function POST(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code) return NextResponse.json({ error: "Codice mancante" }, { status: 400 });

  const sa = await prisma.superAdmin.findUnique({ where: { id: session.id } });
  if (!sa?.totpSecret)
    return NextResponse.json({ error: "Avvia prima la configurazione" }, { status: 400 });

  const valid = totpVerify(code.replace(/\s/g, ""), sa.totpSecret);
  if (!valid) return NextResponse.json({ error: "Codice non valido" }, { status: 400 });

  await prisma.superAdmin.update({
    where: { id: session.id },
    data: { totpEnabled: true },
  });
  return NextResponse.json({ ok: true });
}
