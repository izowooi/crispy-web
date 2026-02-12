# Next.js Edge Runtime 기반 Replicate API 연동 웹앱의 IP 접근 제어 종합 가이드

**Next.js Edge Runtime에서 Replicate API를 안전하게 호출하면서 IP 기반 접근 제어를 구현하려면, 플랫폼 수준의 WAF 규칙과 애플리케이션 수준의 미들웨어를 결합하는 다층 방어 전략이 가장 효과적이다.** Cloudflare Pages는 무료 티어에서도 WAF Custom Rules과 IP Access Rules를 제공해 코드 없이 IP 제한이 가능한 반면, Vercel은 Enterprise 플랜에서만 플랫폼 수준 IP 차단을 지원하므로 무료/Pro 티어에서는 Edge Middleware 코드로 직접 구현해야 한다. 모바일 LTE 사용자의 경우 CGNAT으로 인한 유동 IP 문제 때문에 IP 화이트리스트만으로는 접근 제어가 불가능하며, 비밀번호/토큰 인증 또는 OAuth를 병행해야 한다.

---

## 1. Edge Runtime과 Node.js Runtime은 어떻게 다른가

Next.js는 두 가지 서버 런타임을 제공한다. **Node.js Runtime**은 기본값으로 모든 Node.js API에 접근 가능하고, **Edge Runtime**은 V8 엔진 기반의 경량 Web API 서브셋이다. Edge Runtime은 WinterCG 표준을 따르며, Vercel·Cloudflare·Deno가 공동으로 정의한 사양에 기반한다.

### 핵심 차이점 비교

| 구분 | Edge Runtime | Node.js Runtime |
|------|-------------|----------------|
| **엔진** | V8 Isolates (Web API 서브셋) | Node.js 전체 API |
| **콜드 스타트** | **~0ms** (거의 즉시) | 100~1,000ms |
| **메모리** | 128MB | 1,024~3,008MB |
| **최대 실행 시간** | 25초 (스트리밍 시 300초) | 10~900초 (플랜별) |
| **번들 크기 (Vercel)** | 1~4MB (gzip, 플랜별) | 250MB |
| **파일시스템** | ❌ 불가 | ✅ `fs`, `path` 사용 가능 |
| **DB 직접 연결** | ❌ TCP/UDP 불가 | ✅ 가능 |
| **글로벌 배포** | ✅ 자동 (전 세계 엣지) | 특정 리전 |

Edge Runtime에서 사용 가능한 주요 API는 `fetch`, `Request`, `Response`, `Headers`, `URL`, `crypto.subtle`, `TextEncoder/Decoder`, `ReadableStream/WritableStream`, `AbortController` 등이다. 반면 **`fs`, `net`, `child_process`, `eval()`, `new Function()`은 사용 불가**하며, Prisma(표준), AWS SDK, Stripe Node.js SDK 등 많은 라이브러리가 호환되지 않는다.

### App Router에서 Edge Runtime 설정

```typescript
// app/api/hello/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  return new Response(JSON.stringify({ message: 'Hello from Edge!' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Cloudflare Pages에서의 Next.js 지원 현황

Cloudflare의 Next.js 어댑터는 세대교체가 이루어졌다. 기존 `@cloudflare/next-on-pages`는 **공식 폐기(deprecated)** 되었으며, 현재 권장 방식은 **`@opennextjs/cloudflare`**이다. 중요한 차이점은 새 어댑터가 Edge Runtime이 아닌 **Node.js Runtime을 사용**한다는 것이다.

```bash
# 새 프로젝트 생성
npm create cloudflare@latest -- my-next-app --framework=next --platform=workers

# 기존 프로젝트에 추가
npm install @opennextjs/cloudflare
```

```jsonc
// wrangler.jsonc
{
  "name": "my-next-app",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"]
}
```

`@opennextjs/cloudflare`는 SSR, ISR, Image Optimization, Server Actions, PPR(Partial Prerendering)을 모두 지원하며, Next.js 14·15·16을 공식 지원한다. Worker 번들 크기 제한은 무료 플랜 **3MB**, 유료 플랜 **10MB**이다.

### 환경변수 보안 관리

**`NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트 번들에 인라인되므로 절대 API 키에 사용하면 안 된다.** 접두사 없는 변수만 서버 측 `process.env`에서 접근 가능하다.

| 플랫폼 | 시크릿 설정 방법 | 접근 방식 |
|--------|--------------|---------|
| **Vercel** | Dashboard → Settings → Environment Variables (Sensitive 플래그) | `process.env.SECRET_NAME` |
| **Cloudflare** | `wrangler secret put` 또는 Dashboard | `env.SECRET_NAME` (Workers 바인딩) |

Vercel의 Edge Runtime에서는 `process.env`로 일반 서버 환경변수와 동일하게 접근할 수 있으며, 동적 접근(`process.env[dynamicKey]`)도 지원된다. `.env.local` 파일은 반드시 `.gitignore`에 포함시켜야 한다.

---

## 2. Replicate API를 안전하게 연동하는 아키텍처

Replicate API는 ML 모델을 클라우드에서 실행하는 서비스로, GPU 사용 시간 기반 과금 모델을 사용한다. 공식 JavaScript SDK(`replicate` npm 패키지)는 **서버 측에서만 사용 가능**하며 브라우저에서 직접 호출할 수 없도록 설계되어 있다.

### 프론트엔드 직접 호출이 위험한 이유

프론트엔드에서 Replicate API를 직접 호출하면 `REPLICATE_API_TOKEN`이 클라이언트 JavaScript 번들에 노출된다. 이 토큰이 탈취되면 공격자가 **무제한으로 GPU 리소스를 사용**할 수 있어 막대한 비용이 발생한다. Flux-schnell 모델 기준 이미지 1,000장 생성 비용이 $3이지만, A100 GPU 기준 시간당 **$5.04**가 과금되므로 대규모 악용 시 심각한 재정적 피해가 가능하다.

올바른 아키텍처는 항상 **서버(API Route/Edge Function)를 프록시로 사용**하는 것이다:

```
브라우저 → Next.js API Route (서버) → Replicate API
```

### API Route를 통한 Replicate 호출 (Next.js 14+ App Router)

**예측(Prediction) 생성 API Route:**

```typescript
// app/api/predictions/route.ts
import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Next.js App Router의 fetch 캐싱 비활성화 (중요!)
replicate.fetch = (url, options) => {
  return fetch(url, { ...options, cache: 'no-store' });
};

export async function POST(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not configured' },
      { status: 500 }
    );
  }

  const { prompt } = await request.json();

  try {
    const prediction = await replicate.predictions.create({
      version: '8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f',
      input: { prompt },
    });

    if (prediction?.error) {
      return NextResponse.json({ error: prediction.error }, { status: 500 });
    }

    return NextResponse.json(prediction, { status: 201 });
  } catch (err) {
    if (err instanceof Replicate.APIError) {
      const messages: Record<number, string> = {
        401: '유효하지 않은 API 토큰',
        402: '크레딧 부족 — 결제 수단을 등록하세요',
        422: '잘못된 입력 파라미터',
        429: '요청 한도 초과 — 잠시 후 재시도하세요',
      };
      return NextResponse.json(
        { error: messages[err.status] || 'Replicate API 오류' },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: '서버 내부 오류' }, { status: 500 });
  }
}
```

**예측 상태 조회 API Route:**

```typescript
// app/api/predictions/[id]/route.ts
import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const prediction = await replicate.predictions.get(params.id);

  if (prediction?.error) {
    return NextResponse.json({ error: prediction.error }, { status: 500 });
  }

  return NextResponse.json(prediction);
}
```

### Server Actions vs API Routes

Server Actions도 Replicate API 호출에 사용 가능하지만, **긴 실행 시간이 필요한 모델이나 Webhook 수신이 필요한 경우에는 API Routes가 적합**하다. Server Actions는 빠르게 완료되는 간단한 모델에만 권장된다.

```typescript
// app/actions.ts
'use server';

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateImage(prompt: string) {
  try {
    const [output] = await replicate.run('black-forest-labs/flux-schnell', {
      input: { prompt },
    });
    return { success: true, url: output.url() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}
```

### Rate Limiting 구현 (Upstash Redis)

Edge Runtime에서 가장 널리 사용되는 Rate Limiting 방식은 **`@upstash/ratelimit` + Upstash Redis**이다. HTTP 기반이므로 TCP 연결이 불가능한 Edge 환경에서도 동작한다.

```typescript
// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import Replicate from 'replicate';

const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.fixedWindow(5, '1440 m'), // 24시간에 5회
  analytics: true,
});

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const { success, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: '요청 한도를 초과했습니다.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  const { prompt } = await request.json();
  const [output] = await replicate.run('black-forest-labs/flux-schnell', {
    input: { prompt },
  });

  return NextResponse.json({ url: output.url() });
}
```

---

## 3. IP 기반 접근 제어 구현: 플랫폼별 완전 가이드

### Cloudflare Pages의 IP 제한 방법

Cloudflare는 무료 티어에서도 강력한 IP 제한 기능을 제공한다.

**방법 1: WAF Custom Rules (권장, 코드 불필요)**
1. Cloudflare Dashboard → Account → Configurations → Lists에서 IP 목록 생성
2. Security → WAF → Custom Rules에서 `not ip.src in $allowlist` → Block 규칙 생성
3. 무료 플랜에서 **최대 5개** Custom Rules 사용 가능 — IP 화이트리스트 1개 규칙으로 충분

**방법 2: IP Access Rules (레거시, 무료)**
Security → WAF → Tools → IP Access Rules에서 개별 IP, /16, /24 CIDR 범위를 Allow/Block 설정 가능. **모든 플랜에서 계정당 50,000개 규칙**까지 지원한다. 단, Allow 설정 시 WAF 전체를 우회하므로 Custom Rules보다 세밀한 제어가 어렵다.

**방법 3: Workers에서 커스텀 로직**
```javascript
export default {
  async fetch(request) {
    const clientIP = request.headers.get('CF-Connecting-IP');
    const allowedIPs = ['203.0.113.1', '198.51.100.0/24'];
    
    if (!allowedIPs.includes(clientIP)) {
      return new Response('Forbidden', { status: 403 });
    }
    return fetch(request);
  },
};
```

### Vercel의 IP 제한 방법

Vercel의 플랫폼 수준 IP 제한은 **Enterprise 전용**이다. Hobby/Pro 플랜에서는 Edge Middleware로 직접 구현해야 한다.

| 기능 | Hobby (무료) | Pro ($20/user/월) | Enterprise (~$3,500+/월) |
|------|------------|-----------------|------------------------|
| Edge Middleware IP 필터링 | ✅ 코드로 구현 | ✅ 코드로 구현 | ✅ 코드로 구현 |
| Firewall Custom Rules | 제한적 | ✅ | ✅ (고급) |
| Trusted IPs | ❌ | ❌ | ✅ |
| CIDR 범위 차단 | ❌ | ❌ | ✅ |
| 계정 수준 IP 차단 | ❌ | ❌ | ✅ |

### Next.js Middleware IP 화이트리스트 구현 (전체 코드)

이 코드는 Vercel과 Cloudflare 모두에서 동작하며, CIDR 매칭을 포함한 완전한 IP 화이트리스트를 구현한다.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 환경변수에서 허용 IP 목록 로드 (쉼표 구분)
// 예: ALLOWED_IPS="203.0.113.1,192.168.1.0/24,10.0.0.0/8"
const ALLOWED_IPS = (process.env.ALLOWED_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

// IP 체크를 건너뛸 경로
const PUBLIC_PATHS = ['/api/health', '/_next/static', '/_next/image', '/favicon.ico'];

/**
 * 클라이언트 IP를 추출하는 함수
 * 플랫폼별로 IP를 가져오는 방법이 다르므로 우선순위를 두고 시도
 */
function getClientIp(req: NextRequest): string {
  // 1. Vercel 제공 IP (가장 신뢰할 수 있음)
  if (req.ip) return req.ip;

  // 2. Cloudflare 제공 IP
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // 3. 표준 프록시 헤더 (첫 번째 값이 원본 클라이언트 IP)
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();

  // 4. Nginx 등에서 설정하는 헤더
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}

/**
 * IPv4 주소를 32비트 정수로 변환
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * IPv4-mapped IPv6 주소 정규화 (::ffff:192.168.1.1 → 192.168.1.1)
 */
function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * IP가 CIDR 범위에 속하는지 확인
 * 예: isIpInCidr('192.168.1.50', '192.168.1.0/24') → true
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  if (!bits) return ip === range; // CIDR이 아닌 단일 IP 비교

  const prefixLength = parseInt(bits, 10);
  const mask = ~(2 ** (32 - prefixLength) - 1) >>> 0;
  return (ipToNumber(ip) & mask) === (ipToNumber(range) & mask);
}

/**
 * 클라이언트 IP가 허용 목록에 있는지 확인
 */
function isIpAllowed(clientIp: string, allowList: string[]): boolean {
  const normalized = normalizeIp(clientIp);

  // IPv6 주소이고 IPv4-mapped가 아닌 경우 (순수 IPv6)
  if (normalized.includes(':')) {
    return allowList.includes(normalized);
  }

  return allowList.some((entry) => {
    if (entry.includes('/')) {
      return isIpInCidr(normalized, entry);
    }
    return normalized === entry;
  });
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 정적 리소스 및 퍼블릭 경로는 IP 체크 건너뛰기
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 개발 환경에서는 IP 체크 비활성화
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // 허용 IP 목록이 비어있으면 모든 접근 허용 (미설정 시 안전 모드)
  if (ALLOWED_IPS.length === 0) {
    return NextResponse.next();
  }

  const clientIp = getClientIp(req);

  if (isIpAllowed(clientIp, ALLOWED_IPS)) {
    // 허용된 IP — 요청 헤더에 IP 정보 추가 (로깅용)
    const response = NextResponse.next();
    response.headers.set('X-Client-IP', clientIp);
    return response;
  }

  // 차단된 IP — 403 응답
  console.log(`[IP-BLOCK] ${clientIp} → ${pathname}`);
  return new NextResponse(
    JSON.stringify({ error: '접근이 거부되었습니다.', ip: clientIp }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 환경변수 설정

```bash
# .env.local
REPLICATE_API_TOKEN=r8_your_token_here
ALLOWED_IPS=203.0.113.1,198.51.100.0/24,10.0.0.0/8
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

---

## 4. 모바일 LTE 접속 시 IP 화이트리스트의 근본적 한계

### CGNAT이 만드는 유동 IP 문제

모바일 통신사는 IPv4 주소 고갈에 대응하기 위해 **Carrier-Grade NAT(CGNAT)**을 보편적으로 사용한다. 이 이중 NAT 구조에서는 하나의 공인 IP를 **수백에서 수천 명의 가입자가 동시에 공유**한다. 모바일 기기의 IP 주소는 비행기 모드 토글만으로도 변경되며, 같은 세션 중에도 CGNAT 게이트웨이 간 로드 밸런싱으로 인해 IP가 바뀔 수 있다.

한국 주요 통신사의 모바일 IP 대역은 다음과 같다:

- **SK텔레콤**: `223.32.0.0/11` (223.32.0.0~223.63.255.255) — 약 **209만 개** IP 주소
- **KT**: `175.223.x.x`, `39.7.x.x` 등 — 유·무선 IP가 동일 풀에서 할당
- **LG U+**: 유·무선 통합 관리, 명확한 분리가 어려움

SKT의 주요 LTE/5G 대역만 해도 `/11` 범위로 209만 개 IP를 포함하는데, 이를 화이트리스트에 넣으면 **해당 통신사의 모든 모바일 사용자에게 접근을 허용**하는 것과 같다. 특정 사용자만을 위한 접근 제어 수단으로는 완전히 부적합하다.

### 웹 브라우저에서 MAC 주소 접근이 불가능한 이유

MAC 주소는 OSI 2계층(데이터 링크 계층)에서 동작하지만, 웹 브라우저는 7계층(응용 계층)에서 동작한다. **MAC 주소는 첫 번째 라우터 홉에서 제거되어 로컬 네트워크 세그먼트를 벗어나지 않으므로**, 웹 서버는 클라이언트의 MAC 주소를 절대 알 수 없다. 과거에는 Java 애플릿, Flash, ActiveX로 접근이 가능했지만, 이들은 모두 현대 브라우저에서 제거되었다. WebRTC는 로컬 IP를 노출할 수 있지만 MAC 주소는 접근 불가능하다. iOS 14+와 Android 10+는 WiFi 연결 시 **MAC 주소 랜덤화**를 기본 적용한다.

### 모바일 사용자를 위한 현실적 대안들

**1. 비밀번호/토큰 기반 인증 (가장 간단)**

간단한 비밀번호 인증 미들웨어로 모바일 사용자도 IP에 관계없이 접근할 수 있다:

```typescript
// app/api/auth/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password === process.env.ACCESS_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30일
    });
    return response;
  }

  return NextResponse.json({ error: '잘못된 비밀번호' }, { status: 401 });
}
```

```typescript
// middleware.ts (비밀번호 인증 + IP 체크 병합)
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/api/auth') {
    return NextResponse.next();
  }

  // 1차: IP 화이트리스트 체크
  const clientIp = getClientIp(request);
  if (isIpAllowed(clientIp, ALLOWED_IPS)) {
    return NextResponse.next();
  }

  // 2차: 인증 쿠키 체크 (IP가 허용 목록에 없는 경우)
  const authToken = request.cookies.get('auth_token')?.value;
  if (authToken === process.env.ACCESS_PASSWORD) {
    return NextResponse.next();
  }

  // 두 조건 모두 미충족 → 로그인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/login', request.url));
}
```

**2. OAuth (Google/GitHub) 연동**

NextAuth.js(Auth.js)를 사용하면 특정 이메일만 허용하는 OAuth 인증을 간단히 구현할 수 있다:

```typescript
// auth.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const { handlers, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      const allowedEmails = ['your-email@gmail.com'];
      return allowedEmails.includes(auth?.user?.email || '');
    },
  },
});
```

**3. VPN을 통한 고정 IP 확보**

모바일에서도 IP 화이트리스트를 사용하려면 VPN으로 고정 IP를 확보하는 방법이 있다. **Tailscale**은 CGNAT 환경에서도 자동으로 작동하며, 무료 티어(100대 기기/3명 사용자)로 충분하다. 자체 VPS(월 $5 DigitalOcean)에 WireGuard를 설치하면 해당 VPS의 고정 IP를 화이트리스트에 등록하고 모든 트래픽을 VPS를 통해 라우팅할 수 있다.

---

## 5. 완전한 실무 구현 예제

### 프로젝트 구조 (Next.js 14+ App Router, TypeScript)

```
my-replicate-app/
├── middleware.ts              # IP 체크 + 인증 미들웨어
├── app/
│   ├── layout.tsx
│   ├── page.tsx               # 메인 UI (클라이언트 컴포넌트)
│   ├── login/
│   │   └── page.tsx           # 로그인 페이지
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts       # 인증 API
│   │   ├── predictions/
│   │   │   ├── route.ts       # 예측 생성
│   │   │   └── [id]/
│   │   │       └── route.ts   # 예측 상태 조회
│   │   └── health/
│   │       └── route.ts       # 헬스체크 (IP 체크 제외)
├── lib/
│   ├── replicate.ts           # Replicate 클라이언트 설정
│   └── rate-limit.ts          # Rate Limiter 설정
├── .env.local                 # 환경변수
├── next.config.ts
└── package.json
```

### Replicate 클라이언트 설정

```typescript
// lib/replicate.ts
import 'server-only';
import Replicate from 'replicate';

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Next.js App Router의 fetch 캐싱 비활성화
replicate.fetch = (url, options) => {
  return fetch(url, { ...options, cache: 'no-store' });
};
```

### Rate Limiter 설정

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// API별 Rate Limiter
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 분당 10회
  prefix: 'ratelimit:api',
  analytics: true,
});

// 이미지 생성 전용 (더 엄격한 제한)
export const generateRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '1440 m'), // 24시간에 5회
  prefix: 'ratelimit:generate',
});
```

### next.config.ts

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pbxt.replicate.delivery',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
```

### 배포 설정

**Vercel 배포:**
```bash
# Vercel CLI로 환경변수 설정
vercel env add REPLICATE_API_TOKEN production
vercel env add ALLOWED_IPS production
vercel env add ACCESS_PASSWORD production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production

# 배포
vercel --prod
```

**Cloudflare Pages(Workers) 배포:**
```bash
# Wrangler로 시크릿 설정
wrangler secret put REPLICATE_API_TOKEN
wrangler secret put ACCESS_PASSWORD

# 배포
npx @opennextjs/cloudflare && wrangler deploy
```

---

## 6. 보안 베스트 프랙티스 체크리스트

### API 키 노출 방지의 3가지 원칙

**첫째, Data Access Layer 패턴을 사용한다.** 모든 시크릿 사용 코드를 `import 'server-only'`를 포함하는 별도 모듈에 집중시키면, 클라이언트 컴포넌트에서 실수로 임포트할 경우 빌드 에러가 발생한다. **둘째, `NEXT_PUBLIC_` 접두사를 시크릿에 절대 사용하지 않는다.** 이 접두사가 붙은 변수는 클라이언트 번들에 인라인된다. **셋째, 서버 환경변수를 클라이언트 컴포넌트의 props로 전달하지 않는다.** 설정 객체 전체를 넘기면 시크릿이 직렬화되어 클라이언트로 전송될 수 있다.

### CORS 설정

API Route에서 CORS를 설정하는 가장 안전한 방법은 허용 오리진을 명시적으로 지정하는 것이다:

```typescript
// app/api/predictions/route.ts
const ALLOWED_ORIGINS = ['https://my-app.vercel.app', 'https://my-domain.com'];

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  // ... 비즈니스 로직 ...
  return NextResponse.json(data, { headers: corsHeaders(origin) });
}
```

### 로깅 및 모니터링

Vercel은 Runtime Logs(함수 실행 로그)를 대시보드에서 실시간 확인할 수 있으며, Pro 플랜은 1일 보존, Enterprise는 최대 90일을 지원한다. Log Drains를 통해 Sentry, Datadog, Axiom 등 외부 서비스로 로그를 전달할 수 있다. Cloudflare Workers는 `wrangler tail` 명령으로 실시간 로그를 확인하고, OpenTelemetry Export로 Honeycomb, Grafana Cloud 등에 트레이스를 전송할 수 있다.

차단된 IP 접근 시도를 추적하려면 미들웨어에서 `console.log`로 기록하고, 구조화된 JSON 형태로 출력하는 것이 좋다:

```typescript
console.log(JSON.stringify({
  event: 'ip_blocked',
  ip: clientIp,
  path: pathname,
  timestamp: new Date().toISOString(),
  userAgent: req.headers.get('user-agent'),
}));
```

---

## 7. Cloudflare Pages vs Vercel: IP 제한 기능 최종 비교

| 기능 | Cloudflare Pages | Vercel |
|------|-----------------|--------|
| **월 비용 (기본)** | 무료 | 무료 |
| **대역폭** | **무제한** | 100GB |
| **엣지 로케이션** | **300+개** | 100+개 |
| **WAF Custom Rules (무료)** | ✅ 5개 | 제한적 |
| **IP Access Rules (무료)** | ✅ 50,000개/계정 | ❌ |
| **플랫폼 수준 IP 차단** | ✅ 무료부터 가능 | Enterprise 전용 (~$3,500+/월) |
| **CIDR 범위 차단 (플랫폼)** | ✅ /16, /24 무료 | Enterprise 전용 |
| **Edge Middleware IP 필터링** | ✅ | ✅ |
| **Next.js 호환성** | ⚠️ OpenNext 어댑터 필요 | ✅ 네이티브 (최고 수준) |
| **ISR 지원** | ✅ (OpenNext 경유) | ✅ 네이티브 |
| **Image Optimization** | ⚠️ 별도 설정 필요 | ✅ 내장 |
| **KV 스토어 (무료)** | ✅ 읽기 10만/일 | ✅ 3만 요청/월 |
| **Pro 플랜 가격** | $5/월 (Workers 유료) | $20/user/월 |

### 사용 케이스별 추천

**Cloudflare Pages를 선택해야 하는 경우:** IP 기반 접근 제어가 핵심 요구사항이고, 무료 또는 저비용으로 플랫폼 수준의 WAF 보호가 필요한 경우. 무제한 대역폭과 300+ 엣지 로케이션이 필요한 글로벌 서비스에도 적합하다. 다만 Next.js 완전 호환을 위해 OpenNext 어댑터 설정에 추가 작업이 필요하다.

**Vercel을 선택해야 하는 경우:** Next.js의 모든 기능(ISR, Image Optimization, PPR)을 네이티브로 사용하고 싶고, IP 제한은 Edge Middleware 코드로 충분한 경우. 개발 경험(DX)이 최우선이고, Replicate 등 AI API 연동이 주 목적이라면 Vercel의 네이티브 Next.js 지원이 생산성을 크게 높인다.

**하이브리드 추천:** Cloudflare를 CDN/WAF/DNS로 사용하고 Vercel에 Next.js를 배포하는 조합도 가능하다. Cloudflare의 WAF가 IP 필터링을 담당하고, Vercel이 애플리케이션 호스팅을 담당하면 양쪽의 장점을 모두 취할 수 있다.

## 결론: 다층 방어와 인증 병행이 핵심

IP 기반 접근 제어만으로는 모바일 LTE 사용자를 커버할 수 없다. **가장 실용적인 아키텍처는 IP 화이트리스트(고정 IP 환경)와 비밀번호/OAuth 인증(유동 IP 환경)을 병합하는 다층 접근 방식**이다. Cloudflare의 무료 WAF는 인프라 수준 보호에 탁월하고, Next.js Edge Middleware는 애플리케이션 수준의 세밀한 제어를 가능하게 한다. Replicate API는 반드시 서버 측에서만 호출하고, Upstash Redis 기반 Rate Limiting으로 남용을 방지해야 한다. 위에 제시된 코드 예제들은 이 모든 요소를 하나의 Next.js 프로젝트에서 구현하는 완전한 레퍼런스로 활용할 수 있다.