import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";
import { listAccounts } from "@/lib/sendapp";

export async function GET(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const queryToken = searchParams.get("token");

  let token = queryToken ?? "";
  if (!token) {
    const row = await prisma.setting.findUnique({ where: { key: "whatsapp.api.token" } });
    token = row?.value ?? "";
  }

  if (!token) return NextResponse.json({ error: "Token non configurato" }, { status: 400 });

  try {
    const accounts = await listAccounts(token);
    return NextResponse.json(accounts);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
