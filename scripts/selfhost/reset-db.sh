#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] Stopping and removing containers/volumes"
docker compose down -v --remove-orphans

echo "[2/6] Removing dangling web/worker images (if any)"
docker image prune -f >/dev/null 2>&1 || true

echo "[3/6] Rebuilding images from current checkout"
docker compose build --no-cache web worker

echo "[4/6] Starting postgres"
docker compose up -d postgres

echo "[5/6] Applying fresh Prisma migration"
docker compose run --rm web npm run migrate:deploy

echo "[6/6] Starting web + worker"
docker compose up -d web worker

echo "Done: fresh PostgreSQL baseline is ready."
