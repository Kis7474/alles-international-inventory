#!/usr/bin/env bash
set -euo pipefail

# NAS 마운트 전 사전 점검 스크립트 (앱 서버에서 실행)
# 사용 예:
#   NAS_MOUNT=/mnt/nas/alles-inventory/uploads ./scripts/onprem/nas-precheck.sh

NAS_MOUNT="${NAS_MOUNT:-/mnt/nas/alles-inventory/uploads}"

echo "[1/4] 마운트 포인트 확인: ${NAS_MOUNT}"
mkdir -p "${NAS_MOUNT}"

echo "[2/4] 쓰기/읽기 테스트"
TEST_FILE="${NAS_MOUNT}/.nas_write_test_$(date +%s).tmp"
echo "nas-write-test" > "${TEST_FILE}"
cat "${TEST_FILE}" >/dev/null
rm -f "${TEST_FILE}"

echo "[3/4] 권한/용량 확인"
id
ls -ld "${NAS_MOUNT}"
df -h "${NAS_MOUNT}"

echo "[4/4] 완료: FILE_STORAGE_ROOT에 경로 적용 가능"
echo "FILE_STORAGE_ROOT=${NAS_MOUNT}"
