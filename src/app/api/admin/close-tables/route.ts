import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const result = await prisma.reservation.updateMany({
    where: { status: "ARRIVED" },
    data: { status: "CHECKED_OUT", checkedOutAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
