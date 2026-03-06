# Self-hosted Baseline (Ubuntu + Docker + Local PostgreSQL)

## 목표
- 운영 DB 단일 원천: Docker `postgres` 컨테이너
- 파일 저장: 서버 파일시스템 `/data/*`
- 자동화 입력: 사용자 업로드(메일 수집 제외)

## 아키텍처
- `web`: Next.js ERP API/UI
- `worker`: 업로드 문서 파싱/재처리
- `postgres`: 로컬 PostgreSQL (authoritative)

## 필수 환경 변수
```bash
NODE_ENV=production
WEB_PORT=3000
POSTGRES_PORT=5432
POSTGRES_DB=alles_inventory
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/alles_inventory
DIRECT_URL=postgresql://postgres:postgres@postgres:5432/alles_inventory
HOST_DATA_PATH=/data
FILE_STORAGE_ROOT=/data/uploads
DOCUMENTS_STORAGE_ROOT=/data/documents
BACKUP_ROOT=/data/backups
WORKER_POLL_INTERVAL_MS=5000
```

## 최초 부트스트랩
```bash
cp .env.example .env
# 필요 시 HOST_DATA_PATH=/data 설정
./scripts/selfhost/bootstrap.sh
```

## DB 완전 리셋(기존 데이터 파기)
```bash
./scripts/selfhost/reset-db.sh
# down -v + no-cache rebuild + migrate 포함
```

## 수동 검증 핵심
1. `docker compose ps` 에서 `postgres`, `web`, `worker`가 up 상태
2. `curl http://127.0.0.1:3000/api/health`
3. 문서 업로드 -> `AutomationDocument` 생성 -> worker 파싱 -> draft 생성
4. Draft approve 시에만 `SalesRecord`/`InventoryMovement` 반영


## Docker 검증(서버에서)
```bash
docker compose down -v --remove-orphans
docker compose build --no-cache web worker
docker compose run --rm web openssl version
docker compose run --rm web npx prisma -v
docker compose run --rm web npm run migrate:deploy
```
