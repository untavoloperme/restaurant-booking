import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";

export async function POST(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { password } = await req.json() as { password?: string };
  if (!password) return NextResponse.json({ error: "Password mancante" }, { status: 400 });

  const sa = await prisma.superAdmin.findUnique({ where: { id: session.id } });
  if (!sa) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const valid = await compare(password, sa.password);
  if (!valid) return NextResponse.json({ error: "Password non corretta" }, { status: 400 });

  await prisma.superAdmin.update({
    where: { id: session.id },
    data: { totpEnabled: false, totpSecret: null },
  });
  return NextResponse.json({ ok: true });
}
