#!/usr/bin/env bash
set -euo pipefail

run_privileged() {
  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
}

if [[ ! -f .env ]]; then
  echo "[1/5] .env not found. Copying from .env.example"
  cp .env.example .env
else
  echo "[1/5] Using existing .env"
fi

set -a
source .env
set +a

HOST_DATA_PATH_VALUE="${HOST_DATA_PATH:-/data}"

echo "[2/5] Preparing persistent data path: ${HOST_DATA_PATH_VALUE}"
run_privileged mkdir -p "${HOST_DATA_PATH_VALUE}/documents" "${HOST_DATA_PATH_VALUE}/uploads" "${HOST_DATA_PATH_VALUE}/backups"
run_privileged chmod -R 775 "${HOST_DATA_PATH_VALUE}"

echo "[3/5] Rebuilding web/worker images to avoid stale image state"
docker compose build --no-cache web worker

echo "[4/5] Starting postgres and applying migrations"
docker compose up -d postgres
docker compose run --rm web npm run migrate:deploy

echo "[5/5] Starting web + worker"
docker compose up -d web worker

echo "Bootstrap completed."
