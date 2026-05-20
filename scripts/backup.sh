#!/usr/bin/env bash
# ============================================================
# backup.sh — Backup del sistema di prenotazione
# Uso: ./scripts/backup.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUPS_DIR="${PROJECT_DIR}/backups"
ENV_FILE="${PROJECT_DIR}/.env"
KEEP_LAST=14

GRN='\033[0;32m'; YLW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GRN}▶${NC} $1"; }
warn() { echo -e "${YLW}⚠${NC}  $1"; }
die()  { echo -e "${RED}✗${NC}  $1" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die ".env non trovato"
command -v pg_dump &>/dev/null || die "pg_dump non trovato — installa postgresql-client"
command -v node   &>/dev/null || die "node non trovato"

# Leggi e parsa DATABASE_URL tramite Node (evita quoting bash complesso)
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"')

eval "$(node -e "
const u = new URL('${DATABASE_URL}');
console.log('DB_HOST=' + u.hostname);
console.log('DB_PORT=' + (u.port || '5432'));
console.log('DB_USER=' + u.username);
console.log('DB_PASS=' + u.password);
console.log('DB_NAME=' + u.pathname.slice(1));
")"

mkdir -p "$BACKUPS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo ""
log "Inizio backup: $BACKUP_NAME"
log "Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo ""

# 1. Dump database
log "Esportazione database..."
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-password --format=plain --no-owner --no-privileges \
  > "${TMP_DIR}/database.sql"

LINES=$(wc -l < "${TMP_DIR}/database.sql")
log "  → ${LINES} righe SQL esportate"

# 2. Copia .env
log "Copia configurazione..."
cp "$ENV_FILE" "${TMP_DIR}/.env"

# 3. Manifest
APP_VERSION=$(node -e "process.stdout.write(require('${PROJECT_DIR}/package.json').version)")
cat > "${TMP_DIR}/manifest.json" <<MANIFEST
{
  "name": "${BACKUP_NAME}",
  "created_at": "$(date -Iseconds)",
  "database": "${DB_NAME}",
  "host": "${DB_HOST}:${DB_PORT}",
  "app_version": "${APP_VERSION}"
}
MANIFEST

# 4. Crea archivio
ARCHIVE="${BACKUPS_DIR}/${BACKUP_NAME}.tar.gz"
log "Compressione archivio..."
tar -czf "$ARCHIVE" -C "$TMP_DIR" .

SIZE=$(du -sh "$ARCHIVE" | cut -f1)
echo ""
log "✓ Backup salvato: $(basename "$ARCHIVE")  [${SIZE}]"
log "  Percorso: ${ARCHIVE}"

# 5. Pulizia vecchi backup
mapfile -t ALL_BACKUPS < <(ls -t "${BACKUPS_DIR}"/*.tar.gz 2>/dev/null || true)
if [ "${#ALL_BACKUPS[@]}" -gt "$KEEP_LAST" ]; then
  echo ""
  warn "Rimozione backup obsoleti (conservo ultimi ${KEEP_LAST})..."
  for f in "${ALL_BACKUPS[@]:$KEEP_LAST}"; do
    warn "  Rimosso: $(basename "$f")"
    rm -f "$f"
  done
fi

echo ""
echo "────────────────────────────────────────────"
log "Backup completato!"
echo "  Backup totali: $(ls "${BACKUPS_DIR}"/*.tar.gz 2>/dev/null | wc -l)"
echo "  Directory:     ${BACKUPS_DIR}"
echo "────────────────────────────────────────────"
echo ""
