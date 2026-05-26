"use client";

import { useState, useEffect, useRef } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  getDaysInMonth,
  getDay,
  startOfDay,
  addMinutes,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarDays,
  Clock,
  User,
  Phone,
  CheckCircle2,
  ArrowLeft,
  UtensilsCrossed,
  Loader2,
  NotebookText,
  CalendarPlus,
  RefreshCw,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────

const MONTHS_IT = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",
];
const DAYS_SHORT = ["Lu","Ma","Me","Gi","Ve","Sa","Do"];
const DOW_IT = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];
const PHONE_RE = /^(\+39\s?)?3\d{2}[\s-]?\d{6,7}$/;

// ── Types ──────────────────────────────────────────────────────────────────

type Step = "party-size" | "date" | "time" | "info" | "summary" | "confirmed";

interface Slot { time: string; shift: number }
interface BookingResult { code: string; time: string; table: string | null }

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateIT(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${DOW_IT[d.getDay()]} ${day} ${MONTHS_IT[month - 1].toLowerCase()} ${year}`;
}

function generateICS(
  dateStr: string,
  time: string,
  partySize: number,
  code: string,
  restaurantName: string,
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, min] = time.split(":").map(Number);
  const p = (n: number) => String(n).padStart(2, "0");
  const startDt = `${year}${p(month)}${p(day)}T${p(hour)}${p(min)}00`;
  const endDate = addMinutes(new Date(year, month - 1, day, hour, min), 105);
  const endDt = `${endDate.getFullYear()}${p(endDate.getMonth() + 1)}${p(endDate.getDate())}T${p(endDate.getHours())}${p(endDate.getMinutes())}00`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UnTavoloPer//Booking//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${code}@untavoloper.me`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:${restaurantName} – ${partySize} ${partySize === 1 ? "persona" : "persone"}`,
    `DESCRIPTION:Codice prenotazione: ${code}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function triggerICSDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function googleCalendarUrl(
  dateStr: string,
  time: string,
  partySize: number,
  code: string,
  restaurantName: string,
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, min] = time.split(":").map(Number);
  const p = (n: number) => String(n).padStart(2, "0");
  const start = `${year}${p(month)}${p(day)}T${p(hour)}${p(min)}00`;
  const endDate = addMinutes(new Date(year, month - 1, day, hour, min), 105);
  const end = `${endDate.getFullYear()}${p(endDate.getMonth() + 1)}${p(endDate.getDate())}T${p(endDate.getHours())}${p(endDate.getMinutes())}00`;
  const title = encodeURIComponent(`${restaurantName} – ${partySize} ${partySize === 1 ? "persona" : "persone"}`);
  const details = encodeURIComponent(`Codice prenotazione: ${code}`);
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["party-size", "date", "time", "info", "summary"];
  const current = steps.indexOf(step === "confirmed" ? "summary" : step);
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {steps.map((s, i) => (
        <div
          key={s}
          className={[
            "rounded-full transition-all duration-300",
            i < current
              ? "w-2 h-2 bg-amber-400"
              : i === current
              ? "w-6 h-2 bg-amber-600"
              : "w-2 h-2 bg-stone-300",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-6 pt-4 pb-2">
      <h2 className="text-xl font-bold text-stone-800 leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function CalendarGrid({
  currentMonth,
  openDays,
  openDaysLoading,
  onSelect,
  onPrev,
  onNext,
}: {
  currentMonth: Date;
  openDays: Set<string>;
  openDaysLoading: boolean;
  onSelect: (dateStr: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = startOfDay(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDow = getDay(startOfMonth(currentMonth)); // 0=Sun
  const offset = (firstDow + 6) % 7; // Mon-first offset

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const maxMonth = addMonths(today, 3);

  return (
    <div className="px-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          disabled={
            year === today.getFullYear() && month === today.getMonth()
          }
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <span className="text-base font-semibold text-stone-800">
          {MONTHS_IT[month]} {year}
        </span>
        <button
          onClick={onNext}
          disabled={
            year > maxMonth.getFullYear() ||
            (year === maxMonth.getFullYear() && month >= maxMonth.getMonth())
          }
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      {openDaysLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const date = new Date(year, month, day);
            const dateStr = format(date, "yyyy-MM-dd");
            const isPast = date < today;
            const isOpen = openDays.has(dateStr);
            const isAvail = !isPast && isOpen;
            const isToday = format(today, "yyyy-MM-dd") === dateStr;

            return (
              <div key={day} className="flex flex-col items-center py-0.5">
                <button
                  disabled={!isAvail}
                  onClick={() => onSelect(dateStr)}
                  className={[
                    "w-10 h-10 rounded-full text-sm font-medium flex items-center justify-center transition-all duration-150 select-none",
                    isAvail
                      ? "text-stone-800 hover:bg-amber-100 active:bg-amber-200 active:scale-95 cursor-pointer"
                      : "text-stone-300 cursor-not-allowed",
                    isToday && isAvail ? "ring-2 ring-amber-400 ring-offset-1" : "",
                    isToday && !isAvail ? "ring-2 ring-stone-200 ring-offset-1" : "",
                  ].join(" ")}
                >
                  {day}
                </button>
                <span
                  className={[
                    "w-1 h-1 rounded-full mt-0.5",
                    isAvail ? "bg-amber-500" : "bg-transparent",
                  ].join(" ")}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PrenotaPage() {
  const [step, setStep] = useState<Step>("party-size");
  const [partySize, setPartySize] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [restaurantName, setRestaurantName] = useState("Ristorante");
  const [calendarAdded, setCalendarAdded] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return startOfMonth(d);
  });
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());
  const [openDaysLoading, setOpenDaysLoading] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to top on step change
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [step]);

  // Fetch restaurant name once
  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data["restaurant.name"]) setRestaurantName(data["restaurant.name"]);
      })
      .catch(() => {});
  }, []);

  // Fetch open days when on date step or month changes
  useEffect(() => {
    if (step !== "date") return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    setOpenDaysLoading(true);
    fetch(`/api/public/open-days?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => setOpenDays(new Set(data.openDays ?? [])))
      .catch(() => {})
      .finally(() => setOpenDaysLoading(false));
  }, [step, currentMonth]);

  // ── Navigation ───────────────────────────────────────────────────────────

  function goBack() {
    if (step === "date") setStep("party-size");
    else if (step === "time") setStep("date");
    else if (step === "info") setStep("time");
    else if (step === "summary") setStep("info");
  }

  function canGoBack() {
    return ["date", "time", "info", "summary"].includes(step);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handlePartySizeSelect(n: number) {
    setPartySize(n);
    setStep("date");
  }

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setSlots([]);
    setSlotsError(null);
    setStep("time");
    // Fetch slots immediately
    if (partySize) fetchSlots(dateStr, partySize);
  }

  async function fetchSlots(dateStr: string, size: number) {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const res = await fetch(`/api/public/availability?date=${dateStr}&partySize=${size}`);
      const data = await res.json();
      if (!res.ok) {
        setSlotsError(data.error ?? "Errore nel caricamento degli orari.");
        setSlots([]);
      } else {
        const s: Slot[] = Array.isArray(data.slots) ? data.slots : [];
        if (s.length === 0) {
          setSlotsError("Nessun orario disponibile per questa data. Scegli un altro giorno.");
        }
        setSlots(s);
      }
    } catch {
      setSlotsError("Errore di rete. Riprova.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    setStep("info");
  }

  function validateInfo(): boolean {
    const errs: Record<string, string> = {};
    if (firstName.trim().length < 2) errs.firstName = "Inserisci il nome (min. 2 caratteri).";
    if (lastName.trim().length < 2) errs.lastName = "Inserisci il cognome (min. 2 caratteri).";
    const cleanPhone = phone.trim().replace(/\s+/g, " ");
    if (!PHONE_RE.test(cleanPhone)) errs.phone = "Inserisci un numero di cellulare italiano valido (es. 333 1234567).";
    if (notes.length > 500) errs.notes = "Note troppo lunghe (max 500 caratteri).";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleInfoSubmit() {
    if (!validateInfo()) return;
    setStep("summary");
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedTime || !partySize) return;
    setSubmitLoading(true);
    setSubmitError(null);
    const customerName = `${firstName.trim()} ${lastName.trim()}`;
    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone: phone.trim(),
          partySize,
          date: selectedDate,
          time: selectedTime,
          notes: notes.trim() || undefined,
          source: "CHATBOT",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Prenotazione non riuscita. Riprova.");
        return;
      }
      setBooking({ code: data.code, time: data.time, table: data.table ?? null });
      setStep("confirmed");
    } catch {
      setSubmitError("Errore di rete. Verifica la connessione e riprova.");
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleAddToCalendar() {
    if (!booking || !selectedDate || !partySize) return;
    const ics = generateICS(selectedDate, booking.time, partySize, booking.code, restaurantName);
    triggerICSDownload(ics, `prenotazione-${booking.code}.ics`);
  }

  function handleReset() {
    setStep("party-size");
    setPartySize(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setNotes("");
    setFieldErrors({});
    setBooking(null);
    setCalendarAdded(false);
    setSubmitError(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const customerName = `${firstName.trim()} ${lastName.trim()}`.trim();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col" ref={topRef}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-amber-600 text-white shadow-md">
        <div className="flex items-center h-14 px-4 gap-3 max-w-md mx-auto">
          {canGoBack() && (
            <button
              onClick={goBack}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-amber-500 active:bg-amber-700 transition-colors"
              aria-label="Indietro"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <UtensilsCrossed className={`w-5 h-5 shrink-0 ${canGoBack() ? "" : "ml-1"}`} />
          <span className="font-semibold text-base truncate flex-1">{restaurantName}</span>
          {step !== "confirmed" && (
            <span className="text-xs text-amber-200 shrink-0">Prenota online</span>
          )}
        </div>
        {step !== "confirmed" && <ProgressDots step={step} />}
      </div>

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full pb-10">

        {/* ── Step: Party size ── */}
        {step === "party-size" && (
          <div className="animate-fade-in-scale">
            <StepHeader
              title="Quante persone?"
              subtitle="Seleziona il numero di ospiti per la prenotazione"
            />
            <div className="px-6 mt-4 grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => handlePartySizeSelect(n)}
                  className="aspect-square rounded-2xl text-lg font-bold bg-white border-2 border-stone-200 text-stone-700 hover:border-amber-400 hover:bg-amber-50 active:scale-95 active:bg-amber-100 transition-all duration-150 shadow-sm"
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="px-6 mt-5">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <p className="font-medium">Gruppo di più di 10 persone?</p>
                <p className="mt-1 text-amber-700">
                  Per grandi gruppi ti chiediamo di contattarci telefonicamente per trovare la soluzione migliore.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Date ── */}
        {step === "date" && (
          <div className="animate-fade-in-scale">
            <StepHeader
              title="Scegli la data"
              subtitle={`Prenotazione per ${partySize} ${partySize === 1 ? "persona" : "persone"}`}
            />
            <div className="mt-4">
              <CalendarGrid
                currentMonth={currentMonth}
                openDays={openDays}
                openDaysLoading={openDaysLoading}
                onSelect={handleDateSelect}
                onPrev={() => setCurrentMonth((m) => subMonths(m, 1))}
                onNext={() => setCurrentMonth((m) => addMonths(m, 1))}
              />
            </div>
            <p className="px-6 mt-4 text-xs text-stone-400 text-center">
              I giorni con il pallino arancione sono disponibili
            </p>
          </div>
        )}

        {/* ── Step: Time ── */}
        {step === "time" && (
          <div className="animate-fade-in-scale">
            <StepHeader
              title="Scegli l'orario"
              subtitle={selectedDate ? formatDateIT(selectedDate) : ""}
            />
            <div className="px-6 mt-5">
              {slotsLoading && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <p className="text-sm text-stone-500">Verifico disponibilità…</p>
                </div>
              )}

              {!slotsLoading && slotsError && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-5 text-center">
                  <p className="text-red-700 text-sm font-medium mb-3">{slotsError}</p>
                  <button
                    onClick={() => setStep("date")}
                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900"
                  >
                    <ArrowLeft className="w-4 h-4" /> Scegli un altro giorno
                  </button>
                </div>
              )}

              {!slotsLoading && !slotsError && slots.length > 0 && (
                <>
                  {/* Group by shift */}
                  {(() => {
                    const shifts = Array.from(new Set(slots.map((s) => s.shift))).sort();
                    return shifts.map((shiftIdx) => {
                      const shiftSlots = slots.filter((s) => s.shift === shiftIdx);
                      return (
                        <div key={shiftIdx} className={shifts.length > 1 ? "mb-6" : ""}>
                          {shifts.length > 1 && (
                            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                              {shiftIdx === 0 ? "Primo turno" : "Secondo turno"}
                            </p>
                          )}
                          <div className="grid grid-cols-3 gap-3">
                            {shiftSlots.map((slot) => (
                              <button
                                key={slot.time}
                                onClick={() => handleTimeSelect(slot.time)}
                                className="py-4 rounded-2xl bg-white border-2 border-stone-200 text-stone-800 font-mono text-lg font-semibold hover:border-amber-400 hover:bg-amber-50 active:scale-95 active:bg-amber-100 transition-all duration-150 shadow-sm"
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Step: Info ── */}
        {step === "info" && (
          <div className="animate-fade-in-scale">
            <StepHeader
              title="I tuoi dati"
              subtitle="Inserisci nome e numero per completare la prenotazione"
            />
            <div className="px-6 mt-5 space-y-4">
              {/* First name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    Nome *
                  </span>
                </label>
                <input
                  type="text"
                  autoComplete="given-name"
                  inputMode="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (fieldErrors.firstName) setFieldErrors((fe) => ({ ...fe, firstName: "" }));
                  }}
                  placeholder="Mario"
                  className={[
                    "w-full px-4 py-3.5 rounded-xl border text-stone-800 text-base bg-white",
                    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent",
                    "placeholder:text-stone-300 transition-all",
                    fieldErrors.firstName ? "border-red-400 bg-red-50" : "border-stone-200",
                  ].join(" ")}
                />
                {fieldErrors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
                )}
              </div>

              {/* Last name */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    Cognome *
                  </span>
                </label>
                <input
                  type="text"
                  autoComplete="family-name"
                  inputMode="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (fieldErrors.lastName) setFieldErrors((fe) => ({ ...fe, lastName: "" }));
                  }}
                  placeholder="Rossi"
                  className={[
                    "w-full px-4 py-3.5 rounded-xl border text-stone-800 text-base bg-white",
                    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent",
                    "placeholder:text-stone-300 transition-all",
                    fieldErrors.lastName ? "border-red-400 bg-red-50" : "border-stone-200",
                  ].join(" ")}
                />
                {fieldErrors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    Cellulare *
                  </span>
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) setFieldErrors((fe) => ({ ...fe, phone: "" }));
                  }}
                  placeholder="333 1234567"
                  className={[
                    "w-full px-4 py-3.5 rounded-xl border text-stone-800 text-base bg-white",
                    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent",
                    "placeholder:text-stone-300 transition-all",
                    fieldErrors.phone ? "border-red-400 bg-red-50" : "border-stone-200",
                  ].join(" ")}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                )}
                <p className="mt-1 text-xs text-stone-400">Numero italiano, es. 333 1234567 o +39 333 1234567</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <NotebookText className="w-3.5 h-3.5 text-stone-400" />
                    Note (facoltativo)
                  </span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (fieldErrors.notes) setFieldErrors((fe) => ({ ...fe, notes: "" }));
                  }}
                  placeholder="Allergie, occasioni speciali, richieste particolari…"
                  rows={3}
                  className={[
                    "w-full px-4 py-3.5 rounded-xl border text-stone-800 text-sm bg-white resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent",
                    "placeholder:text-stone-300 transition-all",
                    fieldErrors.notes ? "border-red-400 bg-red-50" : "border-stone-200",
                  ].join(" ")}
                />
                {fieldErrors.notes && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p>
                )}
              </div>

              <button
                onClick={handleInfoSubmit}
                className="w-full py-4 rounded-2xl bg-amber-600 text-white font-semibold text-base hover:bg-amber-700 active:scale-[0.98] transition-all duration-150 shadow-md mt-2"
              >
                Continua
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Summary ── */}
        {step === "summary" && (
          <div className="animate-fade-in-scale">
            <StepHeader
              title="Riepilogo"
              subtitle="Controlla i dettagli prima di confermare"
            />
            <div className="px-6 mt-5">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
                <SummaryRow
                  icon={<CalendarDays className="w-4 h-4 text-amber-600" />}
                  label="Data"
                  value={selectedDate ? formatDateIT(selectedDate) : "—"}
                />
                <SummaryRow
                  icon={<Clock className="w-4 h-4 text-amber-600" />}
                  label="Orario"
                  value={selectedTime ?? "—"}
                />
                <SummaryRow
                  icon={<Users className="w-4 h-4 text-amber-600" />}
                  label="Persone"
                  value={partySize ? `${partySize} ${partySize === 1 ? "persona" : "persone"}` : "—"}
                />
                <SummaryRow
                  icon={<User className="w-4 h-4 text-amber-600" />}
                  label="Nome"
                  value={customerName || "—"}
                />
                <SummaryRow
                  icon={<Phone className="w-4 h-4 text-amber-600" />}
                  label="Cellulare"
                  value={phone || "—"}
                />
                {notes.trim() && (
                  <SummaryRow
                    icon={<NotebookText className="w-4 h-4 text-amber-600" />}
                    label="Note"
                    value={notes.trim()}
                  />
                )}
              </div>

              {submitError && (
                <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={submitLoading}
                className="w-full mt-5 py-4 rounded-2xl bg-amber-600 text-white font-semibold text-base hover:bg-amber-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-md flex items-center justify-center gap-2"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Invio in corso…
                  </>
                ) : (
                  "Conferma prenotazione"
                )}
              </button>

              <button
                onClick={goBack}
                className="w-full mt-3 py-3.5 rounded-2xl border-2 border-stone-200 text-stone-600 font-medium text-sm hover:bg-stone-100 active:scale-[0.98] transition-all"
              >
                Modifica dati
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Confirmed ── */}
        {step === "confirmed" && booking && (
          <div className="animate-fade-in-scale px-6 pt-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-stone-800">Prenotato!</h2>
            <p className="text-stone-500 mt-1 text-sm">La tua prenotazione è confermata</p>

            <div className="mt-6 bg-white rounded-2xl border border-stone-200 shadow-sm w-full p-5 text-left">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Dettagli prenotazione</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-stone-700">
                    {selectedDate ? formatDateIT(selectedDate) : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-stone-700">
                    {booking.time}
                    {booking.time !== selectedTime && (
                      <span className="ml-2 text-xs text-amber-600">(orario aggiornato)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-stone-700">
                    {partySize} {partySize === 1 ? "persona" : "persone"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm text-stone-700">{customerName}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-xs text-stone-400">Codice prenotazione</p>
                <p className="text-2xl font-bold font-mono text-amber-700 tracking-wider mt-1">
                  {booking.code}
                </p>
                <p className="text-xs text-stone-400 mt-1">Conserva questo codice come riferimento</p>
              </div>
            </div>

            {/* Calendar actions */}
            <div className="mt-5 w-full space-y-3">
              <p className="text-xs text-stone-500 font-medium">Aggiungi al tuo calendario</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    handleAddToCalendar();
                    setCalendarAdded(true);
                  }}
                  className={[
                    "py-3.5 rounded-2xl border-2 text-sm font-medium flex items-center justify-center gap-2 transition-all duration-150",
                    calendarAdded
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:bg-amber-50 active:scale-95",
                  ].join(" ")}
                >
                  <CalendarPlus className="w-4 h-4" />
                  {calendarAdded ? "Salvato!" : "Scarica .ics"}
                </button>
                <a
                  href={
                    booking && selectedDate
                      ? googleCalendarUrl(selectedDate, booking.time, partySize ?? 1, booking.code, restaurantName)
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 rounded-2xl border-2 border-stone-200 bg-white text-stone-700 text-sm font-medium flex items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50 active:scale-95 transition-all duration-150"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <path d="M12 14h.01M16 14h.01M8 14h.01M12 18h.01M16 18h.01M8 18h.01"/>
                  </svg>
                  Google Cal
                </a>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="mt-6 w-full py-3.5 rounded-2xl border-2 border-stone-200 text-stone-600 font-medium text-sm hover:bg-stone-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Nuova prenotazione
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SummaryRow ─────────────────────────────────────────────────────────────

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span className="text-xs text-stone-400 w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-stone-800 font-medium flex-1">{value}</span>
    </div>
  );
}
