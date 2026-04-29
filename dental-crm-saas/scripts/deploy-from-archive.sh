#!/usr/bin/env bash
# Deploy from prebuilt tar.gz archive (no server-side build).
#
# Usage:
#   chmod +x scripts/deploy-from-archive.sh
#   ./scripts/deploy-from-archive.sh /var/www/dental-lab-crm-server-20260417-160436.tar.gz
#
# Optional:
#   ./scripts/deploy-from-archive.sh /var/www/build.tar.gz --base-dir /var/www --app-name app --with-migrate
#
# Notes:
# - Expects archive built by package-server-archive scripts.
# - Copies .env from previous "current" release if present.
# - Switches symlink: <base-dir>/current -> new release.
# - Starts/reloads PM2 using ecosystem.config.cjs from new release.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <archive.tar.gz> [--base-dir /var/www] [--app-name dental-lab-crm] [--with-migrate]" >&2
  exit 1
fi

ARCHIVE="$1"
shift || true

BASE_DIR="/var/www"
APP_NAME="dental-lab-crm"
WITH_MIGRATE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-dir)
      BASE_DIR="${2:-}"
      shift 2
      ;;
    --app-name)
      APP_NAME="${2:-}"
      shift 2
      ;;
    --with-migrate)
      WITH_MIGRATE=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ARCHIVE" ]]; then
  echo "Archive not found: $ARCHIVE" >&2
  exit 1
fi

mkdir -p "$BASE_DIR/releases"
CURRENT_LINK="$BASE_DIR/current"

echo "==> Inspect archive"
ROOT_ENTRY="$(tar -tzf "$ARCHIVE" | head -n 1 | cut -d/ -f1)"
if [[ -z "$ROOT_ENTRY" ]]; then
  echo "Cannot detect archive root directory." >&2
  exit 1
fi
RELEASE_DIR="$BASE_DIR/releases/$ROOT_ENTRY"

if [[ -e "$RELEASE_DIR" ]]; then
  echo "Release dir already exists, removing: $RELEASE_DIR"
  rm -rf "$RELEASE_DIR"
fi

echo "==> Extract archive to $BASE_DIR/releases"
tar -xzf "$ARCHIVE" -C "$BASE_DIR/releases"

if [[ ! -f "$RELEASE_DIR/server.js" ]]; then
  echo "Missing server.js in release: $RELEASE_DIR" >&2
  exit 1
fi
if [[ ! -d "$RELEASE_DIR/.next/static/chunks" ]]; then
  echo "Missing .next/static/chunks in release: $RELEASE_DIR" >&2
  exit 1
fi

if [[ -f "$CURRENT_LINK/.env" ]]; then
  echo "==> Copy .env from previous current release"
  cp -a "$CURRENT_LINK/.env" "$RELEASE_DIR/.env"
else
  echo "==> No previous .env found at $CURRENT_LINK/.env (place .env manually in $RELEASE_DIR)"
fi

echo "==> Switch current symlink"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

if [[ "$WITH_MIGRATE" -eq 1 ]]; then
  echo "==> Run DB migrations"
  cd "$CURRENT_LINK"
  if [[ -f ".prisma-cli-version" ]]; then
    PRISMA_VER="$(cat .prisma-cli-version)"
    npx "prisma@$PRISMA_VER" migrate deploy
  else
    npx prisma migrate deploy
  fi
fi

echo "==> Start/reload PM2"
cd "$CURRENT_LINK"
if [[ ! -f "ecosystem.config.cjs" ]]; then
  echo "Missing ecosystem.config.cjs in current release." >&2
  exit 1
fi

if command -v pm2 >/dev/null 2>&1; then
  PM2_APP_NAME="$APP_NAME" pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save
else
  echo "PM2 not found. Start manually: cd \"$CURRENT_LINK\" && node server.js" >&2
  exit 1
fi

echo "==> Health check"
curl -sS -I "http://127.0.0.1:3000/" | head -n 1 || true

echo "Done."
echo "Current release: $CURRENT_LINK -> $RELEASE_DIR"
