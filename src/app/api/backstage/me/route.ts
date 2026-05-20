import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const sa = await prisma.superAdmin.findUnique({
    where: { id: session.id },
    select: { email: true, totpEnabled: true },
  });
  if (!sa) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  return NextResponse.json(sa);
}
