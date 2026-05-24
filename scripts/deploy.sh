#!/usr/bin/env bash
set -euo pipefail

trap 'echo "==> [deploy] ERROR: comando fallito — deploy interrotto"' ERR

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "==> [deploy] Starting deployment at $(date)"

echo "==> [deploy] Pulling latest code..."
git pull --ff-only

echo "==> [deploy] Installing dependencies..."
rm -rf node_modules
NODE_ENV=development npm install --legacy-peer-deps

echo "==> [deploy] Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "==> [deploy] Generating Prisma client..."
./node_modules/.bin/prisma generate

echo "==> [deploy] Pulizia cache build..."
rm -rf .next

echo "==> [deploy] Building application..."
npm run build

echo "==> [deploy] Reloading PM2 process..."
if pm2 list | grep -q "restaurant-booking"; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
fi

echo "==> [deploy] Done at $(date)"
VERSION=$(node -p "require('./package.json').version")
echo "==> [deploy] Running version: $VERSION"
