---
name: firebase-remote-config
description: Firebase Remote Config을 사용해 enabled_styles, ui_copy, max_upload_size_mb 등의 동적 설정을 관리하는 패턴. fetch 실패 시 local default fallback이 필수. snapmany의 src/lib/remoteConfig.ts, 스타일 토글, UI 문구 변경, 업로드 한도 변경을 만질 때 반드시 트리거한다. "Firebase", "Remote Config", "enabled_styles", "maintenance_mode", "RC", "원격 설정" 키워드가 보이면 이 스킬을 사용한다.
---

# Firebase Remote Config

snapmany에서 Remote Config는 "서버 상태"가 아니라 **운영자가 배포 없이 즉시 토글하는 설정값**이다. PRD가 명시한 키는 다음 8개:

| 키 | 타입 | 용도 | 기본값 (제안) |
|----|------|------|------------|
| `enabled_styles` | string[] (JSON) | 활성 스타일 ID 목록 | 전체 10개 |
| `default_style_count` | number | 첫 진입 시 자동 선택할 스타일 수 | 3 |
| `max_upload_size_mb` | number | 업로드 한도 | 10 |
| `maintenance_mode` | boolean | true면 메인페이지에 점검중 배너 + 생성 차단 | false |
| `replicate_model_by_style` | string (JSON) | 스타일별 모델 오버라이드 | `{}` |
| `show_beta_styles` | boolean | 베타 스타일 노출 | false |
| `ui_copy` | string (JSON) | 메인 헤더/버튼 등 문구 | local defaults |
| `style_order` | string[] (JSON) | 표시 순서 | local defaults |

## Fallback이 무엇보다 중요하다

PRD: "Remote Config fetch 실패 시 기본 local config로 동작해야 한다."

즉, RC fetch가 다음과 같이 실패해도 앱은 동작해야 한다:
- Firebase 프로젝트가 일시 다운
- 네트워크 차단
- API 키 만료
- 사용자의 ad blocker가 Firebase 도메인 차단

따라서 **local default가 진실, RC는 오버레이**다. 코드 구조:

```ts
// src/lib/remoteConfig.ts
import { initializeApp, getApps } from 'firebase/app';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

export type AppConfig = {
  enabled_styles: string[];
  default_style_count: number;
  max_upload_size_mb: number;
  maintenance_mode: boolean;
  replicate_model_by_style: Record<string, string>;
  show_beta_styles: boolean;
  ui_copy: Record<string, string>;
  style_order: string[];
};

export const DEFAULT_CONFIG: AppConfig = {
  enabled_styles: ['caricature', '3d_character', 'animation', 'id_photo', 'passport',
                   'driver_license', 'business_profile', 'sns_profile', 'sticker', 'bw_studio'],
  default_style_count: 3,
  max_upload_size_mb: 10,
  maintenance_mode: false,
  replicate_model_by_style: {},
  show_beta_styles: false,
  ui_copy: {
    title: 'SnapMany',
    subtitle: '한 장의 사진으로 여러 스타일을',
    generateButton: '생성하기',
  },
  style_order: ['caricature', '3d_character', 'animation', 'sns_profile', 'sticker',
                'business_profile', 'id_photo', 'passport', 'driver_license', 'bw_studio'],
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached: AppConfig | null = null;

export async function loadConfig(): Promise<AppConfig> {
  if (cached) return cached;
  if (typeof window === 'undefined') return DEFAULT_CONFIG; // SSR fallback

  try {
    if (!getApps().length) initializeApp(firebaseConfig);
    const rc = getRemoteConfig();
    rc.defaultConfig = DEFAULT_CONFIG as unknown as Record<string, string | number | boolean>;
    rc.settings.minimumFetchIntervalMillis = 60_000; // dev 편의, prod는 더 길게
    await fetchAndActivate(rc);

    cached = {
      enabled_styles: parseJsonArray(getValue(rc, 'enabled_styles').asString(), DEFAULT_CONFIG.enabled_styles),
      default_style_count: getValue(rc, 'default_style_count').asNumber() || DEFAULT_CONFIG.default_style_count,
      max_upload_size_mb: getValue(rc, 'max_upload_size_mb').asNumber() || DEFAULT_CONFIG.max_upload_size_mb,
      maintenance_mode: getValue(rc, 'maintenance_mode').asBoolean(),
      replicate_model_by_style: parseJsonObject(getValue(rc, 'replicate_model_by_style').asString(), DEFAULT_CONFIG.replicate_model_by_style),
      show_beta_styles: getValue(rc, 'show_beta_styles').asBoolean(),
      ui_copy: parseJsonObject(getValue(rc, 'ui_copy').asString(), DEFAULT_CONFIG.ui_copy),
      style_order: parseJsonArray(getValue(rc, 'style_order').asString(), DEFAULT_CONFIG.style_order),
    };
    return cached;
  } catch (err) {
    console.warn('[remoteConfig] fetch failed, using defaults', err);
    return DEFAULT_CONFIG;
  }
}

function parseJsonArray(raw: string, fallback: string[]): string[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : fallback; } catch { return fallback; }
}
function parseJsonObject<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw); } catch { return fallback; }
}
```

## 사용 위치

- **클라이언트(컴포넌트)**: `useEffect`에서 `loadConfig()` 호출, 결과를 상태로. 첫 렌더는 `DEFAULT_CONFIG`로.
- **서버(route handler)**: edge runtime에서는 Firebase SDK 초기화가 무겁다. `max_upload_size_mb` 등 서버에서도 필요한 값은 **별도 환경변수**로 노출하거나 (예: `MAX_UPLOAD_SIZE_MB`), Cloudflare KV에 캐시하는 패턴. MVP에서는 단순히 env로 처리해도 OK.

## 사용 예시

```tsx
// src/app/page.tsx (client component)
'use client';
import { useEffect, useState } from 'react';
import { loadConfig, DEFAULT_CONFIG, type AppConfig } from '@/lib/remoteConfig';

export default function Home() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  useEffect(() => { loadConfig().then(setConfig); }, []);

  if (config.maintenance_mode) return <MaintenanceBanner />;
  // ...
}
```

## 안티패턴

- RC 값을 동기적으로 기대 (`getValue` 직후 바로 사용 — fetchAndActivate 전이라 stale)
- DEFAULT 없이 RC 결과만 신뢰 (네트워크 실패 시 앱 죽음)
- RC를 인증/권한 체크에 사용 (RC는 클라이언트가 보고 조작 가능, 보안 도구 X)
- 서버에서 Firebase Admin SDK 사용 (edge runtime 비호환)

## QA 검증 항목

- `DEFAULT_CONFIG`가 8개 키 모두에 대해 안전한 값을 가진다
- fetch가 throw하도록 mock한 테스트가 DEFAULT를 반환한다
- `useEffect` 의존성 배열이 빈 배열이라 1회만 fetch (무한루프 X)
- `getValue` 키 문자열 ↔ `DEFAULT_CONFIG` 키 ↔ Firebase Console의 키 — 3곳이 동일
