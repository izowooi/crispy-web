---
name: replicate-proxy
description: Replicate API를 안전한 얇은 프록시로 사용하는 패턴 (gpt-image-2 모델 호출, 토큰 보호, 서버측 입력 검증, edge 호환 호출). snapmany의 /api/generate route handler, src/lib/replicate.ts, 스타일 프리셋 prompt 조립을 만질 때 반드시 트리거한다. "Replicate", "gpt-image-2", "/api/generate", "스타일 변환", "이미지 생성" 키워드가 보이면 이 스킬을 사용한다.
---

# Replicate Proxy (gpt-image-2)

Replicate를 호출하는 단 하나의 합법적 위치는 서버(edge route handler)다. 클라이언트에서 직접 부르지 않는다. 이유: 토큰이 노출되면 즉시 abuse 대상이 되고, Replicate 비용은 청구 가능하다.

## 토큰 보호 (양보 불가)

1. **읽는 곳**: `process.env.REPLICATE_API_TOKEN` 하나뿐.
2. **금지된 키 이름**: `NEXT_PUBLIC_REPLICATE_*`, `REPLICATE_TOKEN`(public이 아닌데도 노출 사고 사례 많음). 후자도 사용은 가능하나 일관성을 위해 `REPLICATE_API_TOKEN`만 사용.
3. **금지된 호출 위치**: `src/components/**`, `src/app/**/page.tsx`, `src/app/layout.tsx`. 즉 `'use client'` 코드 어디에서도 `import Replicate` 또는 `process.env.REPLICATE_*` 참조 금지.
4. **로깅 금지**: 디버깅 중에도 토큰을 `console.log`하지 않는다. 실수로 Cloudflare 로그에 남으면 회수 어렵다.

QA가 이를 검증할 때 grep:
```bash
grep -rn "NEXT_PUBLIC_REPLICATE" src/ && echo "FAIL"
grep -rn "from 'replicate'" src/components src/app/page.tsx src/app/layout.tsx 2>/dev/null && echo "FAIL"
```

## 서버측 입력 검증 (클라이언트 검증과 무관하게 다시)

`/api/generate`가 받는 body:
```ts
type GenerateRequest = {
  image: string;    // data:image/(jpeg|png|webp);base64,...
  styleId: string;
};
```

검증 순서:
1. JSON 파싱 성공? (실패 → 400)
2. `image`가 문자열이고 `data:image/(jpeg|png|webp);base64,`로 시작? (실패 → 400)
3. base64 디코딩 후 바이트 길이 ≤ `maxUploadSizeMb * 1024 * 1024`? (실패 → 413)
4. `styleId`가 `src/config/styles.ts`의 ID 집합에 포함? (실패 → 400)

edge runtime에서 base64 길이 빠르게 추정:
```ts
// data URL의 콤마 뒤만 base64
const base64Part = image.split(',')[1] ?? '';
const padding = (base64Part.match(/=*$/)?.[0].length) ?? 0;
const byteLength = Math.floor((base64Part.length * 3) / 4) - padding;
```

## gpt-image-2 호출

기본 모델: `openai/gpt-image-2`. 호출 인터페이스 (Replicate SDK):

```ts
import Replicate from 'replicate';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

const output = await replicate.run('openai/gpt-image-2', {
  input: {
    prompt: stylePreset.prompt,
    input_images: [imageDataUrl],   // base64 dataURL 또는 https URL
    aspect_ratio: '1:1',            // 또는 스타일별 비율
    number_of_images: 1,
    output_format: 'webp',
    output_compression: 90,
    quality: 'auto',
    moderation: 'auto',
  },
});

// output 타입: string[] (URI 배열). 첫 번째 원소를 반환.
const imageUrl = Array.isArray(output) ? output[0] : output;
```

주의:
- `replicate.run()`은 prediction 완료까지 기다린다. 모델/입력에 따라 30~90초 가능 → edge 함수 타임아웃을 고려.
- Cloudflare Pages Functions의 CPU 시간 한도는 무료 플랜 10ms, 유료 50ms이지만 **외부 fetch wait는 시간 한도에 포함되지 않는다**. 따라서 polling은 문제 없음.
- 타임아웃을 명시적으로 걸고 싶다면 `AbortController` + `Promise.race`로 60초 한도.

## 스타일별 prompt 조립

`src/config/styles.ts`의 `StylePreset.prompt`를 그대로 쓰지 말고, 입력 이미지 컨텍스트가 들어간 템플릿으로 조립:

```ts
function buildPrompt(preset: StylePreset): string {
  // gpt-image-2는 input_images가 있으면 그 이미지를 직접 수정한다.
  // 따라서 prompt는 "이 사람의 사진을 ~ 스타일로 변환해줘" 같은 명시형.
  return `${preset.prompt}\n\nMaintain the subject's identity and key facial features.`;
}
```

스타일별 prompt 예시 (참고용, 실제는 config에서 관리):
- 캐리커처: "Convert this photo into an exaggerated caricature illustration with bold lines and playful proportions."
- 증명사진: "Convert into a clean, formal ID photo with neutral background, frontal pose, and natural lighting."
- 흑백 스튜디오: "Convert into a high-contrast black and white studio portrait with professional lighting and a plain dark background."

## 에러 핸들링 (Replicate 측)

| Replicate 응답 | 처리 |
|--------------|------|
| 401 (token invalid) | 500 반환 + 로그 (사용자에게 키 노출 금지). architect에게 escalate |
| 422 (input rejected, e.g. content moderation) | 422 반환 + Replicate 메시지 그대로 전달 |
| 5xx | 1회 재시도. 재실패 시 502 반환 + "Generation failed, please try again." |
| timeout (60s 초과) | AbortError → 504 반환 |

## 응답 형식 (frontend와 합의)

```ts
type GenerateResponse =
  | { ok: true; styleId: string; imageUrl: string }
  | { ok: false; styleId: string; error: string };
```

`styleId`를 응답에 포함하는 이유: 클라이언트가 N개 요청을 병렬로 보낼 때 어느 요청의 응답인지 매핑하기 위해. `Promise.allSettled` 패턴에서 fetch 직후가 아니라 응답 본문을 기다린 시점에 매핑되도록.

## 비용 관리 (MVP에서 단순)

- per-image 비용은 gpt-image-2 기준 USD ~0.05 수준 (2026년 초 기준, 변동 가능)
- 10개 스타일을 동시에 한 사용자가 누르면 약 $0.50
- MVP에는 결제·계정 없으므로 rate limit이 유일한 abuse 방어 — backend에서 IP당 분당 5회 정도 메모리 LRU로 구현 권장 (선택)

## 확장 포인트 (지금 만들지 않는다)

- 스타일별 모델 오버라이드 (`StylePreset.model`)
- 사용자 계정 + 결제 + 사용량 추적
- 결과 영구 저장 (PRD가 명시적으로 금지하므로 절대 추가 X)
