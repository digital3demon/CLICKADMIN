#!/usr/bin/env bash
# Сборка tar.gz для выкладки на Linux-сервер без полного git-клона.
# Запуск из корня репозитория: npm run package:server-tar
# Нужны: bash, tar, Node (npm run build).
#
#   ./scripts/package-server-archive.sh           # сборка + архив
#   ./scripts/package-server-archive.sh --skip-build
#   ./scripts/package-server-archive.sh --with-db # положить prisma/dev.db в архив
#
# Лучше собирать на той же ОС, что и сервер (Linux), либо WSL — иначе нативные модули могут не совпасть.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_BUILD=0
WITH_DB=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --with-db) WITH_DB=1 ;;
  esac
done

STAMP=$(date +%Y%m%d-%H%M%S)
BUNDLE_NAME="dental-lab-crm-server-${STAMP}"
STAGE="$ROOT/dist/${BUNDLE_NAME}"
ARCHIVE="$ROOT/dist/${BUNDLE_NAME}.tar.gz"

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "==> npm run build"
  npm run build
fi

if [[ ! -f "$ROOT/.next/standalone/server.js" ]]; then
  echo "Ошибка: нет $ROOT/.next/standalone/server.js — выполните npm run build." >&2
  exit 1
fi

mkdir -p "$ROOT/dist"
rm -rf "$STAGE"
mkdir -p "$STAGE"

echo "==> Копирование standalone → $STAGE"
cp -a "$ROOT/.next/standalone"/. "$STAGE/"

echo "==> Статика и public"
mkdir -p "$STAGE/.next"
rm -rf "$STAGE/.next/static"
cp -a "$ROOT/.next/static" "$STAGE/.next/static"
cp -a "$ROOT/public" "$STAGE/public"

echo "==> prisma (схема и миграции)"
cp -a "$ROOT/prisma" "$STAGE/prisma"
find "$STAGE/prisma" -maxdepth 1 \( -name "*.db-wal" -o -name "*.db-shm" \) -delete 2>/dev/null || true

[[ -f "$ROOT/.env.example" ]] && cp -a "$ROOT/.env.example" "$STAGE/.env.example"

if [[ "$WITH_DB" == "1" ]] && [[ -f "$ROOT/prisma/dev.db" ]]; then
  cp -a "$ROOT/prisma/dev.db" "$STAGE/prisma/dev.db"
  echo "1" > "$STAGE/prisma/.BUNDLED_DB"
  echo "    + prisma/dev.db в архиве"
fi

# Не копируем prisma CLI из dev: не хватает transitive deps (effect, …), на Linux нужны другие бинарники.
# На сервере: npx prisma@VERSION migrate deploy
node "$ROOT/scripts/write-prisma-cli-version.cjs" > "$STAGE/.prisma-cli-version"
echo "==> версия Prisma CLI для npx на сервере: $(cat "$STAGE/.prisma-cli-version")"

if [[ ! -d "$STAGE/.next/static/chunks" ]] || [[ -z "$(ls -A "$STAGE/.next/static/chunks" 2>/dev/null)" ]]; then
  echo "Ошибка: нет JS-чанков в $STAGE/.next/static/chunks" >&2
  exit 1
fi

echo "==> Починка путей (другой каталог на сервере)"
node "$ROOT/scripts/repair-standalone-bundle.cjs" "$STAGE"

cp -a "$ROOT/scripts/ecosystem.standalone-bundle.cjs" "$STAGE/ecosystem.config.cjs"
cp -a "$ROOT/scripts/start-netangels.cjs" "$STAGE/start-netangels.cjs"
[[ -f "$ROOT/.nvmrc" ]] && cp -a "$ROOT/.nvmrc" "$STAGE/.nvmrc"
[[ -f "$ROOT/scripts/env-kaiten-server.template.env" ]] && cp -a "$ROOT/scripts/env-kaiten-server.template.env" "$STAGE/"
[[ -f "$ROOT/scripts/nginx-dental-lab-crm.example.conf" ]] && cp -a "$ROOT/scripts/nginx-dental-lab-crm.example.conf" "$STAGE/"

PRISMA_VER="$(cat "$STAGE/.prisma-cli-version")"
node "$ROOT/scripts/write-server-bundle-readme.cjs" "$STAGE" "$BUNDLE_NAME" "$STAMP" "$PRISMA_VER"

echo "==> tar.gz → $ARCHIVE"
tar -czf "$ARCHIVE" -C "$ROOT/dist" "$BUNDLE_NAME"

echo ""
echo "Готово: $ARCHIVE"
ls -lh "$ARCHIVE"
