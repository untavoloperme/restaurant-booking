#!/usr/bin/env bash
# ============================================================
# setup-cron.sh — Configura backup automatico giornaliero
# Uso: ./scripts/setup-cron.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"

echo ""
echo "  Configurazione backup automatico"
echo "  ─────────────────────────────────"
echo ""
echo "  Opzioni:"
echo "  1) Ogni giorno alle 02:00"
echo "  2) Ogni giorno alle 03:00"
echo "  3) Ogni settimana (domenica 03:00)"
echo "  4) Inserisci espressione cron personalizzata"
echo ""
read -rp "  Scelta [1]: " CHOICE
CHOICE=${CHOICE:-1}

case "$CHOICE" in
  1) CRON_EXPR="0 2 * * *" ;;
  2) CRON_EXPR="0 3 * * *" ;;
  3) CRON_EXPR="0 3 * * 0" ;;
  4)
    read -rp "  Espressione cron (es. '0 2 * * *'): " CRON_EXPR
    ;;
  *) echo "Scelta non valida"; exit 1 ;;
esac

CRON_JOB="${CRON_EXPR} ${BACKUP_SCRIPT} >> /var/log/backup-ristorante.log 2>&1"

# Aggiunge solo se non già presente
if crontab -l 2>/dev/null | grep -qF "$BACKUP_SCRIPT"; then
  echo ""
  echo "  ⚠  Il cron è già configurato. Aggiornamento..."
  # Rimuovi la riga esistente e aggiungi la nuova
  (crontab -l 2>/dev/null | grep -vF "$BACKUP_SCRIPT"; echo "$CRON_JOB") | crontab -
else
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

echo ""
echo "  ✓ Cron configurato:"
echo "    ${CRON_JOB}"
echo ""
echo "  Log backup: /var/log/backup-ristorante.log"
echo "  Visualizza cron attivi: crontab -l"
echo ""
