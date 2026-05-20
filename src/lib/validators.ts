import { z } from "zod";

export const PhoneIT = z
  .string()
  .regex(/^(\+39\s?)?3\d{2}\s?\d{6,7}$/, "Inserisci un numero di cellulare italiano valido (es. 333 1234567)");

export const NameValidator = z
  .string()
  .min(2, "Il nome deve avere almeno 2 caratteri")
  .max(80, "Nome troppo lungo");

const ReservationBase = z.object({
  customerName: NameValidator,
  phone: PhoneIT,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato orario non valido"),
  notes: z.string().max(500).optional(),
  source: z.enum(["CHATBOT", "ADMIN"]).default("CHATBOT"),
});

export const CreateReservationSchema = ReservationBase.extend({
  partySize: z
    .number()
    .int()
    .min(1, "Minimo 1 persona")
    .max(10, "Massimo 10 persone per prenotazione online"),
});

export const CreateReservationAdminSchema = ReservationBase.extend({
  partySize: z.number().int().min(1, "Minimo 1 persona"),
  tableId: z.string().optional(),
  extraTableIds: z.array(z.string()).optional().default([]),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
