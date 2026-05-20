import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSaSessionCookie, setSaPendingCookie } from "@/lib/sa-auth";

export async function POST(req: Request) {
  const { email, password } = await req.json() as { email?: string; password?: string };
  if (!email || !password)
    return NextResponse.json({ error: "Credenziali mancanti" }, { status: 400 });

  const sa = await prisma.superAdmin.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!sa) return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });

  const valid = await compare(password, sa.password);
  if (!valid) return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });

  if (sa.totpEnabled) {
    await setSaPendingCookie(sa.id);
    return NextResponse.json({ requiresTotp: true });
  }

  await setSaSessionCookie(sa.id);
  return NextResponse.json({ ok: true });
}
