#!/usr/bin/env bash
# ============================================================
# fresh-install.sh — Deploy su server nuovo da zero
# Uso: bash fresh-install.sh [--repo <git-url>] [--domain <domain>]
#
# Pre-requisiti sul server:
#   - Ubuntu 22.04+ / Debian 12+
#   - Accesso root o sudo
#   - Porta 80/443 aperta (se si usa Nginx)
# ============================================================
set -euo pipefail

# ── Colori ──────────────────────────────────────────────────
GRN='\033[0;32m'; YLW='\033[1;33m'; RED='\033[0;31m'; CYN='\033[0;36m'; NC='\033[0m'
log()     { echo -e "\n${GRN}▶${NC} $1"; }
warn()    { echo -e "${YLW}⚠${NC}  $1"; }
die()     { echo -e "${RED}✗  ERRORE: $1${NC}" >&2; exit 1; }
section() { echo -e "\n${CYN}══════════════════════════════════════════${NC}"; echo -e "${CYN}  $1${NC}"; echo -e "${CYN}══════════════════════════════════════════${NC}"; }

# ── Default configurabili ────────────────────────────────────
GITHUB_REPO="${GITHUB_REPO:-untavoloperme/restaurant-booking}"
APP_DIR="${APP_DIR:-/root/restaurant-booking}"
APP_NAME="restaurant-booking"
DB_NAME="ristorante_db"
DB_USER="ristorante"
DB_PASS="${DB_PASS:-$(openssl rand -hex 16)}"
JWT_SECRET="$(openssl rand -hex 32)"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
DOMAIN="${DOMAIN:-localhost}"
PORT="${PORT:-3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ristorante.it}"
ADMIN_NAME="${ADMIN_NAME:-Amministratore}"
ADMIN_PASS="${ADMIN_PASS:-$(openssl rand -base64 12)}"

# ── Argomenti CLI ────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)   GITHUB_REPO="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --dir)    APP_DIR="$2"; shift 2 ;;
    --port)   PORT="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-name)  ADMIN_NAME="$2"; shift 2 ;;
    *) die "Argomento sconosciuto: $1" ;;
  esac
done

GITHUB_URL="https://github.com/${GITHUB_REPO}.git"

# ============================================================
section "Riepilogo installazione"
# ============================================================
echo "  Repository  : $GITHUB_URL"
echo "  Directory   : $APP_DIR"
echo "  Dominio     : $DOMAIN"
echo "  Porta app   : $PORT"
echo "  Database    : $DB_NAME (utente: $DB_USER)"
echo "  Admin email : $ADMIN_EMAIL"
echo ""
if [[ -t 0 ]]; then
  read -rp "$(echo -e "${YLW}Procedere con l'installazione? [s/N]${NC} ")" CONFIRM
  [[ "${CONFIRM,,}" == "s" ]] || { echo "Annullato."; exit 0; }
else
  echo -e "${YLW}Esecuzione non interattiva (curl | bash) — proseguo automaticamente.${NC}"
fi

# ============================================================
section "1/8 — Dipendenze di sistema"
# ============================================================
log "Aggiornamento pacchetti..."
apt-get update -qq

log "Installazione dipendenze base..."
apt-get install -y -qq \
  curl git build-essential openssl \
  postgresql postgresql-client \
  nginx certbot python3-certbot-nginx 2>/dev/null || true

# Node.js 20 LTS (via NodeSource)
if ! command -v node &>/dev/null || [[ "$(node -e 'process.exit(+process.version.slice(1).split(".")[0] < 20)')" ]]; then
  log "Installazione Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

# PM2
if ! command -v pm2 &>/dev/null; then
  log "Installazione PM2..."
  npm install -g pm2 --silent
fi

echo "  Node  : $(node -v)"
echo "  npm   : $(npm -v)"
echo "  PM2   : $(pm2 -v)"

# ============================================================
section "2/8 — PostgreSQL"
# ============================================================
log "Avvio PostgreSQL..."
systemctl enable postgresql --quiet
systemctl start postgresql

log "Creazione database e utente..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  ELSE
    ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

# Tuning PostgreSQL per VPS small (2 core / 4GB RAM)
PGCONF_DIR="/etc/postgresql/$(pg_lsclusters -h | awk '{print $1}' | head -1)/main/conf.d"
mkdir -p "$PGCONF_DIR"
cat > "${PGCONF_DIR}/restaurant.conf" <<PGCONF
# Tuning per restaurant-booking
shared_buffers = 512MB
effective_cache_size = 2GB
work_mem = 16MB
maintenance_work_mem = 128MB
max_connections = 25
random_page_cost = 1.1
checkpoint_completion_target = 0.9
PGCONF
systemctl reload postgresql
log "PostgreSQL configurato."

# ============================================================
section "3/8 — Clone repository"
# ============================================================
if [[ -d "$APP_DIR/.git" ]]; then
  warn "Directory $APP_DIR già esistente — recupero aggiornamenti..."
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" reset --hard origin/master
else
  log "Clone da $GITHUB_URL..."
  git clone "$GITHUB_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ============================================================
section "4/8 — File .env"
# ============================================================
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?connection_limit=5"

NEXTAUTH_URL_FULL="http://${DOMAIN}"
[[ "$DOMAIN" != "localhost" ]] && NEXTAUTH_URL_FULL="https://${DOMAIN}"

cat > "${APP_DIR}/.env" <<ENV
DATABASE_URL="${DATABASE_URL}"
NEXTAUTH_URL="${NEXTAUTH_URL_FULL}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
JWT_SECRET="${JWT_SECRET}"
SEED_ADMIN_EMAIL="${ADMIN_EMAIL}"
SEED_ADMIN_NAME="${ADMIN_NAME}"
SEED_ADMIN_PASSWORD="${ADMIN_PASS}"
SA_EMAIL="superadmin@sistema.it"
GITHUB_REPO="${GITHUB_REPO}"
NODE_ENV="production"
PORT="${PORT}"
ENV

chmod 600 "${APP_DIR}/.env"
log ".env creato."

# ============================================================
section "5/8 — Dipendenze Node.js e build"
# ============================================================
cd "$APP_DIR"
log "npm ci..."
npm ci --silent

log "Prisma migrate + seed..."
npx prisma migrate deploy
npx prisma generate
npm run seed

log "Build Next.js..."
npm run build

# ============================================================
section "6/8 — PM2"
# ============================================================
# Aggiorna ecosystem.config.js con la directory corretta
sed -i "s|cwd:.*|cwd: \"${APP_DIR}\",|" "${APP_DIR}/ecosystem.config.js"

log "Avvio processo PM2..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start "${APP_DIR}/ecosystem.config.js"
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
log "PM2 avviato."

# ============================================================
section "7/8 — Nginx reverse proxy"
# ============================================================
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # SSE — no buffering
    location /api/stream {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
log "Nginx configurato."

# Firewall (ufw)
if command -v ufw &>/dev/null; then
  log "Configurazione firewall (ufw)..."
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  log "Firewall attivato: SSH, 80, 443 aperti."
else
  warn "ufw non trovato — installa e configura il firewall manualmente."
fi

# Certbot SSL (solo se dominio reale)
if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != *"127."* ]]; then
  log "Richiesta certificato SSL per $DOMAIN..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    -m "admin@${DOMAIN}" --redirect 2>/dev/null && \
    log "SSL attivato." || warn "Certbot fallito — configura SSL manualmente."
fi

# ============================================================
section "8/8 — Riepilogo finale"
# ============================================================
echo ""
echo -e "${GRN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GRN}║         INSTALLAZIONE COMPLETATA                 ║${NC}"
echo -e "${GRN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  URL app      : ${CYN}${NEXTAUTH_URL_FULL}${NC}"
echo -e "  Admin email  : ${CYN}${ADMIN_EMAIL}${NC}"
echo -e "  Admin pass   : ${YLW}${ADMIN_PASS}${NC}  ← SALVA QUESTA PASSWORD"
echo -e "  DB password  : ${YLW}${DB_PASS}${NC}  ← SALVATA IN .env"
echo ""
echo -e "  Comandi utili:"
echo -e "    pm2 logs ${APP_NAME}"
echo -e "    pm2 status"
echo -e "    bash ${APP_DIR}/scripts/deploy.sh   # aggiornamenti futuri"
echo ""

# Salva riepilogo su file
SUMMARY_FILE="${APP_DIR}/INSTALL_SUMMARY.txt"
cat > "$SUMMARY_FILE" <<SUMMARY
Installazione: $(date)
URL: ${NEXTAUTH_URL_FULL}
Admin email: ${ADMIN_EMAIL}
Admin password: ${ADMIN_PASS}
DB name: ${DB_NAME}
DB user: ${DB_USER}
DB password: ${DB_PASS}
SUMMARY
chmod 600 "$SUMMARY_FILE"
echo -e "  Riepilogo salvato in: ${SUMMARY_FILE}"
echo ""
