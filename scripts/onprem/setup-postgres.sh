#!/usr/bin/env bash
set -euo pipefail

# Ubuntu 22.04+ 기준 온프레 PostgreSQL 1대 초기 설정 스크립트
# 실행 예:
#   sudo APP_DB=alles_inventory APP_USER=alles_app APP_PASSWORD='StrongPass!' ./scripts/onprem/setup-postgres.sh

APP_DB="${APP_DB:-alles_inventory}"
APP_USER="${APP_USER:-alles_app}"
APP_PASSWORD="${APP_PASSWORD:-change-me}"

if [[ "$EUID" -ne 0 ]]; then
  echo "[ERROR] root 권한으로 실행하세요. (sudo 사용)"
  exit 1
fi

echo "[1/6] 패키지 설치"
apt-get update -y
apt-get install -y postgresql postgresql-contrib ufw

echo "[2/6] PostgreSQL 서비스 활성화"
systemctl enable postgresql
systemctl start postgresql

echo "[3/6] 앱 DB/계정 생성"
sudo -u postgres psql <<SQL
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_USER}') THEN
      CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASSWORD}';
   END IF;
END
\$\$;
SQL

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${APP_DB}'" | grep -q 1 || sudo -u postgres createdb "${APP_DB}" -O "${APP_USER}"

echo "[4/6] 최소 권한 설정"
sudo -u postgres psql <<SQL
GRANT CONNECT ON DATABASE ${APP_DB} TO ${APP_USER};
\c ${APP_DB}
GRANT USAGE ON SCHEMA public TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${APP_USER};
SQL

echo "[5/6] 방화벽(5432 내부망 허용 예시)"
ufw allow from 10.0.0.0/8 to any port 5432 proto tcp || true
ufw allow from 172.16.0.0/12 to any port 5432 proto tcp || true
ufw allow from 192.168.0.0/16 to any port 5432 proto tcp || true
ufw --force enable || true

echo "[6/6] 완료"
echo "DATABASE_URL=postgresql://${APP_USER}:${APP_PASSWORD}@<ONPREM_DB_IP>:5432/${APP_DB}"
echo "DIRECT_URL=postgresql://${APP_USER}:${APP_PASSWORD}@<ONPREM_DB_IP>:5432/${APP_DB}"
