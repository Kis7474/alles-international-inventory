#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Stopping containers"
docker compose down

echo "[2/4] Removing postgres volume"
docker volume rm "$(basename "$PWD")_postgres_data" 2>/dev/null || true

echo "[3/4] Starting postgres"
docker compose up -d postgres

echo "[4/4] Applying fresh Prisma migration"
docker compose run --rm web npm run migrate:deploy

echo "Done: fresh PostgreSQL baseline is ready."
