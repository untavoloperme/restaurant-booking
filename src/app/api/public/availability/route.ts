import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/slots";
import { parseISO, startOfDay } from "date-fns";
import { z } from "zod";

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido"),
  partySize: z.string().transform(Number).refine((n) => n >= 1 && n <= 10, "Tra 1 e 10 persone"),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    date: searchParams.get("date"),
    partySize: searchParams.get("partySize"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const date = startOfDay(parseISO(parsed.data.date));

  // Non prenotare nel passato
  if (date < startOfDay(new Date())) {
    return NextResponse.json({ error: "Non puoi prenotare nel passato" }, { status: 400 });
  }

  const slots = await getAvailableSlots(date, parsed.data.partySize);
  return NextResponse.json({ date: parsed.data.date, partySize: parsed.data.partySize, slots });
}
