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
- **SQLite** (개발용 - 추후 MySQL/PostgreSQL로 전환 가능)

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
`.env` 파일이 자동으로 생성되어 있습니다. 필요시 수정하세요.
```
DATABASE_URL="file:./dev.db"
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

## 라이선스

MIT

## 문의

이슈가 있거나 문의사항이 있으시면 GitHub Issues를 이용해주세요.
