import * as chrono from "chrono-node";
import { addDays, format, startOfDay, isToday, isTomorrow } from "date-fns";

export interface ParsedDate {
  date: Date;
  time?: string; // "HH:mm"
  confidence: "high" | "low";
}

const it = chrono.it;

// Override locuzioni italiane non gestite da chrono
function preprocessInput(input: string): string {
  const lower = input.toLowerCase().trim();
  const today = new Date();

  const overrides: Array<[RegExp, () => string]> = [
    [/\bdopodomani\b/, () => format(addDays(today, 2), "d MMMM yyyy")],
    [/\bdomani\b/, () => format(addDays(today, 1), "d MMMM yyyy")],
    [/\boggi\b/, () => format(today, "d MMMM yyyy")],
    // "stasera" → oggi sera (senza ora specifica, la gestiamo nel chatbot)
    [/\bstasera\b/, () => `oggi sera`],
    [/\bdomani sera\b/, () => `${format(addDays(today, 1), "d MMMM yyyy")} sera`],
    [/\bdomani a pranzo\b/, () => `${format(addDays(today, 1), "d MMMM yyyy")} pranzo`],
  ];

  let result = lower;
  for (const [pattern, replacer] of overrides) {
    result = result.replace(pattern, replacer());
  }
  return result;
}

function extractTimeFromResult(result: chrono.ParsedResult): string | undefined {
  const start = result.start;
  if (!start.isCertain("hour")) return undefined;
  const hour = start.get("hour") ?? 0;
  const minute = start.get("minute") ?? 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isSera(input: string): boolean {
  return /\bsera\b|\bcena\b|\bserale\b/i.test(input);
}

function isPranzo(input: string): boolean {
  return /\bpranzo\b|\bmezzogiorno\b/i.test(input);
}

export function parseNaturalDate(input: string, refDate: Date = new Date()): ParsedDate | null {
  const preprocessed = preprocessInput(input);
  const results = it.parse(preprocessed, refDate, { forwardDate: true });

  if (!results || results.length === 0) {
    // Prova con il testo originale
    const fallback = it.parse(input, refDate, { forwardDate: true });
    if (!fallback || fallback.length === 0) return null;
    results.push(...fallback);
  }

  const best = results[0];
  const date = startOfDay(best.start.date());

  // Estrai orario se presente nel testo
  const time = extractTimeFromResult(best);

  // Se non c'è ora ma c'è indizio di sera/pranzo, lasciamo null (chatbot chiederà)
  // ma segnaliamo al caller tramite il contesto

  return {
    date,
    time,
    confidence: best.start.isCertain("day") ? "high" : "low",
  };
}

/** Suggerisce se l'utente intende la fascia sera o pranzo */
export function inferMealContext(input: string): "pranzo" | "cena" | null {
  if (isPranzo(input)) return "pranzo";
  if (isSera(input)) return "cena";
  return null;
}

export function formatDateIT(date: Date): string {
  if (isToday(date)) return "oggi";
  if (isTomorrow(date)) return "domani";
  const days = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const months = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}
