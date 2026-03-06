#!/usr/bin/env bash
set -euo pipefail

mkdir -p ./data/documents ./data/uploads ./data/backups
chmod -R 775 ./data

docker compose up -d --build postgres
docker compose run --rm web npm run migrate:deploy
docker compose up -d web worker

echo "Bootstrap completed."
