export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { setRoomSoldout } from "@/lib/soldout";
import { emitEvent } from "@/lib/sse";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { soldout } = await req.json() as { soldout: boolean };
  await setRoomSoldout(params.id, !!soldout);
  emitEvent("room_soldout_changed", { roomId: params.id, soldout: !!soldout });
  return NextResponse.json({ ok: true, soldout: !!soldout });
}
