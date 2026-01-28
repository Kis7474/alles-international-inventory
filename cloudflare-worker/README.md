# Cloudflare Workers API Proxy

이 디렉토리는 한국 정부 API (한국수출입은행, UNI-PASS 관세청)를 프록시하는 Cloudflare Workers 코드를 포함합니다.

## 문제점

Vercel은 해외(미국) 서버에서 실행되기 때문에 한국 정부 API 호출 시 다음과 같은 문제가 발생합니다:
- 연결 시간 초과 (ETIMEDOUT)
- 연결 리셋 (ECONNRESET)
- 해외 IP 차단 또는 불안정한 연결

## 해결 방법

Cloudflare Workers는 전 세계에 분산된 엣지 네트워크를 사용하여:
- 한국 사용자에게는 한국 또는 가까운 리전에서 요청 처리
- 안정적인 연결 제공
- 무료 플랜으로 일 100,000 요청까지 무료

## 배포 방법

### 1. Cloudflare Workers 계정 생성

https://workers.cloudflare.com/ 에서 무료 계정을 생성하세요.

### 2. Wrangler CLI 설치

```bash
npm install -g wrangler
```

### 3. Cloudflare 로그인

```bash
wrangler login
```

브라우저가 열리고 Cloudflare 계정으로 로그인합니다.

### 4. Worker 배포

이 디렉토리에서 다음 명령을 실행하세요:

```bash
cd cloudflare-worker
wrangler deploy
```

배포가 완료되면 다음과 같은 Worker URL이 생성됩니다:
```
https://korean-api-proxy.your-subdomain.workers.dev
```

### 5. Vercel 환경 변수 설정

Vercel 프로젝트 설정에서 환경 변수를 추가하세요:

**Environment Variable:**
- Name: `CLOUDFLARE_PROXY_URL`
- Value: `https://korean-api-proxy.your-subdomain.workers.dev`

또는 `.env.local` 파일에 추가:
```bash
CLOUDFLARE_PROXY_URL=https://korean-api-proxy.your-subdomain.workers.dev
```

### 6. Vercel 재배포

환경 변수를 추가한 후 Vercel에서 재배포하면 프록시를 통해 API를 호출합니다.

## 작동 방식

1. Next.js 애플리케이션이 Cloudflare Worker URL로 요청을 보냅니다
2. Worker가 한국 정부 API로 요청을 전달합니다
3. Worker가 응답을 받아 Next.js로 전달합니다

```
[Next.js on Vercel] → [Cloudflare Worker] → [한국 정부 API]
                    ←                     ←
```

## 보안

- 허용된 도메인만 프록시 가능:
  - `www.koreaexim.go.kr` (한국수출입은행)
  - `unipass.customs.go.kr` (UNI-PASS 관세청)
- CORS 헤더 설정으로 브라우저에서도 사용 가능
- 타임아웃 및 에러 처리 포함

## 폴백 동작

프록시 URL이 설정되지 않은 경우, 기존 직접 호출 방식으로 자동 폴백됩니다.
따라서 프록시를 배포하지 않아도 기본 기능은 유지됩니다.

## 비용

Cloudflare Workers 무료 플랜:
- 일일 요청: 100,000회 무료
- CPU 시간: 요청당 10ms
- 메모리: 128MB

대부분의 경우 무료 플랜으로 충분합니다.

## 문제 해결

### Worker 배포 실패
```bash
# Wrangler 재설치
npm install -g wrangler@latest

# 로그인 재시도
wrangler logout
wrangler login
```

### Worker URL 확인
```bash
wrangler deployments list
```

### Worker 로그 확인
```bash
wrangler tail
```

## 참고 자료

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
