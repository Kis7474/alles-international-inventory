# 문서 관리 기능 (Document Management)

## 개요

알레스인터네셔날 재고관리 시스템에 견적서(Quotation)와 거래명세서(Transaction Statement) 생성 및 관리 기능이 추가되었습니다.

## 주요 기능

### 1. 견적서 (Quotation)
- 고객에게 제공할 견적서 생성 및 관리
- 자동 견적번호 생성 (예: AQ260126-01)
- 거래처 정보, 담당자 정보 입력
- 다중 품목 지원
- 자동 금액 계산 (공급가액, 부가세 10%, 총액)
- PDF 및 Excel 다운로드

### 2. 거래명세서 (Transaction Statement / 납품명세서)
- 납품 시 사용하는 거래명세서 생성 및 관리
- 자동 거래번호 생성 (예: TS260126-01)
- 거래처 정보 입력
- 다중 품목 지원 (제품명, 규격, 수량, 단가, 금액)
- 자동 금액 계산
- 지불조건 및 계좌번호 입력
- 인수자 서명란
- PDF 및 Excel 다운로드

## 사용 방법

### 견적서 작성
1. 좌측 메뉴에서 "문서 관리" → "견적서" 선택
2. "견적서 작성" 버튼 클릭
3. 기본 정보 입력 (견적일자, 유효기한)
4. 견적담당자 정보 입력
5. 거래처 정보 입력
6. 품목 추가 및 수량, 단가 입력 (금액 자동 계산)
7. 추가 조건 입력 (납기, 지불조건, 유효기간 등)
8. "견적서 생성" 버튼 클릭

### 거래명세서 작성
1. 좌측 메뉴에서 "문서 관리" → "거래명세서" 선택
2. "거래명세서 작성" 버튼 클릭
3. 거래일 입력
4. 거래처 정보 입력
5. 품목 추가 및 수량, 단가 입력
6. 지불조건 및 계좌번호 확인/수정
7. 인수자 정보 입력
8. "거래명세서 생성" 버튼 클릭

### PDF/Excel 다운로드
- 문서 목록 또는 상세 페이지에서 "PDF 다운로드" 또는 "Excel 다운로드" 버튼 클릭
- PDF: 브라우저에서 인쇄 가능한 HTML 형식으로 새 창에 열림
- Excel: .xlsx 파일로 즉시 다운로드

## 기술 구조

### 데이터베이스 스키마
```prisma
model Quotation {
  id              Int       @id @default(autoincrement())
  quotationNumber String    @unique
  quotationDate   DateTime
  validUntil      DateTime?
  customerName    String?
  // ... 기타 필드
  items           QuotationItem[]
  subtotal        Float
  vatAmount       Float
  totalAmount     Float
}

model TransactionStatement {
  id              Int       @id @default(autoincrement())
  statementNumber String    @unique
  deliveryDate    DateTime
  recipientName   String?
  // ... 기타 필드
  items           TransactionStatementItem[]
  subtotal        Float
  vatAmount       Float
  totalAmount     Float
}
```

### API 엔드포인트

#### 견적서
- `GET /api/documents/quotation` - 견적서 목록 조회
- `POST /api/documents/quotation` - 견적서 생성
- `GET /api/documents/quotation/[id]` - 견적서 상세 조회
- `PUT /api/documents/quotation/[id]` - 견적서 수정
- `DELETE /api/documents/quotation/[id]` - 견적서 삭제
- `GET /api/documents/quotation/[id]/pdf` - PDF 다운로드
- `GET /api/documents/quotation/[id]/excel` - Excel 다운로드

#### 거래명세서
- `GET /api/documents/transaction-statement` - 거래명세서 목록 조회
- `POST /api/documents/transaction-statement` - 거래명세서 생성
- `GET /api/documents/transaction-statement/[id]` - 거래명세서 상세 조회
- `PUT /api/documents/transaction-statement/[id]` - 거래명세서 수정
- `DELETE /api/documents/transaction-statement/[id]` - 거래명세서 삭제
- `GET /api/documents/transaction-statement/[id]/pdf` - PDF 다운로드
- `GET /api/documents/transaction-statement/[id]/excel` - Excel 다운로드

### 공통 유틸리티 (`lib/document-utils.ts`)
```typescript
// VAT 세율 (10%)
export const VAT_RATE = 0.1

// VAT 및 총액 계산
export function calculateVAT(subtotal: number)

// 문서 번호 자동 생성
export function generateDocumentNumber(prefix: string, lastDocNumber: string | null)

// 회사 정보 상수
export const COMPANY_INFO
```

## 회사 정보

문서에 포함되는 회사 정보:
- 회사명: 알레스인터네셔날(주) / ALLES International Ltd.
- 주소: 김포시 태장로 741 경동미르웰시티 632호
- 전화: (02) 2645-8886
- 팩스: (031) 983-8867
- 홈페이지: http://www.alleskr.com/
- 은행: 하나은행 586-910007-02104
- 예금주: 알레스인터네셔날 주식회사
- 사업자등록번호: 109-86-37337
- 대표이사: 박범석

## 주요 특징

1. **자동 번호 생성**: 날짜 기반 순번 자동 생성 (AQ/TS + YYMMDD + 순번)
2. **VAT 자동 계산**: 10% 부가세 자동 계산
3. **다중 품목 지원**: 여러 품목을 하나의 문서에 포함
4. **Excel 포맷팅**: 셀 병합, 테두리, 배경색 등 완전한 스타일링
5. **인쇄 최적화**: A4 용지 크기에 최적화된 PDF 출력
6. **한글 지원**: 완전한 한글 지원 (PDF, Excel)

## 향후 개선 사항

- [ ] 기존 매입매출 데이터에서 품목 자동 불러오기
- [ ] 거래처 자동완성 기능
- [ ] 문서 템플릿 커스터마이징
- [ ] 문서 이력 관리
- [ ] 이메일 발송 기능
- [ ] 문서 검색 및 필터링 강화
