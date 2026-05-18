# Piattaforma Prenotazione Tavoli

Sistema completo di prenotazione tavoli per ristorante con chatbot embeddabile, gestionale admin e planimetria live.

## Funzionalità

- **Chatbot embeddabile**: widget JS da installare su qualsiasi sito (bubble flottante + iframe)
- **Prenotazione naturale**: parsing date in italiano ("domani sera", "sabato", "dopodomani")
- **Logica turni**: weekend solo fasce serali 19-21 e 21-23; feriali orari configurabili
- **Scivolamento slot**: ogni 3 prenotazioni allo stesso orario → +15 min automatico
- **Max 10 persone** per prenotazione online
- **Planimetria live**: tavoli colorati per stato (libero/prenotato/occupato) via SSE
- **Editor layout**: posizionamento drag&drop tavoli (4/6/8/10 posti) per sala
- **Timer seduta**: avvio al check-in, stop al checkout
- **Spostamento tavoli**: admin può spostare clienti tra tavoli
- **Gestione utenti**: admin e staff con ruoli diversi
- **Menu**: categorie e piatti con toggle disponibilità e prezzi
- **Responsive**: mobile-first su tutte le pagine
- **Giorni chiusura**: configurabili dal gestionale

## Setup locale

### Prerequisiti

- Node.js 20+
- PostgreSQL 16+

### Installazione

```bash
# 1. Installa dipendenze
cd restaurant-booking
npm install --legacy-peer-deps

# 2. Configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con le tue credenziali

# 3. Crea il database PostgreSQL
psql -U postgres -c "CREATE USER ristorante WITH PASSWORD 'secret';"
psql -U postgres -c "CREATE DATABASE ristorante_db OWNER ristorante;"
psql -U postgres -c "ALTER USER ristorante CREATEDB;"

# 4. Esegui la migrazione
npx prisma migrate dev

# 5. Popola i dati iniziali (admin + orari di default)
npm run seed

# 6. Build del widget loader
npm run build:widget

# 7. Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) e accedi con:
- **Email**: `admin@ristorante.it`
- **Password**: `Admin1234!`

## Integrazione widget sul sito

Aggiungi questo snippet prima del tag `</body>` del tuo sito:

```html
<script
  src="https://TUO-DOMINIO.com/widget-loader.js"
  data-url="https://TUO-DOMINIO.com"
  async
></script>
```

### Opzioni widget

| Attributo | Default | Descrizione |
|---|---|---|
| `data-url` | origine del script | URL dell'app Next.js |
| `data-position` | `bottom-right` | Posizione bubble: `bottom-right`, `bottom-left` |

## Configurazione iniziale (come admin)

1. **Editor tavoli** (`/admin/layout-editor`): crea sale → posiziona tavoli di diverse capacità
2. **Orari** (`/admin/settings/hours`): configura turni per ogni giorno della settimana
3. **Chiusure** (`/admin/settings/closures`): aggiungi giorni di chiusura
4. **Utenti** (`/admin/users`): crea account per il personale

## Deploy in produzione

### Variabili d'ambiente obbligatorie

```env
DATABASE_URL="postgresql://USER:PASSWORD@host:5432/dbname"
NEXTAUTH_SECRET="genera-con: openssl rand -base64 32"
NEXTAUTH_URL="https://tuo-dominio.com"
```

### Build e avvio

```bash
npm run build:widget   # Build widget loader
npm run build          # Build Next.js
npm run start          # Avvia in produzione
```

### Note scalabilità SSE

Il modulo SSE per la planimetria live usa un pub/sub in-memory (funziona per singola istanza). Per deployment multi-istanza, sostituire `src/lib/sse.ts` con Redis pub/sub.

## Struttura progetto

```
src/
├── app/
│   ├── (admin)/          # Dashboard admin (protetta da auth)
│   │   ├── page.tsx      # Dashboard overview KPI
│   │   ├── reservations/ # Lista prenotazioni + azioni
│   │   ├── floor/        # Planimetria live
│   │   ├── layout-editor/# Editor posizionamento tavoli
│   │   ├── settings/     # Orari e chiusure
│   │   ├── menu/         # Gestione menu
│   │   └── users/        # Gestione utenti
│   ├── api/
│   │   └── public/       # Endpoints senza auth (chatbot)
│   └── widget/           # Chatbot UI (caricato nell'iframe)
├── components/
│   ├── admin/            # Sidebar responsive, Topbar
│   ├── chatbot/          # FSM chatbot con bottoni rapidi
│   ├── floor/            # Planimetria Konva live
│   └── layout-editor/    # Editor drag&drop Konva
├── lib/
│   ├── slots.ts          # Logica slot + regola scivolamento +15min
│   ├── assign-table.ts   # Auto-assegnazione (smallest-fit, no-mix)
│   ├── date-parser.ts    # Parsing date italiano (chrono-node)
│   ├── auth.ts           # NextAuth Credentials
│   └── sse.ts            # Server-Sent Events pub/sub
└── hooks/
    ├── use-tick.ts       # Hook timer live (aggiornamento ogni secondo)
    └── use-toast.ts      # Notifiche toast

widget-loader/            # Script embeddabile standalone (build esbuild)
prisma/
├── schema.prisma         # Schema DB completo
└── seed.ts               # Admin iniziale + orari di default
```

## Test

```bash
npm test   # Vitest unit tests (slots, assign-table, date-parser)
```
