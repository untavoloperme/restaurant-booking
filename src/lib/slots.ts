import { prisma } from "./prisma";
import { format, parseISO, addMinutes, isAfter, isBefore, parse } from "date-fns";

export interface Shift {
  start: string; // "HH:mm"
  end: string;
}

export interface AvailableSlot {
  time: string; // "HH:mm"
  shift: number; // 0 o 1 (indice del turno per weekend)
}

const WEEKEND_TURNS: Shift[] = [
  { start: "19:00", end: "21:00" },
  { start: "21:00", end: "23:00" },
];

const MEAL_DURATION_MIN = 105; // durata media seduta feriale

function parseTime(t: string): Date {
  return parse(t, "HH:mm", new Date(0));
}

function addMins(t: string, mins: number): string {
  const d = addMinutes(parseTime(t), mins);
  return format(d, "HH:mm");
}

function timeInShift(time: string, shift: Shift): boolean {
  const t = parseTime(time);
  const start = parseTime(shift.start);
  const end = parseTime(shift.end);
  return !isBefore(t, start) && isBefore(t, end);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Calcola gli slot disponibili per una data, considerando party size */
export async function getAvailableSlots(
  date: Date,
  partySize: number
): Promise<AvailableSlot[]> {
  const dayOfWeek = date.getDay();
  const dateStr = format(date, "yyyy-MM-dd");

  // Verifica giorno chiusura
  const closure = await prisma.closureDay.findFirst({
    where: { date: { gte: new Date(dateStr), lt: new Date(format(addMinutes(date, 24 * 60), "yyyy-MM-dd")) } },
  });
  if (closure) return [];

  const hoursConfig = await prisma.openingHours.findUnique({ where: { dayOfWeek } });
  if (!hoursConfig || !hoursConfig.active) return [];

  const weekend = isWeekend(date);
  const turns: Shift[] = weekend
    ? WEEKEND_TURNS
    : (hoursConfig.shifts as unknown as Shift[]);
  const interval = hoursConfig.slotInterval;

  const allTables = await prisma.table.findMany({ select: { id: true, capacity: true } });
  if (allTables.length === 0) return [];

  // Prenotazioni esistenti per quella data (non cancellate)
  const existingRes = await prisma.reservation.findMany({
    where: {
      date: {
        gte: new Date(dateStr),
        lt: new Date(format(addMinutes(new Date(dateStr), 24 * 60), "yyyy-MM-dd")),
      },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: { time: true, tableId: true, partySize: true },
  });

  const result: AvailableSlot[] = [];

  for (let turnIdx = 0; turnIdx < turns.length; turnIdx++) {
    const turn = turns[turnIdx];
    let current = turn.start;

    while (true) {
      // Lo slot deve lasciare almeno MEAL_DURATION_MIN prima della fine turno (per feriali)
      // Per weekend: ogni turno è separato (19-21 e 21-23), si prenota l'inizio turno
      const slotEnd = weekend
        ? turn.end
        : addMins(current, MEAL_DURATION_MIN);

      if (weekend) {
        // Per il weekend, aggiungiamo solo lo slot di inizio turno (19:00 o 21:00)
        // con scivolamento applicato internamente
      } else {
        if (!isBefore(parseTime(current), parseTime(turn.end)) ||
            isAfter(parseTime(slotEnd), parseTime(turn.end))) {
          break;
        }
      }

      // Conta prenotazioni a quest'orario
      const countAtTime = existingRes.filter((r) => r.time === current).length;

      // Regola scivolamento: ogni 3 prenotazioni allo stesso orario, sposta di +15 min
      let effectiveTime = current;
      let checkCount = countAtTime;
      while (checkCount >= 3) {
        effectiveTime = addMins(effectiveTime, 15);
        checkCount = existingRes.filter((r) => r.time === effectiveTime).length;
        // Verifica che il nuovo slot sia ancora nel turno
        if (!timeInShift(effectiveTime, turn)) {
          effectiveTime = null!;
          break;
        }
      }

      if (effectiveTime) {
        // Verifica capacità: ci deve essere almeno un tavolo libero per il party
        const canFit = await checkTableAvailability(effectiveTime, date, partySize, existingRes, allTables, weekend, turnIdx, turns);
        if (canFit) {
          // Evita duplicati
          if (!result.find((s) => s.time === effectiveTime && s.shift === turnIdx)) {
            result.push({ time: effectiveTime, shift: turnIdx });
          }
        }
      }

      if (weekend) break; // Per weekend aggiungiamo solo uno slot per turno
      current = addMins(current, interval);
    }
  }

  return result;
}

async function checkTableAvailability(
  time: string,
  date: Date,
  partySize: number,
  existingRes: Array<{ time: string; tableId: string | null; partySize: number }>,
  allTables: Array<{ id: string; capacity: number }>,
  weekend: boolean,
  turnIdx: number,
  turns: Shift[]
): Promise<boolean> {
  const compatibleTables = allTables.filter((t) => t.capacity >= partySize);
  if (compatibleTables.length === 0) return false;

  for (const table of compatibleTables) {
    const hasConflict = existingRes.some((r) => {
      if (r.tableId !== table.id) return false;
      if (weekend) {
        // Stesso turno = conflitto
        return r.time >= turns[turnIdx].start && r.time < turns[turnIdx].end;
      } else {
        // Finestra temporale MEAL_DURATION_MIN
        const rStart = parseTime(r.time);
        const rEnd = addMinutes(rStart, MEAL_DURATION_MIN);
        const slotStart = parseTime(time);
        const slotEnd = addMinutes(slotStart, MEAL_DURATION_MIN);
        return isBefore(rStart, slotEnd) && isAfter(rEnd, slotStart);
      }
    });
    if (!hasConflict) return true;
  }
  return false;
}

/** Applica la regola di scivolamento a un orario preciso */
export async function resolveSlot(
  requestedTime: string,
  date: Date,
  weekend: boolean,
  turnIdx: number
): Promise<string> {
  const dateStr = format(date, "yyyy-MM-dd");
  const existingRes = await prisma.reservation.findMany({
    where: {
      date: { gte: new Date(dateStr), lt: new Date(format(addMinutes(new Date(dateStr), 24 * 60), "yyyy-MM-dd")) },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    select: { time: true },
  });

  let effectiveTime = requestedTime;
  let count = existingRes.filter((r) => r.time === effectiveTime).length;
  const turn = weekend ? WEEKEND_TURNS[turnIdx] : { start: "00:00", end: "23:59" };

  while (count >= 3) {
    effectiveTime = addMins(effectiveTime, 15);
    if (!timeInShift(effectiveTime, turn)) break;
    count = existingRes.filter((r) => r.time === effectiveTime).length;
  }

  return effectiveTime;
}
