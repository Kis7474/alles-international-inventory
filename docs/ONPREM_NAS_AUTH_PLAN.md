# 온프레미스 DB + NAS + 계정/권한 확정안

## 1) 역할 확정 (2개)

- ADMIN (2명: BS, SJ)
  - 모든 메뉴/데이터/API 접근 가능
  - 사용자 계정/권한 관리 가능
  - 시스템 설정, API/보안 설정 접근 가능
  - 커미션 정책/정산 정보 접근 가능

- STAFF (2명: YR, IK)
  - 본인 담당 영업/매입매출/수입/재고 등록 및 삭제 가능
  - 품목/거래처 등록 가능
  - 월/연도 리포트 조회 가능 (권장: 조회만 허용, 내역 수정/설정 불가)
  - 커미션 정산 기준/결과 화면 접근 불가
  - API/보안 설정 접근 불가

## 2) 계정 4개 확정

초기 계정(시드 기준):

- BS (ADMIN): bs@alles.local
- SJ (ADMIN): sj@alles.local
- YR (STAFF): yr@alles.local
- IK (STAFF): ik@alles.local

초기 비밀번호는 환경변수로 주입:
- `SEED_ADMIN_PASSWORD`
- `SEED_STAFF_PASSWORD`

## 3) 온프레 PostgreSQL 서버 1대 준비 체크리스트

최소 권장 사양:
- CPU 4코어
- RAM 16GB
- NVMe SSD 500GB+
- Ubuntu 22.04 LTS

보안 기본:
- 내부망 고정 IP 할당
- UFW로 5432 포트 내부망만 허용
- DB 계정 분리(앱용 최소권한 계정)
- 일일 백업(덤프) + 주간 복구 리허설

초기 준비 순서:
1. PostgreSQL 설치 및 서비스 등록
2. 앱 DB/유저 생성
3. `DATABASE_URL`, `DIRECT_URL` 온프레 주소로 교체
4. `npx prisma generate && npx prisma db push`
5. 애플리케이션 smoke test

## 4) NAS 장비 후보 (2~3개)

1. Synology DS923+
   - SMB/NFS 안정성 우수, 관리 UI 쉬움
   - 중소 규모 사내 운영에 적합

2. QNAP TS-464
   - 성능/확장성 우수, 앱 생태계 다양
   - 초기 설정 보안 점검 필수

3. TrueNAS SCALE (커스텀 서버)
   - 유연성/가성비 우수, 고급 운영에 적합
   - 운영 난이도 가장 높음

권장 구성:
- RAID1(2베이) 이상
- UPS 필수
- 스냅샷 + 외부 백업(주 1회)

## 5) NAS 미구축 현시점 운영 정책

NAS 구축 전 임시 정책:
- 파일 저장: 로컬 디스크(`FILE_STORAGE_ROOT=./public/uploads`)
- 백업: 일 1회 로컬 아카이브 + 외장/원격 백업
- 장애 대응 책임:
  - 1차: 관리자 BS
  - 2차: 관리자 SJ
  - 복구 목표(RTO): 4시간 이내

NAS 구축 완료 후 정책 전환:
- 백업 주기: 일 증분 + 주 전체 + 월 오프사이트
- 월 1회 복구 리허설
- 저장소 용량 80% 도달 시 경고


## 6) 실행 스크립트

- 온프레 PostgreSQL 초기 설치: `scripts/onprem/setup-postgres.sh`
- NAS 마운트/권한 사전 점검: `scripts/onprem/nas-precheck.sh`

권장 순서:
1. PostgreSQL 서버에 `setup-postgres.sh` 실행
2. 앱 서버에서 `.env`의 `DATABASE_URL`, `DIRECT_URL`을 온프레 DB로 교체
3. `npx prisma generate && npx prisma db push && npx prisma db seed`
4. NAS 연결 후 앱 서버에서 `nas-precheck.sh` 실행
5. `.env`의 `FILE_STORAGE_ROOT`를 NAS 경로로 변경
