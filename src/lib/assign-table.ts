import { prisma } from "./prisma";
import { format, addMinutes, isBefore, isAfter, parse } from "date-fns";
import { isWeekend } from "./slots";

const MEAL_DURATION_MIN = 105;

function parseTime(t: string): Date {
  return parse(t, "HH:mm", new Date(0));
}

function getTurnIndex(time: string): number {
  const t = parseTime(time);
  const turn1End = parseTime("21:00");
  return isBefore(t, turn1End) ? 0 : 1;
}

function tableOccupiedByRes(
  tableId: string,
  res: { time: string; tableId: string | null; extraTableIds: string[] }
): boolean {
  return res.tableId === tableId || (res.extraTableIds ?? []).includes(tableId);
}

function timesConflict(
  aTime: string,
  bTime: string,
  weekend: boolean,
  turnIdx: number
): boolean {
  if (weekend) {
    return getTurnIndex(aTime) === turnIdx && getTurnIndex(bTime) === turnIdx;
  }
  const aStart = parseTime(aTime);
  const aEnd = addMinutes(aStart, MEAL_DURATION_MIN);
  const bStart = parseTime(bTime);
  const bEnd = addMinutes(bStart, MEAL_DURATION_MIN);
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
}

/**
 * Assegna il tavolo più piccolo che ospita partySize, libero nel time-slot.
 * Hard rule: un tavolo = una prenotazione per turno (nessun mix).
 */
export async function assignTable(
  partySize: number,
  date: Date,
  time: string,
  excludeReservationId?: string
): Promise<string | null> {
  const dateStr = format(date, "yyyy-MM-dd");
  const weekend = isWeekend(date);
  const turnIdx = weekend ? getTurnIndex(time) : -1;

  const existingRes = await prisma.reservation.findMany({
    where: {
      date: {
        gte: new Date(dateStr),
        lt: new Date(format(addMinutes(new Date(dateStr), 24 * 60), "yyyy-MM-dd")),
      },
      status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { time: true, tableId: true, extraTableIds: true },
  });

  const tables = await prisma.table.findMany({
    where: { capacity: { gte: partySize }, room: { active: true } },
    orderBy: { capacity: "asc" },
  });

  for (const table of tables) {
    const hasConflict = existingRes.some(
      (r) =>
        tableOccupiedByRes(table.id, r) &&
        timesConflict(r.time, time, weekend, turnIdx)
    );
    if (!hasConflict) return table.id;
  }

  return null;
}

/** Verifica se un tavolo è libero per una prenotazione data */
export async function isTableFree(
  tableId: string,
  date: Date,
  time: string,
  excludeReservationId?: string
): Promise<boolean> {
  const dateStr = format(date, "yyyy-MM-dd");
  const weekend = isWeekend(date);
  const turnIdx = weekend ? getTurnIndex(time) : -1;

  const existing = await prisma.reservation.findMany({
    where: {
      date: {
        gte: new Date(dateStr),
        lt: new Date(format(addMinutes(new Date(dateStr), 24 * 60), "yyyy-MM-dd")),
      },
      status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { time: true, tableId: true, extraTableIds: true },
  });

  return !existing.some(
    (r) =>
      tableOccupiedByRes(tableId, r) &&
      timesConflict(r.time, time, weekend, turnIdx)
  );
}
