import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateReservationAdminSchema } from "@/lib/validators";
import { assignTable, isTableFree } from "@/lib/assign-table";
import { resolveSlot, isWeekend } from "@/lib/slots";
import { parseISO, startOfDay, addMinutes, format } from "date-fns";
import { nanoid } from "nanoid";
import { emitEvent } from "@/lib/sse";

function generateCode() {
  return "BCK-" + nanoid(6).toUpperCase();
}

function getTurnIndex(time: string) {
  const [h] = time.split(":").map(Number);
  return h < 21 ? 0 : 1;
}

export async function GET(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const statusParam = searchParams.get("status");
  const roomParam = searchParams.get("roomId");

  const where: Record<string, unknown> = {};
  if (dateParam) {
    const d = startOfDay(parseISO(dateParam));
    where.date = { gte: d, lt: new Date(format(addMinutes(d, 24 * 60), "yyyy-MM-dd")) };
  }
  if (statusParam) {
    const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean);
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  if (roomParam) where.table = { roomId: roomParam };

  const reservations = await prisma.reservation.findMany({
    where,
    include: { table: { include: { room: true } } },
    orderBy: [{ date: "asc" }, { time: "asc" }, { insertionSeq: "asc" }],
  });

  return NextResponse.json(reservations);
}

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = CreateReservationAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { customerName, phone, partySize, date: dateStr, time, notes, extraTableIds } = parsed.data;
    const manualTableId = parsed.data.tableId;

    const date = startOfDay(parseISO(dateStr));
    const weekend = isWeekend(date);
    const turnIdx = weekend ? getTurnIndex(time) : 0;

    let effectiveTime: string;
    let primaryTableId: string | null;
    let linkedIds: string[] = extraTableIds ?? [];

    if (manualTableId) {
      effectiveTime = time;
      primaryTableId = manualTableId;
      const allTableIds = [manualTableId, ...linkedIds];
      for (const tid of allTableIds) {
        const free = await isTableFree(tid, date, effectiveTime);
        if (!free) {
          return NextResponse.json(
            { error: `Il tavolo selezionato non è disponibile a quest'orario` },
            { status: 409 }
          );
        }
      }
    } else {
      effectiveTime = await resolveSlot(time, date, weekend, turnIdx);
      primaryTableId = await assignTable(partySize, date, effectiveTime);
      if (!primaryTableId) {
        return NextResponse.json(
          { error: `Nessun tavolo disponibile per ${partySize} persone a quest'orario` },
          { status: 409 }
        );
      }
      linkedIds = [];
    }

    let code = generateCode();
    let attempts = 0;
    while (await prisma.reservation.findUnique({ where: { code } }) && attempts < 5) {
      code = generateCode(); attempts++;
    }

    const reservation = await prisma.reservation.create({
      data: {
        code, customerName, phone, partySize, date,
        time: effectiveTime, tableId: primaryTableId,
        extraTableIds: linkedIds,
        ...(notes !== undefined ? { notes } : {}),
        source: "ADMIN",
      },
      include: { table: { include: { room: true } } },
    });

    emitEvent("reservation_created", { id: reservation.id });
    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reservations]", err);
    const name = err instanceof Error ? err.name : "Error";
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `[${name}] ${msg}` }, { status: 500 });
  }
}
