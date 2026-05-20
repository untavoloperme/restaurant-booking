# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests (Vitest)
npm run seed         # Seed admin user + opening hours into DB
npx prisma migrate dev   # Apply schema migrations
npx prisma studio        # GUI for the database
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/slots.test.ts
```

Database is PostgreSQL via Docker:
```bash
docker-compose up -d   # Start the DB
```

## Architecture

**Next.js 14 App Router** with two distinct surfaces:

| Surface | Path | Auth |
|---|---|---|
| Admin panel | `/admin/*` | Required (JWT session) |
| Public booking widget | `/widget` | None (iframe-embeddable) |
| QR-code menu/ordering | `/menu/[tableId]` | None |
| API (internal) | `/api/*` | Required |
| API (public) | `/api/public/*` | None |

### Role system
Three roles enforced in `src/middleware.ts`:
- **ADMIN** — full access
- **STAFF** — all admin pages except `/admin/kitchen`, `/admin/users`, `/admin/layout-editor`, `/admin/menu`, `/admin/settings`
- **KITCHEN** — only `/admin/kitchen` and `/admin/floor`

### Real-time updates
`/api/stream` is a Server-Sent Events endpoint. All mutation routes call `emitEvent()` from `src/lib/sse.ts` (in-memory pub/sub). Admin pages subscribe via `new EventSource("/api/stream")` and re-fetch on events. **This is single-process only** — it breaks under multi-instance deployments.

### Reservation & slot logic
Two key business-logic files:

- **`src/lib/slots.ts`** — `getAvailableSlots(date, partySize)` computes available booking times. Handles: weekday (105-min meal window, configurable interval) vs weekend (two fixed turns: 19:00–21:00 and 21:00–23:00). Implements *slot drift*: once 3 bookings share a time, the next suggestion shifts +15 min.
- **`src/lib/assign-table.ts`** — `assignTable(partySize, date, time)` picks the smallest available table that fits the party, respecting the same meal-window / turn logic.

### Shared validation
`src/lib/validators.ts` exports `CreateReservationSchema` (Zod). Used by both the public chatbot endpoint (`/api/public/reservations`) and the admin endpoint (`/api/reservations`). The `source` field (`CHATBOT` | `ADMIN`) is the only behavioral difference between the two paths; admin skips the "no past dates" check.

### Floor plan
`src/components/floor/floor-view.tsx` uses `react-konva` for the canvas. The component must be loaded with `ssr: false` (done in `src/app/admin/floor/page.tsx`). Table occupancy is derived at render time by correlating today's `PENDING`/`ARRIVED` reservations against the table list.

### QR code / ordering flow
- QR code links to `/menu/[tableId]`
- Page calls `/api/public/menu?tableId=X` — returns 403-equivalent `{ tableIsFree: true }` if the table has no `ARRIVED` reservation
- Orders POST to `/api/public/orders` — also blocked if table is free
- Order status is polled every 5s on `/menu/[tableId]/ordine/[orderId]`

### Data model highlights
- `Reservation.source` — `"CHATBOT"` or `"ADMIN"`
- `Reservation.insertionSeq` — autoincrement used for stable ordering when time is equal
- `Order` has no direct link to `Reservation` — only to `Table`
- `OpeningHours.shifts` is a `Json` column storing `{ start, end }[]`
