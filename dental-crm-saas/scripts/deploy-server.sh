#!/usr/bin/env bash
# Развёртывание на Linux-сервере (запускать на сервере из корня репозитория или с любого каталога).
#
# Важно:
# - Пароль и секреты в этот файл не кладите. Вход по SSH — через ключ (`ssh-copy-id`).
# - Переменные окружения приложения (DATABASE_URL и т.д.) — в `.env`, `.env.production`
#   или в `env` блоке PM2 / systemd; файл `.env` не коммитьте.
#
# Использование:
#   chmod +x scripts/deploy-server.sh
#   ./scripts/deploy-server.sh              # git pull + ci + migrate + build + pm2
#   SKIP_GIT=1 ./scripts/deploy-server.sh   # без git (например, код уже залили rsync/scp)
#   ./scripts/deploy-server.sh --skip-migrate   # без prisma migrate deploy
#
# Каталог приложения по умолчанию — родитель каталога scripts/ (корень репозитория).
# Другой путь: APP_ROOT=/var/www/dental-lab-crm ./scripts/deploy-server.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="${APP_ROOT:-$ROOT}"
SKIP_GIT="${SKIP_GIT:-0}"
SKIP_MIGRATE=0

for arg in "$@"; do
  case "$arg" in
    --skip-git) SKIP_GIT=1 ;;
    --skip-migrate) SKIP_MIGRATE=1 ;;
  esac
done

cd "$APP_ROOT"
echo "==> Каталог приложения: $APP_ROOT"

if [[ "$SKIP_GIT" != "1" && "$SKIP_GIT" != "true" ]]; then
  if [[ -d .git ]]; then
    echo "==> git pull"
    git pull --ff-only
  else
    echo "==> (нет .git, пропуск git pull; при необходимости SKIP_GIT=1 не нужен)"
  fi
else
  echo "==> Пропуск git (SKIP_GIT)"
fi

echo "==> npm ci"
npm ci

if [[ "$SKIP_MIGRATE" -eq 0 ]]; then
  echo "==> prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "==> Пропуск prisma migrate deploy"
fi

echo "==> npm run build (prisma generate + next build)"
npm run build

STANDALONE="$APP_ROOT/.next/standalone"
if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "Ошибка: не найден $STANDALONE/server.js — сборка standalone не создалась." >&2
  exit 1
fi

echo "==> Копирование public и .next/static в standalone (нужно для Next.js)"
mkdir -p "$STANDALONE/.next"
rm -rf "$STANDALONE/public" "$STANDALONE/.next/static"
cp -a "$APP_ROOT/public" "$STANDALONE/public"
cp -a "$APP_ROOT/.next/static" "$STANDALONE/.next/static"

# Без этого каталога в браузере ChunkLoadError (старый HTML тянет несуществующие чанки).
if [[ ! -d "$STANDALONE/.next/static/chunks" ]] || [[ -z "$(ls -A "$STANDALONE/.next/static/chunks" 2>/dev/null)" ]]; then
  echo "Ошибка: после копирования нет JS-чанков в $STANDALONE/.next/static/chunks" >&2
  echo "  Убедитесь, что npm run build завершился успешно и $APP_ROOT/.next/static не пустой." >&2
  exit 1
fi
echo "    OK: статика Next.js в standalone ($(find "$STANDALONE/.next/static/chunks" -name '*.js' 2>/dev/null | wc -l) js-файлов в chunks)"

# Next подхватывает .env из cwd процесса (у нас cwd = .next/standalone)
for f in .env .env.production .env.local .env.production.local; do
  if [[ -f "$APP_ROOT/$f" ]]; then
    cp -a "$APP_ROOT/$f" "$STANDALONE/$f"
    echo "    скопирован $f → standalone"
  fi
done

ECOSYSTEM="$APP_ROOT/ecosystem.config.cjs"
if [[ ! -f "$ECOSYSTEM" ]]; then
  echo "Ошибка: нет $ECOSYSTEM" >&2
  exit 1
fi

echo "==> PM2: перезапуск из ecosystem.config.cjs"
if command -v pm2 >/dev/null 2>&1; then
  PM2_NAME="${PM2_APP_NAME:-dental-lab-crm}"
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 reload "$ECOSYSTEM" --update-env
  else
    # Старый процесс `app` с next start — лучше остановить вручную: pm2 delete app
    pm2 start "$ECOSYSTEM"
  fi
  pm2 save
  echo "==> Готово. Проверка: pm2 status && pm2 logs $PM2_NAME --lines 40"
else
  echo "PM2 не найден в PATH. Запуск вручную из $STANDALONE:" >&2
  echo "  cd \"$STANDALONE\" && NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 node server.js" >&2
  exit 1
fi
