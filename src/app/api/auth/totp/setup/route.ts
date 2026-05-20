import { NextResponse } from "next/server";
import { totpGenerateSecret } from "@/lib/totp";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const secret = totpGenerateSecret();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const label = encodeURIComponent(user?.email ?? session.user.email);
  const issuer = encodeURIComponent("Gestionale");
  const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  return NextResponse.json({ secret, otpauthUrl });
}
