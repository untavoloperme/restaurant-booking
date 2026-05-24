import { prisma } from "./prisma";
import { format, addMinutes, isBefore, isAfter, parse } from "date-fns";
import { isWeekend, Shift } from "./slots";

const MEAL_DURATION_MIN = 105;

function parseTime(t: string): Date {
  return parse(t, "HH:mm", new Date(0));
}

function timeInTurn(time: string, turn: Shift): boolean {
  const t = parseTime(time);
  return !isBefore(t, parseTime(turn.start)) && isBefore(t, parseTime(turn.end));
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
  turn: Shift | null
): boolean {
  if (weekend && turn) {
    // Both times must fall inside the same configured turn to be a conflict
    return timeInTurn(aTime, turn) && timeInTurn(bTime, turn);
  }
  const aStart = parseTime(aTime);
  const aEnd = addMinutes(aStart, MEAL_DURATION_MIN);
  const bStart = parseTime(bTime);
  const bEnd = addMinutes(bStart, MEAL_DURATION_MIN);
  return isBefore(aStart, bEnd) && isAfter(aEnd, bStart);
}

async function getWeekendTurn(time: string, date: Date): Promise<Shift | null> {
  const dayOfWeek = date.getDay();
  const hoursConfig = await prisma.openingHours.findUnique({ where: { dayOfWeek } });
  if (!hoursConfig) return null;
  const turns: Shift[] = hoursConfig.shifts as unknown as Shift[];
  return turns.find((t) => timeInTurn(time, t)) ?? (turns.length > 0 ? turns[turns.length - 1] : null);
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
  const turn = weekend ? await getWeekendTurn(time, date) : null;

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
        timesConflict(r.time, time, weekend, turn)
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
  const turn = weekend ? await getWeekendTurn(time, date) : null;

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
      timesConflict(r.time, time, weekend, turn)
  );
}
