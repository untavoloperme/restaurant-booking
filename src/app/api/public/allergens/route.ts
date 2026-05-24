import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const allergens = await prisma.allergen.findMany({ orderBy: { number: "asc" } });
  return NextResponse.json(allergens);
}
