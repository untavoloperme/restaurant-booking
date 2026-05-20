import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({
      where: { order: { status: { in: ["RECEIVED", "PREPARING", "READY"] } } },
    });
    await tx.order.deleteMany({
      where: { status: { in: ["RECEIVED", "PREPARING", "READY"] } },
    });
  });

  return NextResponse.json({ ok: true });
}
