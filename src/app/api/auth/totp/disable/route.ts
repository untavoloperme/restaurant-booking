import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { password } = await req.json() as { password?: string };
  if (!password) return NextResponse.json({ error: "Password mancante" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const valid = await compare(password, user.password);
  if (!valid) return NextResponse.json({ error: "Password non corretta" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: false, totpSecret: null },
  });

  return NextResponse.json({ ok: true });
}
