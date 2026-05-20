"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseNaturalDate, formatDateIT } from "@/lib/date-parser";
import { format, addDays } from "date-fns";
import { Send, UtensilsCrossed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Step =
  | "GREETING"
  | "ASK_DATE"
  | "ASK_PARTY_SIZE"
  | "ASK_NAME"
  | "ASK_PHONE"
  | "CONFIRM"
  | "DONE";

interface Message {
  role: "bot" | "user";
  text: string;
}

interface Slot {
  time: string;
  shift: number;
}

interface HoursInfo {
  open: boolean;
  reason?: "closure" | "inactive";
  note?: string | null;
  shifts?: Array<{ start: string; end: string }>;
}

interface BookingData {
  date?: string;       // "YYYY-MM-DD"
  dateLabel?: string;
  time?: string;       // "HH:mm"
  partySize?: number;
  customerName?: string;
  phone?: string;
}

const PHONE_RE = /^(\+39\s?)?3\d{2}\s?\d{6,7}$/;

const QUICK_DATES = [
  { label: "Stasera", days: 0, mealContext: "cena" as const },
  { label: "Domani sera", days: 1, mealContext: "cena" as const },
  { label: "Domani a pranzo", days: 1, mealContext: "pranzo" as const },
];

export default function Chatbot() {
  const [step, setStep] = useState<Step>("ASK_DATE");
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Ciao! 👋 Sono qui per aiutarti a prenotare un tavolo. Quando vorresti venire?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingData>({});
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [showMoreSlots, setShowMoreSlots] = useState(false);
  const [openQuickDates, setOpenQuickDates] = useState<typeof QUICK_DATES>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const today = new Date();
    Promise.all(
      QUICK_DATES.map(async (qd) => {
        const dateStr = format(addDays(today, qd.days), "yyyy-MM-dd");
        try {
          const res = await fetch(`/api/public/hours?date=${dateStr}`);
          const info: HoursInfo = await res.json();
          return info.open ? qd : null;
        } catch {
          return qd;
        }
      })
    ).then((results) => setOpenQuickDates(results.filter(Boolean) as typeof QUICK_DATES));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  function addBotMessage(text: string) {
    setMessages((prev) => [...prev, { role: "bot", text }]);
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { role: "user", text }]);
  }

  async function selectDate(date: Date, label: string) {
    const dateStr = format(date, "yyyy-MM-dd");
    setLoading(true);
    try {
      const res = await fetch(`/api/public/hours?date=${dateStr}`);
      const info: HoursInfo = await res.json();

      if (!info.open) {
        const msg =
          info.reason === "closure"
            ? `Siamo chiusi il ${label}${info.note ? ` (${info.note})` : ""}. Scegli un altro giorno.`
            : `Non siamo aperti quel giorno della settimana. Scegli un altro giorno.`;
        addBotMessage(msg);
        return;
      }

      const shiftsText = (info.shifts ?? []).map((s) => `${s.start}–${s.end}`).join(" e ");
      setBooking((b) => ({ ...b, date: dateStr, dateLabel: label }));
      setStep("ASK_PARTY_SIZE");
      addBotMessage(
        `Perfetto, ${label}!${shiftsText ? ` Siamo aperti ${shiftsText}.` : ""} Per quante persone?`
      );
      fetchSlots(dateStr, 4);
    } catch {
      setBooking((b) => ({ ...b, date: dateStr, dateLabel: label }));
      setStep("ASK_PARTY_SIZE");
      addBotMessage(`Perfetto, ${label}! Per quante persone?`);
      fetchSlots(dateStr, 4);
    } finally {
      setLoading(false);
    }
  }

  async function handleDateInput(raw: string) {
    const parsed = parseNaturalDate(raw);
    if (!parsed) {
      addBotMessage("Non ho capito la data. Prova con 'domani sera', 'sabato', '3 giugno', ecc.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed.date < today) {
      addBotMessage("La data inserita è già passata. Scegli un giorno futuro.");
      return;
    }

    await selectDate(parsed.date, formatDateIT(parsed.date));
  }

  async function fetchSlots(date: string, partySize: number): Promise<Slot[]> {
    try {
      const res = await fetch(`/api/public/availability?date=${date}&partySize=${partySize}`);
      const data = await res.json();
      const slots: Slot[] = Array.isArray(data.slots) ? data.slots : [];
      setAvailableSlots(slots);
      return slots;
    } catch {
      setAvailableSlots([]);
      return [];
    }
  }

  async function handlePartySizeInput(raw: string) {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (isNaN(n) || n < 1) {
      addBotMessage("Per favore inserisci un numero di persone valido (da 1 a 10).");
      return;
    }
    if (n > 10) {
      addBotMessage(
        `Per gruppi di più di 10 persone ti chiediamo di chiamarci al 📞 0522-698020 e ti troveremo la soluzione migliore!`
      );
      return;
    }

    setBooking((b) => ({ ...b, partySize: n }));

    setLoading(true);
    addBotMessage(`Un momento, verifico la disponibilità per ${n} persone...`);

    const slots = booking.date ? await fetchSlots(booking.date, n) : [];
    setLoading(false);

    if (slots.length === 0) {
      addBotMessage("Mi dispiace, non ci sono tavoli disponibili per quella data. Vuoi provare un'altra data?");
      setStep("ASK_DATE");
      return;
    }

    addBotMessage("Ecco gli orari disponibili. Scegli quello che preferisci:");
    setStep("CONFIRM");
  }

  async function handleSlotSelect(slot: Slot) {
    setBooking((b) => ({ ...b, time: slot.time }));
    addUserMessage(slot.time);
    addBotMessage("Ottima scelta! Come ti chiami?");
    setStep("ASK_NAME");
  }

  function handleNameInput(raw: string) {
    const name = raw.trim();
    if (name.length < 2) {
      addBotMessage("Inserisci il tuo nome (almeno 2 caratteri).");
      return;
    }
    setBooking((b) => ({ ...b, customerName: name }));
    addBotMessage(`Piacere, ${name}! Qual è il tuo numero di cellulare? (es. 333 1234567)`);
    setStep("ASK_PHONE");
  }

  async function handlePhoneInput(raw: string) {
    const phone = raw.trim().replace(/\s+/g, " ");
    if (!PHONE_RE.test(phone)) {
      addBotMessage("Il numero non sembra valido. Inserisci un cellulare italiano, es. 333 1234567.");
      return;
    }

    const finalBooking = { ...booking, phone };
    setBooking(finalBooking);

    // Mostra riepilogo e conferma
    const summary = `
📋 *Riepilogo prenotazione:*
• Data: ${finalBooking.dateLabel}
• Orario: ${finalBooking.time}
• Persone: ${finalBooking.partySize}
• Nome: ${finalBooking.customerName}
• Telefono: ${phone}

Confermi?`.trim();

    addBotMessage(summary);
    setStep("CONFIRM");
  }

  async function confirmBooking() {
    if (!booking.date || !booking.time || !booking.partySize || !booking.customerName || !booking.phone) {
      addBotMessage("Dati mancanti. Ricominciamo dall'inizio.");
      setStep("ASK_DATE");
      return;
    }

    setLoading(true);
    addUserMessage("Sì, confermo!");

    try {
      const res = await fetch("/api/public/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: booking.customerName,
          phone: booking.phone,
          partySize: booking.partySize,
          date: booking.date,
          time: booking.time,
          source: "CHATBOT",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addBotMessage(`⚠️ ${data.error ?? "Prenotazione non riuscita. Riprova."}`);
        setLoading(false);
        return;
      }

      const timeNote =
        data.time !== booking.time
          ? `\n⏰ Nota: l'orario è stato leggermente spostato alle ${data.time} per ottimizzare i tavoli.`
          : "";

      addBotMessage(
        `✅ Prenotazione confermata!\n\n` +
          `Codice: **${data.code}**\n` +
          `${booking.dateLabel} alle ${data.time} per ${booking.partySize} persone${timeNote}\n\n` +
          `Ti aspettiamo! 🍽️`
      );
      setStep("DONE");
    } catch {
      addBotMessage("Errore di rete. Riprova tra un momento.");
    } finally {
      setLoading(false);
    }
  }

  function cancelBooking() {
    addUserMessage("No, voglio modificare");
    addBotMessage("Nessun problema! Ricominciamo. Quando vorresti venire?");
    setBooking({});
    setAvailableSlots([]);
    setStep("ASK_DATE");
  }

  function restart() {
    setMessages([]);
    setBooking({});
    setAvailableSlots([]);
    setStep("GREETING");
    setTimeout(() => {
      addBotMessage("Ciao! 👋 Quando vorresti prenotare?");
      setStep("ASK_DATE");
    }, 100);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    addUserMessage(text);

    if (step === "ASK_DATE") handleDateInput(text);
    else if (step === "ASK_PARTY_SIZE") handlePartySizeInput(text);
    else if (step === "ASK_NAME") handleNameInput(text);
    else if (step === "ASK_PHONE") handlePhoneInput(text);
  }

  const visibleSlots = showMoreSlots ? availableSlots : availableSlots.slice(0, 6);
  const showConfirmButtons = step === "CONFIRM" && !!booking.time && !!booking.phone;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-primary text-primary-foreground shrink-0">
        <UtensilsCrossed className="h-5 w-5" />
        <span className="font-semibold">Prenota un tavolo</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-slate-100 text-slate-800 rounded-bl-none"
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 px-3 py-2 rounded-2xl rounded-bl-none">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Quick date buttons (only at ASK_DATE step) */}
        {step === "ASK_DATE" && messages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {openQuickDates.map((qd) => {
              const date = addDays(new Date(), qd.days);
              return (
                <Button
                  key={qd.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={loading}
                  onClick={() => {
                    addUserMessage(qd.label);
                    selectDate(date, formatDateIT(date));
                  }}
                >
                  {qd.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* Slot picker */}
        {(step === "ASK_PARTY_SIZE" || (step === "CONFIRM" && !booking.time)) && booking.partySize && availableSlots.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Scegli un orario:</p>
            <div className="flex flex-wrap gap-2">
              {visibleSlots.map((slot) => (
                <Button
                  key={slot.time}
                  variant="outline"
                  size="sm"
                  className="text-sm font-mono"
                  onClick={() => handleSlotSelect(slot)}
                >
                  {slot.time}
                </Button>
              ))}
              {!showMoreSlots && availableSlots.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setShowMoreSlots(true)}
                >
                  Altri orari…
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Bottoni confirm/cancel */}
        {showConfirmButtons && (
          <div className="flex gap-2">
            <Button size="sm" onClick={confirmBooking} disabled={loading}>
              ✅ Confermo
            </Button>
            <Button variant="outline" size="sm" onClick={cancelBooking}>
              ✏️ Modifica
            </Button>
          </div>
        )}

        {/* Restart after DONE */}
        {step === "DONE" && (
          <Button variant="outline" size="sm" onClick={restart}>
            📅 Nuova prenotazione
          </Button>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      {step !== "DONE" && step !== "CONFIRM" && (
        <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              step === "ASK_DATE"
                ? "es. domani sera, sabato 14..."
                : step === "ASK_PARTY_SIZE"
                ? "es. 4"
                : step === "ASK_NAME"
                ? "Il tuo nome"
                : "es. 333 1234567"
            }
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
      {/* Bottone invio fase confirm (orario già selezionato, aspettiamo solo conferma nome/tel) */}
      {step === "ASK_PHONE" && (
        <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="es. 333 1234567"
            type="tel"
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
