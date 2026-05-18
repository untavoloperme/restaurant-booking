import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const TableSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1, "Nome/numero obbligatorio"),
  capacity: z.number().int().refine((v) => [4, 6, 8, 10].includes(v), {
    message: "Capacità deve essere 4, 6, 8 o 10",
  }),
  shape: z.enum(["round", "square", "rect"]).default("round"),
  x: z.number(),
  y: z.number(),
  width: z.number().default(90),
  height: z.number().default(90),
  rotation: z.number().default(0),
});

export async function GET(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const tables = await prisma.table.findMany({
    where: roomId ? { roomId } : undefined,
    include: { room: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tables);
}

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = TableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const table = await prisma.table.create({ data: parsed.data });
    return NextResponse.json(table, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nome già esistente in questa sala" }, { status: 409 });
  }
}

// Bulk save layout (upsert all tables for a room)
export async function PUT(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { roomId, tables } = await req.json();
  if (!roomId || !Array.isArray(tables)) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.table.deleteMany({ where: { roomId } });
    if (tables.length > 0) {
      await tx.table.createMany({
        data: tables.map((t: Record<string, unknown>) => ({
          roomId,
          name: t.name as string,
          capacity: t.capacity as number,
          shape: (t.shape as string) ?? "round",
          x: t.x as number,
          y: t.y as number,
          width: (t.width as number) ?? 90,
          height: (t.height as number) ?? 90,
          rotation: (t.rotation as number) ?? 0,
        })),
      });
    }
  });

  const updated = await prisma.table.findMany({ where: { roomId }, orderBy: { name: "asc" } });
  return NextResponse.json(updated);
}
