import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing slots
vi.mock("../prisma", () => ({
  prisma: {
    closureDay: { findFirst: vi.fn().mockResolvedValue(null) },
    openingHours: { findUnique: vi.fn() },
    table: { findMany: vi.fn() },
    reservation: { findMany: vi.fn().mockResolvedValue([]) },
    setting: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { getAvailableSlots, isWeekend } from "../slots";
import { prisma } from "../prisma";

const mockPrisma = prisma as unknown as {
  closureDay: { findFirst: ReturnType<typeof vi.fn> };
  openingHours: { findUnique: ReturnType<typeof vi.fn> };
  table: { findMany: ReturnType<typeof vi.fn> };
  reservation: { findMany: ReturnType<typeof vi.fn> };
  setting: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.closureDay.findFirst.mockResolvedValue(null);
  mockPrisma.reservation.findMany.mockResolvedValue([]);
  // default drift: soglia 3, step 15 min (valori di default se non presenti in DB)
  mockPrisma.setting.findMany.mockResolvedValue([]);
});

describe("isWeekend", () => {
  it("identifica il sabato come weekend", () => {
    const sabato = new Date("2026-05-23"); // Sabato
    expect(isWeekend(sabato)).toBe(true);
  });

  it("identifica la domenica come weekend", () => {
    const domenica = new Date("2026-05-24");
    expect(isWeekend(domenica)).toBe(true);
  });

  it("identifica il lunedì come feriale", () => {
    const lunedi = new Date("2026-05-25");
    expect(isWeekend(lunedi)).toBe(false);
  });
});

describe("getAvailableSlots", () => {
  it("ritorna [] per giorno di chiusura", async () => {
    mockPrisma.closureDay.findFirst.mockResolvedValue({ id: "1", date: new Date() });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const slots = await getAvailableSlots(tomorrow, 2);
    expect(slots).toEqual([]);
  });

  it("ritorna [] per giorno non attivo", async () => {
    mockPrisma.openingHours.findUnique.mockResolvedValue({ dayOfWeek: 1, active: false, shifts: [], slotInterval: 15 });
    mockPrisma.table.findMany.mockResolvedValue([{ id: "t1", capacity: 4 }]);
    const next = new Date("2026-05-25"); // Lunedì
    const slots = await getAvailableSlots(next, 2);
    expect(slots).toEqual([]);
  });

  it("per weekend ritorna slot 19:00 e 21:00", async () => {
    const sabato = new Date("2026-05-30"); // Sabato
    mockPrisma.openingHours.findUnique.mockResolvedValue({
      dayOfWeek: 6, active: true,
      shifts: [{ start: "19:00", end: "21:00" }, { start: "21:00", end: "23:00" }], slotInterval: 15,
    });
    mockPrisma.table.findMany.mockResolvedValue([{ id: "t1", capacity: 4 }]);
    const slots = await getAvailableSlots(sabato, 4);
    const times = slots.map((s) => s.time);
    expect(times).toContain("19:00");
    expect(times).toContain("21:00");
  });

  it("regola scivolamento: 3 prenotazioni allo stesso orario → propone +15 min", async () => {
    const domani = new Date("2026-05-25"); // Lunedì
    mockPrisma.openingHours.findUnique.mockResolvedValue({
      dayOfWeek: 1, active: true,
      shifts: [{ start: "19:00", end: "23:00" }], slotInterval: 15,
    });
    mockPrisma.table.findMany.mockResolvedValue([
      { id: "t1", capacity: 4 },
      { id: "t2", capacity: 4 },
      { id: "t3", capacity: 4 },
      { id: "t4", capacity: 4 },
    ]);
    // 3 prenotazioni alle 19:00 (tavoli occupati t1,t2,t3)
    mockPrisma.reservation.findMany.mockResolvedValue([
      { time: "19:00", tableId: "t1", partySize: 4 },
      { time: "19:00", tableId: "t2", partySize: 4 },
      { time: "19:00", tableId: "t3", partySize: 4 },
    ]);
    const slots = await getAvailableSlots(domani, 4);
    // 19:00 ha 3 prenotazioni → scivolamento: il primo slot proposto deve essere 19:15
    const times = slots.map((s) => s.time);
    expect(times).toContain("19:15");
    expect(times).not.toContain("19:00");
    expect(times.length).toBeGreaterThan(0);
  });
});
