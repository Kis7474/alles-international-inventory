# 역할/권한 매트릭스 (확정안)

## 역할 구성 (총 4계정)
- ADMIN (2명): BS, SJ
- STAFF (2명): YR, IK

## 공통 원칙
- 모든 API는 인증(세션) 이후 접근
- STAFF는 시스템 설정/보안/API 정책 변경 불가
- STAFF는 본인 담당 데이터만 등록/수정/삭제 가능 (1차: `/api/sales` 적용)

## 메뉴 권한
| 메뉴/기능 | ADMIN | STAFF |
|---|---|---|
| 대시보드 조회 | ✅ | ✅ |
| 매입/매출 등록·수정·삭제 | ✅ | ✅(본인 담당만) |
| 수입/수출 등록·수정·삭제 | ✅ | ✅(점진 반영) |
| 재고 등록·수정·삭제 | ✅ | ✅(점진 반영) |
| 품목/거래처 등록 | ✅ | ✅ |
| 월/연 리포트 조회 | ✅ | ✅(조회 전용) |
| 커미션 정보 조회 | ✅ | ❌ |
| 시스템 설정(API/보안) | ✅ | ❌ |
| 사용자/권한 관리 | ✅ | ❌ |
| 비밀번호 변경 | ✅ | ✅ |

## API 권한 가이드
- `/api/auth/*`
  - login: 공개
  - me/logout/change-password: 인증 사용자
- `/api/settings/*`: ADMIN 전용
- `/api/upload`: ADMIN/STAFF
- `/api/sales`: ADMIN/STAFF + STAFF 본인 담당 데이터 강제
- 그 외 업무 API: ADMIN/STAFF + STAFF 본인 담당 데이터 필터(순차 적용)

## 계정 목록 (초기)
- BS / `bs@alles.local` / ADMIN
- SJ / `sj@alles.local` / ADMIN
- YR / `yr@alles.local` / STAFF
- IK / `ik@alles.local` / STAFF

초기 비밀번호는 아래 환경변수로 주입:
- `SEED_ADMIN_PASSWORD`
- `SEED_STAFF_PASSWORD`

로그인 후 `설정 > 비밀번호 변경`에서 직접 변경 가능.
