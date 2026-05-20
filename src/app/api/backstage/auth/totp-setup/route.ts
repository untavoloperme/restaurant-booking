import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { totpGenerateSecret } from "@/lib/totp";
import { getSaSession } from "@/lib/sa-auth";

export async function POST() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const secret = totpGenerateSecret();
  await prisma.superAdmin.update({
    where: { id: session.id },
    data: { totpSecret: secret, totpEnabled: false },
  });

  const sa = await prisma.superAdmin.findUnique({ where: { id: session.id } });
  const label = encodeURIComponent(sa?.email ?? "");
  const issuer = encodeURIComponent("Backstage");
  const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  return NextResponse.json({ secret, otpauthUrl });
}
