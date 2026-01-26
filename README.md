# 무역 재고관리 시스템 (알레스인터네셔날)

해외에서 물건을 수입해서 국내에 판매하는 무역업체를 위한 원가계산 및 재고관리 웹 애플리케이션입니다.

## 주요 기능

### 1. 품목 관리
- 품목 등록, 수정, 삭제
- 품목 코드, 이름, 단위, 비고 관리
- 중복 코드 방지

### 2. 입고 관리 (LOT 관리)
- LOT 단위 입고 등록
- 원가 자동 계산: `(물품대금 + 수입통관료 + 입고운송료 + 기타비용) / 입고수량`
- LOT 코드(BL번호, 참조번호 등) 관리
- 입고일, 입고수량, 잔량 추적

### 3. 출고 관리 (FIFO)
- **FIFO(선입선출) 자동 처리**: 가장 오래된 LOT부터 자동 차감
- 출고 시 LOT별 원가 및 출고 내역 표시
- 재고 부족 시 자동 방지
- 출고 이력 조회

### 4. 재고 조회
- 품목별 현재 재고 수량 조회
- LOT별 상세 정보 (입고일, 잔량, 단가)
- 품목별 평균 단가 및 재고 가치 계산
- 오래된 순으로 LOT 정렬

### 5. 창고료 관리
- 월별 창고료 입력 (기간비용으로 처리)
- 창고료는 재고 원가에 포함하지 않음
- 기간별 집계 및 조회

### 6. 대시보드
- 전체 재고 현황 요약
- 최근 출고 내역
- 총 재고 가치 표시

## 기술 스택

### 프론트엔드 & 백엔드
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**

### 데이터베이스
- **Prisma ORM**
- **PostgreSQL** (Neon - 클라우드 배포용)
- **SQLite** (로컬 개발용, 선택사항)

### 기타
- date-fns (날짜 처리)
- React Hooks (상태 관리)

## 설치 및 실행 방법

### 1. 저장소 클론
```bash
git clone https://github.com/Kis7474/alles-international-inventory.git
cd alles-international-inventory
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하세요.

**로컬 개발 (SQLite 사용)**
```bash
# .env 파일 내용
DATABASE_URL="file:./dev.db"
```

**또는 PostgreSQL 사용 (로컬 또는 클라우드)**
```bash
# .env 파일 내용
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
```

### 4. 데이터베이스 초기화
```bash
npx prisma generate
npx prisma db push
```

### 5. 개발 서버 실행
```bash
npm run dev
```

### 6. 브라우저에서 접속
```
http://localhost:3000
```

## 클라우드 배포 (Vercel + Neon PostgreSQL)

여러 컴퓨터에서 2-3명이 동시에 사용하려면 클라우드에 배포하세요.

### 아키텍처
- **Vercel**: Next.js 앱 호스팅 (무료 플랜)
- **Neon**: PostgreSQL 데이터베이스 (무료 512MB)

### Step 1: Neon 데이터베이스 생성

1. **Neon 가입 및 프로젝트 생성**
   - https://neon.tech 접속 및 가입
   - 새 프로젝트 생성
   - Region 선택: **Singapore** 권장 (한국과 가장 가까움)
   - Database name: `alles_inventory` (원하는 이름)

2. **연결 URL 복사**
   - 프로젝트 대시보드에서 **Connection String** 복사
   - 형식: `postgresql://username:password@host/database?sslmode=require`
   - 이 URL을 안전하게 보관하세요 (다음 단계에서 사용)

### Step 2: Vercel 배포

1. **Vercel 가입**
   - https://vercel.com 접속 및 가입
   - GitHub 계정으로 로그인 권장

2. **프로젝트 Import**
   - Vercel 대시보드에서 "Add New" → "Project" 클릭
   - GitHub 저장소 선택: `Kis7474/alles-international-inventory`
   - Import 클릭

3. **환경 변수 설정**
   - "Environment Variables" 섹션에서 다음 추가:
   ```
   Name: DATABASE_URL
   Value: postgresql://username:password@host/database?sslmode=require
   ```
   - Step 1에서 복사한 Neon 연결 URL을 Value에 붙여넣기
   - "Add" 클릭

4. **배포 시작**
   - "Deploy" 버튼 클릭
   - 빌드 및 배포 완료 대기 (약 2-3분)
   - 배포 완료 시 제공되는 URL 확인 (예: `https://your-app.vercel.app`)

### Step 3: 데이터베이스 초기화

배포 완료 후 데이터베이스 테이블을 생성해야 합니다.

**방법 1: 로컬에서 초기화 (권장)**
```bash
# .env 파일에 Neon 연결 URL 추가
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# Prisma로 데이터베이스 스키마 생성
npx prisma db push

# 확인
npx prisma studio
```

**방법 2: Vercel CLI 사용**
```bash
# Vercel CLI 설치 (최초 1회)
npm i -g vercel

# Vercel 프로젝트 연결
vercel link

# 환경 변수와 함께 Prisma 실행
vercel env pull .env.local
npx prisma db push
```

### Step 4: 접속 및 사용

1. **브라우저에서 접속**
   - Vercel에서 제공한 URL로 접속 (예: `https://your-app.vercel.app`)
   - 팀원들과 URL 공유

2. **멀티유저 사용**
   - 동일한 URL로 여러 명이 동시 접속 가능
   - 2-3명까지 무료 플랜으로 충분히 사용 가능
   - 데이터는 Neon PostgreSQL에 중앙 저장

### 주의사항

- **환경 변수 보안**: DATABASE_URL은 절대 GitHub에 커밋하지 마세요
- **무료 플랜 제한**: 
  - Neon: 512MB 스토리지, 무제한 연결
  - Vercel: 월 100GB 대역폭, 무제한 배포
- **백업**: 중요한 데이터는 정기적으로 백업하세요
- **로컬 개발**: 로컬에서는 SQLite(`file:./dev.db`)를 계속 사용 가능

### 업데이트 배포

코드 변경 후:
```bash
git add .
git commit -m "기능 추가"
git push
```
- GitHub에 푸시하면 Vercel이 자동으로 재배포합니다

### 문제 해결

**데이터베이스 연결 실패 시**
- Neon 연결 URL이 정확한지 확인
- `?sslmode=require` 파라미터가 포함되어 있는지 확인
- Vercel 환경 변수가 올바르게 설정되었는지 확인

**빌드 실패 시**
- Vercel 빌드 로그 확인
- `postinstall` 스크립트가 실행되는지 확인
- Prisma 버전 호환성 확인

**성능 이슈 시**
- Neon 대시보드에서 쿼리 성능 모니터링
- 필요시 인덱스 추가 고려

## 데이터베이스 스키마

### Item (품목 마스터)
- 품목 코드, 이름, 단위, 비고
- 품목별 LOT 및 입출고 이력 관리

### InventoryLot (LOT/입고 관리)
- 품목별 입고 배치 관리
- 입고수량, 현재 잔량
- 물품대금, 수입통관료, 입고운송료, 기타비용
- 자동 계산된 단가

### InventoryMovement (입출고 이력)
- 입고(IN), 출고(OUT), 조정(ADJUST) 타입
- LOT별 수량, 단가, 총액 기록
- 날짜별 이력 추적

### StorageExpense (창고료/기간비용)
- 월별 창고료 관리
- 기간, 금액, 메모

## API 엔드포인트

### 품목 API (`/api/items`)
- `GET` - 품목 목록 조회
- `POST` - 품목 등록
- `PUT` - 품목 수정
- `DELETE` - 품목 삭제

### 입고 API (`/api/lots`)
- `GET` - LOT 목록 조회
- `POST` - 입고 등록 (단가 자동 계산)

### 출고 API (`/api/outbound`)
- `GET` - 출고 이력 조회
- `POST` - FIFO 출고 처리

### 재고 API (`/api/inventory`)
- `GET` - 전체 재고 현황 조회
- `GET?itemId={id}` - 품목별 LOT 상세 조회

### 창고료 API (`/api/storage-expenses`)
- `GET` - 창고료 목록 조회
- `POST` - 창고료 등록
- `PUT` - 창고료 수정
- `DELETE` - 창고료 삭제

## 핵심 구현 로직

### FIFO 출고 처리
```typescript
1. 해당 품목의 잔량이 있는 LOT을 입고일 오름차순으로 조회
2. 필요 수량만큼 순차적으로 LOT에서 차감
   - LOT 잔량 < 출고 요청량: LOT 전체 차감 후 다음 LOT 처리
   - LOT 잔량 >= 출고 요청량: 필요한 만큼만 차감
3. 각 LOT별로 InventoryMovement 생성
4. 출고된 LOT 목록 및 원가 반환
```

### 단가 계산
```typescript
단가 = (물품대금 + 수입통관료 + 입고운송료 + 기타비용) / 입고수량
```
- 소수점 6자리까지 정밀도 유지
- 입고 시 자동 계산 및 저장

## 프로젝트 구조

```
alles-international-inventory/
├── app/
│   ├── api/                    # API 라우트
│   │   ├── items/              # 품목 CRUD
│   │   ├── lots/               # 입고 관리
│   │   ├── outbound/           # 출고 관리 (FIFO)
│   │   ├── inventory/          # 재고 조회
│   │   └── storage-expenses/   # 창고료 관리
│   ├── items/                  # 품목 관리 페이지
│   ├── lots/                   # 입고 관리 페이지
│   ├── outbound/               # 출고 관리 페이지
│   ├── inventory/              # 재고 조회 페이지
│   ├── storage-expenses/       # 창고료 관리 페이지
│   ├── layout.tsx              # 루트 레이아웃
│   └── page.tsx                # 대시보드
├── components/
│   └── Sidebar.tsx             # 네비게이션 사이드바
├── lib/
│   ├── prisma.ts               # Prisma 클라이언트
│   └── utils.ts                # 유틸리티 함수
├── prisma/
│   └── schema.prisma           # 데이터베이스 스키마
├── .env                        # 환경 변수
├── .env.example                # 환경 변수 예시
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 화면 구성

### 레이아웃
- 좌측 고정 사이드바 네비게이션
- 반응형 디자인 (모바일에서 햄버거 메뉴)
- 깔끔한 비즈니스 UI

### 주요 페이지
1. **홈 (/)** - 대시보드
2. **/items** - 품목 관리
3. **/lots** - 입고 관리
4. **/outbound** - 출고 관리
5. **/inventory** - 재고 조회
6. **/storage-expenses** - 창고료 관리

## 데이터 무결성

- 외래키 관계 설정으로 데이터 일관성 보장
- 음수 수량/금액 입력 방지
- 재고 부족 시 출고 자동 차단
- 품목 코드 중복 방지
- 입고 이력이 있는 품목 삭제 차단

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# Prisma Studio (데이터베이스 GUI)
npx prisma studio

# 데이터베이스 스키마 동기화
npx prisma db push

# Prisma 클라이언트 재생성
npx prisma generate
```

## 향후 확장 가능 기능

- 창고료를 재고 단가에 배분
- 여러 창고 관리
- 거래처 관리
- 판매 관리 및 손익계산서
- 환율 관리 및 외화 처리
- 사용자 인증 및 권한 관리
- 엑셀 내보내기/가져오기
- 대시보드 차트 및 분석

## 배포 가이드 (Vercel + Supabase PostgreSQL)

### 1. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에 가입하고 새 프로젝트 생성
2. 프로젝트 설정에서 Database connection string 복사
   - Settings > Database > Connection String
   - Transaction pooler 모드 사용 (포트 6543)
   - 예시: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`

### 2. Vercel 배포

1. GitHub 리포지토리와 Vercel 연동
2. 환경 변수 설정:
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
   KOREAEXIM_API_KEY=your_api_key (선택사항)
   ```
3. 배포 실행

### 3. 데이터베이스 마이그레이션

배포 후 데이터베이스 스키마를 동기화합니다:

**방법 1: 로컬에서 실행**
```bash
# DATABASE_URL을 .env 파일에 추가
npx prisma db push
```

**방법 2: Supabase SQL Editor에서 직접 실행**
1. Prisma 스키마 기반 SQL 생성
   ```bash
   npx prisma migrate dev --name init --create-only
   ```
2. 생성된 SQL을 Supabase SQL Editor에 복사하여 실행

### 4. 배포 후 확인사항

- [ ] Vercel 빌드가 성공적으로 완료되었는지 확인
- [ ] 대시보드 페이지가 정상적으로 로드되는지 확인
- [ ] API 엔드포인트가 정상적으로 응답하는지 확인
- [ ] 데이터베이스 연결이 정상적으로 작동하는지 확인

### 5. 로컬 개발 환경 설정

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env 파일 생성)
DATABASE_URL="postgresql://localhost:5432/alles_inventory"
# 또는 로컬 SQLite 사용
# DATABASE_URL="file:./dev.db"

# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma db push

# 개발 서버 실행
npm run dev
```

### 6. 문제 해결

**데이터베이스 연결 실패**
- Supabase connection string이 올바른지 확인
- Transaction pooler 모드 (포트 6543) 사용 확인
- 환경변수가 Vercel에 올바르게 설정되어 있는지 확인

**빌드 실패**
- `package.json`의 build 스크립트에 `prisma generate`가 포함되어 있는지 확인
- Node.js 버전 호환성 확인 (Node.js 18 이상 권장)

**API 에러 처리**
- 개발 모드에서는 상세한 에러 메시지 확인 가능
- 프로덕션 모드에서는 일반적인 에러 메시지만 표시됨
- 서버 로그에서 상세 에러 확인

## 라이선스

MIT

## 문의

이슈가 있거나 문의사항이 있으시면 GitHub Issues를 이용해주세요.
