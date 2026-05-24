# Prompt di generazione — Sistema di Prenotazione Ristorante

Usa questo documento come brief completo per rigenerare il prodotto da zero con un AI coding assistant (es. Claude Code).

---

## Descrizione del prodotto

Crea un **sistema gestionale completo per ristoranti** con pannello admin, widget di prenotazione pubblico, menu digitale via QR code e pannello cucina. Il sistema è multi-ruolo, multilingua (italiano), con aggiornamenti real-time e deploy autonomo.

---

## Stack tecnologico

- **Framework**: Next.js 14 App Router (TypeScript)
- **Database**: PostgreSQL tramite Docker Compose
- **ORM**: Prisma 5 con `migrate deploy` per aggiornamenti schema
- **Auth**: NextAuth.js con CredentialsProvider + TOTP (2FA)
- **UI**: Tailwind CSS + shadcn/ui + lucide-react
- **Canvas**: react-konva (pianta sala, drag-and-drop tavoli)
- **Validazione**: Zod (schema condivisi tra client e server)
- **Test**: Vitest
- **Process manager**: PM2 (fork mode, max_memory_restart=800M)
- **AI chatbot**: Claude API (Anthropic SDK) con prompt caching

---

## Superfici dell'applicazione

| Superficie | Path | Autenticazione |
|---|---|---|
| Pannello admin | `/admin/*` | Richiesta (JWT session) |
| Widget prenotazioni pubblico | `/widget` | Nessuna (iframe-embeddabile) |
| Menu digitale / ordinazioni QR | `/menu/[tableId]` | Nessuna |
| API interna | `/api/*` | Richiesta |
| API pubblica | `/api/public/*` | Nessuna |
| Backstage (superammin) | `/backstage/*` | Separata (SuperAdmin model) |

---

## Sistema di ruoli

Tre ruoli, enforced in `src/middleware.ts`:

- **ADMIN** — accesso completo
- **STAFF** — tutte le pagine admin tranne: `/admin/kitchen`, `/admin/users`, `/admin/layout-editor`, `/admin/menu`, `/admin/settings`
- **KITCHEN** — solo `/admin/kitchen` e `/admin/floor`

---

## Modello dati (Prisma schema)

```prisma
enum Role { ADMIN STAFF KITCHEN }
enum ReservationStatus { PENDING ARRIVED CHECKED_OUT CANCELLED NO_SHOW }
enum OrderStatus { RECEIVED PREPARING READY DELIVERED }

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String   // bcrypt
  name        String
  role        Role     @default(STAFF)
  active      Boolean  @default(true)
  totpSecret  String?
  totpEnabled Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model SuperAdmin {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String
  totpSecret  String?
  totpEnabled Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model Room {
  id     String  @id @default(cuid())
  name   String  @unique
  active Boolean @default(true)
  width  Int     @default(1000)
  height Int     @default(700)
  tables Table[]
}

model Table {
  id           String        @id @default(cuid())
  roomId       String
  room         Room          @relation(fields: [roomId], references: [id], onDelete: Cascade)
  name         String
  capacity     Int
  shape        String        @default("round")  // "round" | "rect"
  x            Float
  y            Float
  width        Float         @default(90)
  height       Float         @default(90)
  rotation     Float         @default(0)
  reservations Reservation[]
  orders       Order[]
  @@unique([roomId, name])
}

model OpeningHours {
  id           String  @id @default(cuid())
  dayOfWeek    Int     @unique  // 0=domenica … 6=sabato
  active       Boolean @default(true)
  shifts       Json    // [{ start: "12:00", end: "15:00" }, ...]
  slotInterval Int     @default(15)
}

model ClosureDay {
  date DateTime @unique @db.Date
  note String?
}

model Reservation {
  id           String            @id @default(cuid())
  code         String            @unique  // es. "RIS-ABC123"
  customerName String
  phone        String
  partySize    Int
  date         DateTime          @db.Date
  time         String            // "19:30"
  tableId      String?
  table        Table?            @relation(...)
  extraTableIds String[]         @default([])  // tavoli aggiuntivi per gruppi
  status       ReservationStatus @default(PENDING)
  arrivedAt    DateTime?
  checkedOutAt DateTime?
  notes        String?
  source       String            @default("CHATBOT")  // "CHATBOT" | "ADMIN"
  insertionSeq Int               @default(autoincrement())
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  @@index([date, time])
  @@index([status])
}

model MenuCategory {
  id    String     @id @default(cuid())
  name  String
  order Int        @default(0)
  items MenuItem[]
}

model MenuItem {
  id          String       @id @default(cuid())
  categoryId  String
  category    MenuCategory @relation(...)
  name        String
  description String?
  price       Decimal      @db.Decimal(10, 2)
  available   Boolean      @default(true)
  order       Int          @default(0)
  allergenIds String[]     @default([])
  imageUrl    String?
  mealPeriod  String       @default("ALWAYS")  // "ALWAYS" | "LUNCH" | "DINNER"
  featured    Boolean      @default(false)
  orderItems  OrderItem[]
}

model Allergen {
  id     String @id @default(cuid())
  number Int    @unique  // numero EU 1-14
  name   String
  icon   String?
  color  String?
}

model Order {
  id      String      @id @default(cuid())
  tableId String
  table   Table       @relation(...)
  status  OrderStatus @default(RECEIVED)
  notes   String?
  items   OrderItem[]
  @@index([status])
  @@index([tableId])
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(...)
  menuItemId String
  menuItem   MenuItem @relation(...)
  quantity   Int      @default(1)
  notes      String?
}

model Setting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```

---

## Pagine pannello admin (`/admin/*`)

### Dashboard (`/admin`)
- Statistiche giornaliere: prenotazioni totali, coperti, tasso no-show
- Grafico prenotazioni settimanali
- Lista prenotazioni di oggi con stato colorato

### Prenotazioni (`/admin/reservations`)
- Tabella con filtri per data, stato, ricerca per nome/telefono/codice
- Azioni per riga: arrivato, check-out, annulla, modifica, elimina
- Modale creazione prenotazione (seleziona data, ora, coperti, cliente, note)
- Assegnazione automatica tavolo o manuale
- Badge stato colorato (PENDING=giallo, ARRIVED=verde, CHECKED_OUT=grigio, CANCELLED=rosso, NO_SHOW=arancione)

### Pianta sala (`/admin/floor`)
- Canvas react-konva (SSR=false) con i tavoli della sala
- Tavoli colorati per occupazione: libero=verde, occupato=rosso, in attesa=arancione
- Click su tavolo apre dettaglio prenotazione attiva
- Aggiornamento real-time via SSE

### Editor layout (`/admin/layout-editor`)
- Canvas drag-and-drop per posizionare tavoli
- Aggiunta/rimozione tavoli, modifica nome, capacità, forma (tondo/rettangolare), rotazione
- Supporto più sale (Room)
- Solo ADMIN

### Menu (`/admin/menu`)
- Gestione categorie (ordine drag-and-drop)
- Gestione piatti: nome, descrizione, prezzo, immagine (upload), allergeni, periodo pasto, in evidenza, disponibilità
- Solo ADMIN

### Cucina (`/admin/kitchen`)
- Lista ordini in tempo reale (SSE)
- Card per ordine con tavolo, items, note
- Pulsanti avanzamento stato: RECEIVED→PREPARING→READY→DELIVERED
- Solo KITCHEN e ADMIN

### Statistiche (`/admin/stats`)
- Grafici mensili prenotazioni e coperti
- Top piatti ordinati
- Tasso di no-show per giorno della settimana

### Utenti (`/admin/users`)
- Lista utenti con ruolo e stato (attivo/disattivo)
- Creazione e modifica utente
- Attivazione/disattivazione 2FA per utente (ADMIN può resettare il TOTP altrui)
- Solo ADMIN

### Impostazioni (`/admin/settings`)
- **Orari** (`/admin/settings/hours`): orari di apertura per giorno, supporto turni multipli (pranzo + cena), intervallo slot in minuti
- **Chiusure** (`/admin/settings/closures`): date di chiusura straordinaria con nota opzionale
- **Allergeni** (`/admin/settings/allergens`): gestione allergeni EU (numero, nome, icona, colore)
- **Branding** (in `/admin/settings`): upload logo ristorante, nome ristorante (mostrati nella login page)
- Solo ADMIN

---

## Logica prenotazioni e slot

### `src/lib/slots.ts` — `getAvailableSlots(date, partySize)`
- Legge `OpeningHours` e `ClosureDay` dal DB
- **Feriali**: finestra pasto 105 min, intervallo configurabile (default 15 min)
- **Weekend**: due turni fissi (es. 19:00–21:00 e 21:00–23:00)
- **Slot drift**: se 3 prenotazioni condividono lo stesso orario, lo slot successivo si sposta +15 min

### `src/lib/assign-table.ts` — `assignTable(partySize, date, time)`
- Trova il tavolo più piccolo disponibile che contiene il gruppo
- Rispetta la stessa logica di finestra pasto / turni
- Se nessun tavolo singolo è disponibile, può combinare tavoli adiacenti (`extraTableIds`)

### `src/lib/validators.ts` — `CreateReservationSchema` (Zod)
- Usato sia dall'endpoint pubblico chatbot che dall'endpoint admin
- Differenza: l'admin salta il check "niente date passate"
- Campo `source`: `"CHATBOT"` | `"ADMIN"`

---

## Chatbot di prenotazione

- Endpoint: `POST /api/public/reservations` (nessuna auth)
- Claude API (Anthropic SDK) con tool use per raccogliere i campi: nome, telefono, data, ora, numero coperti, note
- Prompt caching attivo per il system prompt
- Risponde sempre in italiano
- Parsing date naturale in `src/lib/date-parser.ts` (es. "sabato prossimo", "domani sera")
- Il widget (`/widget`) è iframe-embeddabile: nessun cookie, nessuna sessione

---

## Menu digitale e ordinazioni QR

- QR code punta a `/menu/[tableId]`
- `GET /api/public/menu?tableId=X`: restituisce `{ tableIsFree: true }` se il tavolo non ha una prenotazione in stato ARRIVED (il menu è bloccato finché il tavolo non è segnato come arrivato)
- `POST /api/public/orders`: crea ordine (anche bloccato se tavolo libero)
- Stato ordine: polling ogni 5s su `/menu/[tableId]/ordine/[orderId]`
- `Order` non ha relazione diretta con `Reservation` — solo con `Table`

---

## Real-time (SSE)

- `GET /api/stream`: endpoint Server-Sent Events
- Tutte le mutation chiamano `emitEvent()` da `src/lib/sse.ts` (pub/sub in-memory)
- Le pagine admin si sottoscrivono con `new EventSource("/api/stream")` e ri-fetchano i dati sugli eventi
- **Limitazione**: funziona solo in single-process — non scala su deployment multi-istanza

---

## Autenticazione (NextAuth.js)

Due CredentialsProvider:
1. `"credentials"` — verifica email + password (bcrypt). Se 2FA attivo, emette token con `pendingTotp: true`
2. `"totp"` — secondo step, verifica il codice TOTP a 6 cifre

Il middleware (`src/middleware.ts`) reindirizza a `/login/2fa` se `token.pendingTotp === true`.

### TOTP (2FA)
- Libreria: `otplib` v13 (`generateSecret`, `authenticator.generate`, `authenticator.verify`)
- Helper in `src/lib/totp.ts`
- Endpoint: `GET/POST /api/auth/totp/setup`, `/api/auth/totp/enable`, `/api/auth/totp/disable`, `/api/auth/totp/status`
- QR code mostrato durante setup, poi segreto non più esposto

---

## Branding / personalizzazione

- Nome ristorante e logo salvati nella tabella `Setting` (chiavi: `restaurant.name`, `restaurant.logo`)
- Upload logo: `POST /api/settings/logo` (multipart, salvato in `public/uploads/`)
- La login page legge `GET /api/public/settings` (no auth) per mostrare logo e nome
- Testo login personalizzato con il nome del ristorante

---

## Backstage (SuperAdmin)

Pannello separato per il gestore della piattaforma (non il ristorante):
- Path: `/backstage/*` — auth separata con modello `SuperAdmin`
- 2FA obbligatoria per SuperAdmin
- Funzionalità:
  - Lista installazioni / tenant
  - Info sistema (versione app, info git, uptime)
  - **Deploy remoto**: `POST /api/backstage/system { action: "deploy" }` esegue `scripts/deploy.sh` in background
  - **Controllo aggiornamenti**: se `GITHUB_REPO` è in `.env`, controlla l'ultima release GitHub e confronta con la versione corrente (`package.json`)

---

## Script di supporto (`scripts/`)

| Script | Funzione |
|---|---|
| `deploy.sh` | `git pull` → `npm ci` → `prisma migrate deploy` → `npm run build` → `pm2 reload` |
| `backup.sh` | `pg_dump` + copia `.env` + manifest JSON → archivio `.tar.gz` in `backups/` (conserva ultimi 14) |
| `restore.sh` | Selezione interattiva backup, `DROP`+`CREATE DATABASE`, restore da dump SQL |
| `setup-cron.sh` | Configura cron per backup automatico giornaliero |
| `create-superadmin.ts` | Script one-shot per creare il primo SuperAdmin |

---

## Variabili d'ambiente (`.env`)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname?connection_limit=5"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://tuodominio.com"
SEED_ADMIN_EMAIL="admin@ristorante.it"
SEED_ADMIN_PASSWORD="..."
SEED_ADMIN_NAME="Amministratore"
SA_EMAIL="superadmin@sistema.it"
SA_PASSWORD="..."
GITHUB_REPO="org/restaurant-booking"   # per controllo aggiornamenti
ANTHROPIC_API_KEY="..."                # per il chatbot
```

---

## Infrastruttura di produzione

- **VPS**: 2 core, ~4GB RAM, SSD
- **PostgreSQL 16**: `shared_buffers=512MB`, `effective_cache_size=2GB`, `work_mem=16MB`, `max_connections=25`, `random_page_cost=1.1`
- **PM2**: `fork` mode, `max_memory_restart=800M`, `pm2 save` per avvio automatico
- **Versioning**: versione in `package.json` (sorgente di verità); `src/lib/version.ts` esporta `APP_VERSION` solo con import statico (no `child_process`, deve funzionare in Client Components)

---

## Convenzioni di sviluppo

- Tutti i testi UI in **italiano**
- Nessun commento nel codice se non strettamente necessario
- Nessuna astrazione prematura — preferire duplicazione leggibile a pattern complessi
- Validazione solo ai boundary di sistema (input utente, API esterne)
- Nessun mock nelle integrazioni test — usare DB reale
- SSE è single-process: non introdurre soluzioni multi-istanza senza prima rimuoverlo
