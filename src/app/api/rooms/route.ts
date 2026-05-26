import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSoldoutRoomIds } from "@/lib/soldout";
import { z } from "zod";

const RoomSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  width: z.number().int().min(400).max(3000).optional().default(1000),
  height: z.number().int().min(300).max(2000).optional().default(700),
});

export async function GET() {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const [rooms, soldoutIds] = await Promise.all([
    prisma.room.findMany({
      include: { tables: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    getSoldoutRoomIds(),
  ]);
  return NextResponse.json(rooms.map((r) => ({ ...r, soldout: soldoutIds.has(r.id) })));
}

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = RoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const room = await prisma.room.create({ data: parsed.data });
  return NextResponse.json(room, { status: 201 });
}
