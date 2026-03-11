# Phase C-0 Spec Template: 매입/매출 다품목 등록 (Sales Bulk)

> 목적: 구현 전에 정책/입출력/실패처리를 문서로 먼저 확정해, 단계적 개발 시 회귀를 줄인다.

---

## 0) 문서 메타
- 작성일:
- 작성자:
- 상태: DRAFT / REVIEW / APPROVED
- 적용 대상 릴리즈:
- 관련 이슈/PR:

---

## 1) 배경 & 문제 정의
- 현재 문제:
  - 매입/매출 등록이 단건 입력 중심이라 반복 작업 비용이 큼.
  - 거래처별 월간 품목을 일괄 입력하기 어려움.
- 목표:
  - 거래처 기준으로 다품목 라인을 한번에 등록.
  - 기존 단건 등록 흐름과 호환 유지.

---

## 2) 범위 (In Scope)
- [ ] `sales/new`에 다품목 입력 모드 추가
- [ ] 신규 API `POST /api/sales/bulk` 추가
- [ ] 라인별 자동매입 ON/OFF 지원
- [ ] 에러를 라인번호 단위로 반환
- [ ] 초기 실패정책: 전체 롤백(atomic)

## 3) 비범위 (Out of Scope)
- [ ] 엑셀 업로드 폐기/이관
- [ ] 서비스 기간 기능
- [ ] 마스터 레거시 모델 정리

---

## 4) 엔트리 전략
### 4.1 UI 엔트리
- 기본: 기존 단건 등록 모드 유지
- 추가: 다품목 모드 토글

### 4.2 API 엔트리
- 권장: `POST /api/sales/bulk`
- 단건 API(`POST /api/sales`)는 유지

---

## 5) 데이터 계약 (Request / Response)

### 5.1 Request (Draft)
```json
{
  "header": {
    "date": "2026-03-01",
    "type": "SALES",
    "vendorId": 12,
    "salespersonId": 3,
    "categoryId": 5,
    "customer": "ABC상사",
    "autoCreatePurchaseDefault": true,
    "notes": "월말 일괄 등록"
  },
  "lines": [
    {
      "lineNo": 1,
      "productId": 101,
      "itemName": "품목A",
      "quantity": 3,
      "unitPrice": 12000,
      "cost": 9000,
      "purchasePriceOverride": 8500,
      "autoCreatePurchase": true,
      "notes": ""
    }
  ]
}
```

### 5.2 Success Response (Draft)
```json
{
  "success": true,
  "mode": "atomic",
  "summary": {
    "totalLines": 10,
    "createdSales": 10,
    "createdPurchases": 7
  },
  "salesRecordIds": [101, 102, 103]
}
```

### 5.3 Error Response (Draft)
```json
{
  "success": false,
  "error": "VALIDATION_FAILED",
  "mode": "atomic",
  "lineErrors": [
    { "lineNo": 2, "field": "unitPrice", "message": "매출단가가 없습니다." },
    { "lineNo": 4, "field": "productId", "message": "품목을 찾을 수 없습니다." }
  ]
}
```

---

## 6) 유효성 검증 규칙 (Draft)
- 공통
  - [ ] `header.date`, `header.type`, `header.vendorId`, `header.salespersonId`, `header.categoryId` 필수
  - [ ] `lines` 1개 이상
- 라인
  - [ ] `productId` 또는 `itemName` 정책 확정 (택1/병행)
  - [ ] `quantity > 0`
  - [ ] `unitPrice >= 0` (SALES는 정책상 `> 0` 권장)
- 자동매입
  - [ ] `type=SALES` && `autoCreatePurchase=true`인 라인은 매입거래처 검증 필수

---

## 7) 실패 정책 (Atomic)
- 정의:
  - 한 라인이라도 실패하면 전체 트랜잭션 롤백
- 이유:
  - 회계/거래 데이터 정합성 유지
  - 부분 성공으로 인한 누락/중복 방지
- 추후 옵션:
  - `mode=partial`은 별도 릴리즈에서 검토

---

## 8) 가격/원가 정책 (Draft)
- SALES 단가:
  - 거래처별 가격 우선(현재 정책 유지)
- 원가 입력:
  - 기본 필드 1개(기준원가) + 고급 옵션에서 자동매입 단가 분리(정책 확정 필요)
- 라인별 자동매입:
  - 헤더 기본값(`autoCreatePurchaseDefault`) + 라인 override

---

## 9) UI 동작 정의 (Draft)
- 라인 편집
  - [ ] 행 추가/삭제
  - [ ] 품목 선택
  - [ ] 수량/단가/원가 입력
  - [ ] 라인별 자동매입 토글
- 요약
  - [ ] 총 공급가액, 총 원가, 총 마진
- 에러
  - [ ] 라인번호/필드 단위 표시
  - [ ] 오류 라인만 수정 가능

---

## 10) 마이그레이션/호환성
- DB 스키마 변경 필요 여부:
  - [ ] 없음 (초기)
  - [ ] 필요 (기록용 배치ID 등) - 추후 검토
- 기존 API/화면 호환성:
  - 단건 등록 유지

---

## 11) 테스트 계획
### 11.1 API
- [ ] 정상 1라인
- [ ] 정상 20라인
- [ ] 1라인 오류 시 전체 롤백 확인
- [ ] 라인별 자동매입 ON/OFF 혼합

### 11.2 UI
- [ ] 라인 추가/삭제/수정
- [ ] 에러 라인 하이라이트
- [ ] 재제출 시 성공 전환

### 11.3 회귀
- [ ] 기존 단건 등록 동작 동일
- [ ] 기존 매출 수정 화면 영향 없음

---

## 12) 롤아웃 계획
- 단계 배포:
  1. API 먼저 배포(숨김 플래그)
  2. UI 다품목 모드 배포
  3. 운영 가이드/릴리즈 노트 배포

- 롤백 전략:
  - UI 토글 OFF + bulk API 호출 중지

---

## 13) 오픈 이슈 (확정 필요)
1. `itemName` 자유입력 허용 여부
2. `unitPrice=0` 허용 범위
3. 원가/자동매입단가 단일화 UX 최종안
4. 추후 partial 모드 도입 여부

---

## 14) 승인 체크리스트
- [ ] PM 승인
- [ ] 개발 승인
- [ ] QA 승인
- [ ] 운영 승인
