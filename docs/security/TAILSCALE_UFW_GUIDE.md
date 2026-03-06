# Ubuntu Server + Tailscale 배포 보안 가이드 (Phase 0)

## 1) 기본 원칙
- `web` 포트는 `127.0.0.1` 로컬 바인딩 또는 `tailscale0` 인터페이스만 허용
- `postgres`는 외부 공개 금지 (`127.0.0.1` 바인딩)
- 인터넷 공개 포트는 열지 않음

## 2) UFW 예시
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH를 tailscale0에서만 허용 (필요시)
sudo ufw allow in on tailscale0 to any port 22 proto tcp

# ERP web 포트 3000을 tailscale0에서만 허용
sudo ufw allow in on tailscale0 to any port 3000 proto tcp

# postgres는 로컬에서만 사용하므로 외부 규칙 추가 금지

sudo ufw enable
sudo ufw status verbose
```

## 3) 노출 점검
```bash
# 컨테이너 바인딩 점검
docker compose ps
ss -lntp | rg '3000|5432'

# 기대값
# 127.0.0.1:3000 (web)
# 127.0.0.1:5432 (postgres)
```

## 4) reverse proxy 권장
- Nginx/Caddy를 host에 배치하고 `127.0.0.1:3000` upstream 연결
- 방화벽은 tailscale0 inbound만 허용
