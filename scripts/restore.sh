#!/usr/bin/env bash
# ============================================================
# restore.sh — Ripristino del sistema di prenotazione
# Uso: ./scripts/restore.sh
#      ./scripts/restore.sh backup_20260518_143000.tar.gz
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUPS_DIR="${PROJECT_DIR}/backups"
ENV_FILE="${PROJECT_DIR}/.env"

GRN='\033[0;32m'; YLW='\033[1;33m'; RED='\033[0;31m'; BLU='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GRN}▶${NC} $1"; }
info() { echo -e "${BLU}ℹ${NC}  $1"; }
warn() { echo -e "${YLW}⚠${NC}  $1"; }
die()  { echo -e "${RED}✗${NC}  $1" >&2; exit 1; }

command -v psql &>/dev/null || die "psql non trovato — installa postgresql-client"
command -v node &>/dev/null || die "node non trovato"
[ -d "$BACKUPS_DIR" ] || die "Directory backup non trovata: $BACKUPS_DIR"

# ── lista backup ─────────────────────────────────────────────
mapfile -t BACKUPS < <(ls -t "${BACKUPS_DIR}"/*.tar.gz 2>/dev/null || true)
[ "${#BACKUPS[@]}" -gt 0 ] || die "Nessun backup trovato in ${BACKUPS_DIR}"

echo ""
echo "════════════════════════════════════════════"
echo "  RESTORE — Sistema di Prenotazione"
echo "════════════════════════════════════════════"

# ── selezione ────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  if   [ -f "$1" ];                         then BACKUP_FILE="$1"
  elif [ -f "${BACKUPS_DIR}/$1" ];          then BACKUP_FILE="${BACKUPS_DIR}/$1"
  elif [ -f "${BACKUPS_DIR}/${1}.tar.gz" ]; then BACKUP_FILE="${BACKUPS_DIR}/${1}.tar.gz"
  else die "Backup non trovato: $1"
  fi
else
  echo ""
  echo "  Backup disponibili:"
  echo "  ──────────────────────────────────────────────────────"
  for i in "${!BACKUPS[@]}"; do
    f="${BACKUPS[$i]}"
    SIZE=$(du -sh "$f" | cut -f1)
    NAME=$(basename "$f" .tar.gz)
    RAW="${NAME#backup_}"
    D="${RAW:0:8}"; T="${RAW:9:6}"
    LABEL="${D:6:2}/${D:4:2}/${D:0:4} ${T:0:2}:${T:2:2}:${T:4:2}"
    printf "  %2d)  %-36s  %5s   %s\n" "$((i+1))" "$NAME" "$SIZE" "$LABEL"
  done
  echo "  ──────────────────────────────────────────────────────"
  echo ""
  read -rp "  Scegli numero [1]: " CHOICE
  CHOICE=${CHOICE:-1}
  [[ "$CHOICE" =~ ^[0-9]+$ ]] || die "Inserisci un numero"
  [ "$CHOICE" -ge 1 ] && [ "$CHOICE" -le "${#BACKUPS[@]}" ] || die "Numero non valido"
  BACKUP_FILE="${BACKUPS[$((CHOICE-1))]}"
fi

info "Backup selezionato: $(basename "$BACKUP_FILE")"

# ── estrai ───────────────────────────────────────────────────
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
tar -xzf "$BACKUP_FILE" -C "$TMP_DIR"

[ -f "${TMP_DIR}/database.sql" ] || die "database.sql non trovato nel backup"

# Mostra manifest
if [ -f "${TMP_DIR}/manifest.json" ]; then
  echo ""
  echo "  Dettagli backup:"
  echo "  ──────────────────────────────────────"
  node -e "
    const m = require('${TMP_DIR}/manifest.json');
    console.log('  Data:      ' + m.created_at);
    console.log('  Database:  ' + m.database);
    console.log('  Host:      ' + m.host);
    console.log('  Versione:  v' + m.app_version);
  "
  echo "  ──────────────────────────────────────"
fi

# ── conferma ─────────────────────────────────────────────────
echo ""
warn "Il database corrente verrà ELIMINATO e sostituito."
warn "Operazione IRREVERSIBILE — fai un backup prima se necessario."
echo ""
read -rp "  Digita SI per procedere: " CONFIRM
[ "$CONFIRM" = "SI" ] || { echo "  Annullato."; exit 0; }
echo ""

# ── ripristina .env ──────────────────────────────────────────
if [ -f "${TMP_DIR}/.env" ]; then
  log "Ripristino .env..."
  cp "${TMP_DIR}/.env" "$ENV_FILE"
fi

DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"')
[ -n "$DATABASE_URL" ] || die "DATABASE_URL non trovata in .env"

eval "$(node -e "
const u = new URL('${DATABASE_URL}');
console.log('DB_HOST=' + u.hostname);
console.log('DB_PORT=' + (u.port || '5432'));
console.log('DB_USER=' + u.username);
console.log('DB_PASS=' + u.password);
console.log('DB_NAME=' + u.pathname.slice(1));
")"

log "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"

# ── elimina e ricrea database ────────────────────────────────
log "Eliminazione database esistente..."
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" > /dev/null

log "Creazione database vuoto..."
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";" > /dev/null

# ── ripristina dump ──────────────────────────────────────────
log "Ripristino dati SQL..."
PGPASSWORD="$DB_PASS" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -q < "${TMP_DIR}/database.sql"

LINES=$(wc -l < "${TMP_DIR}/database.sql")
log "  → ${LINES} righe importate"

# ── rigenera Prisma client ───────────────────────────────────
log "Rigenerazione Prisma client..."
cd "$PROJECT_DIR"
npx prisma generate --silent 2>/dev/null || npx prisma generate

echo ""
echo "────────────────────────────────────────────"
log "✓ Ripristino completato con successo!"
warn "Riavvia il server: npm run dev"
echo "────────────────────────────────────────────"
echo ""
