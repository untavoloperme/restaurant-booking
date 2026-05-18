import { prisma } from "./prisma";
import { format, addMinutes, isBefore, isAfter, parse } from "date-fns";
import { isWeekend } from "./slots";

const MEAL_DURATION_MIN = 105;

const WEEKEND_TURNS = [
  { start: "19:00", end: "21:00" },
  { start: "21:00", end: "23:00" },
];

function parseTime(t: string): Date {
  return parse(t, "HH:mm", new Date(0));
}

function getTurnIndex(time: string): number {
  const t = parseTime(time);
  const turn1End = parseTime("21:00");
  return isBefore(t, turn1End) ? 0 : 1;
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
    select: { time: true, tableId: true },
  });

  const tables = await prisma.table.findMany({
    where: { capacity: { gte: partySize } },
    orderBy: { capacity: "asc" },
  });

  for (const table of tables) {
    const hasConflict = existingRes.some((r) => {
      if (r.tableId !== table.id) return false;
      if (weekend) {
        const rTurn = getTurnIndex(r.time);
        return rTurn === turnIdx;
      } else {
        const rStart = parseTime(r.time);
        const rEnd = addMinutes(rStart, MEAL_DURATION_MIN);
        const slotStart = parseTime(time);
        const slotEnd = addMinutes(slotStart, MEAL_DURATION_MIN);
        return isBefore(rStart, slotEnd) && isAfter(rEnd, slotStart);
      }
    });
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

  const conflicts = await prisma.reservation.findMany({
    where: {
      tableId,
      date: {
        gte: new Date(dateStr),
        lt: new Date(format(addMinutes(new Date(dateStr), 24 * 60), "yyyy-MM-dd")),
      },
      status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_OUT"] },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
    select: { time: true },
  });

  for (const r of conflicts) {
    if (weekend) {
      if (getTurnIndex(r.time) === turnIdx) return false;
    } else {
      const rStart = parseTime(r.time);
      const rEnd = addMinutes(rStart, MEAL_DURATION_MIN);
      const slotStart = parseTime(time);
      const slotEnd = addMinutes(slotStart, MEAL_DURATION_MIN);
      if (isBefore(rStart, slotEnd) && isAfter(rEnd, slotStart)) return false;
    }
  }
  return true;
}
