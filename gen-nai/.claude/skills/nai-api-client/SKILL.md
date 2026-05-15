---
name: nai-api-client
description: NovelAI v4.5 이미지 생성 API 호출 노하우. 페이로드 빌더, Bearer 토큰 인증, ZIP→PNG 디코딩, 샘플러/스케줄러 ID 매핑, char_captions 합성, 에러 처리 규칙. NAI API 코드를 작성하거나 디버깅할 때 반드시 이 스킬을 참고한다.
---

# nai-api-client

NovelAI 이미지 생성 API를 안전하고 정확하게 호출하기 위한 단일 출처. 1년전 Python 레퍼런스(`/Users/izowooi/git/NAIA2.0_origiin/core/api_service.py`)의 패턴을 TypeScript/Cloudflare Workers로 옮긴 결과를 기록한다.

## 엔드포인트 / 인증

```
POST https://image.novelai.net/ai/generate-image
Headers:
  Authorization: Bearer <NAI_TOKEN>  // pst- 로 시작
  Content-Type: application/json
Timeout: 180s
Response: ZIP (Content-Type: binary/octet-stream 가능) — 안에 PNG 파일들이 있음
```

토큰은 `pst-` 접두사. 절대 클라이언트로 보내지 말 것. Workers에서만 `env.NAI_TOKEN`으로 접근.

## v4.5 페이로드 (nai-diffusion-4-5-full)

```ts
type NaiV45Payload = {
  input: string;          // base prompt
  model: "nai-diffusion-4-5-full";
  action: "generate";     // img2img/infill은 별도
  parameters: {
    width: number;        // 832 등
    height: number;       // 1216 등
    n_samples: number;    // 1 (UI에서 N장은 N회 호출 또는 큐 N개)
    seed: number;         // 0이면 랜덤
    extra_noise_seed: number;
    sampler: "k_euler_ancestral" | "k_euler" | "k_dpmpp_2s_ancestral" | "k_dpmpp_2m_sde" | "k_dpmpp_2m" | "k_dpmpp_sde";
    steps: number;        // 28 권장
    scale: number;        // guidance, 5.0 기본
    negative_prompt: string;
    cfg_rescale: number;  // 0.4
    noise_schedule: "native" | "karras" | "exponential";
    params_version: 3;
    legacy: false;
    legacy_v3_extend: false;

    // V4 전용
    add_original_image: true;
    legacy_uc: false;
    autoSmea: true;
    prefer_brownian: true;
    ucPreset: 0;
    use_coords: false;

    v4_prompt: {
      caption: {
        base_caption: string;
        char_captions: Array<{ char_caption: string; centers: { x: number; y: number }[] }>;
      };
      use_coords: false;
      use_order: true;
    };
    v4_negative_prompt: {
      caption: {
        base_caption: string;
        char_captions: Array<{ char_caption: string; centers: { x: number; y: number }[] }>;
      };
      legacy_uc: false;
    };
  };
};
```

## UI ↔ API 샘플러 매핑

| UI 표시 (스크린샷) | API 값 |
|---|---|
| Euler Ancestral (recommended) | `k_euler_ancestral` |
| Euler | `k_euler` |
| DPM++ 2S Ancestral | `k_dpmpp_2s_ancestral` |
| DPM++ 2M SDE | `k_dpmpp_2m_sde` |
| DPM++ 2M | `k_dpmpp_2m` |
| DPM++ SDE | `k_dpmpp_sde` |

## 해상도 프리셋

- Normal Portrait: 832×1216
- Normal Landscape: 1216×832
- Normal Square: 1024×1024
- Large Portrait: 1024×1536
- Large Landscape: 1536×1024
- Large Square: 1472×1472 (확인 필요)

## char_captions 합성 규칙

여러 캐릭터를 한 이미지에 그릴 때:
- 각 캐릭터의 프롬프트(예: `hu_tao_(genshin_impact), 1girl`)를 `char_captions[].char_caption`에 추가
- 같은 인덱스의 부정 프롬프트를 `v4_negative_prompt.char_captions`에 매칭
- `centers: [{x:0.5, y:0.5}]` 기본값
- `use_coords: false`면 좌표 무시, `use_order: true`로 순서 활용

## 작가 가중치 / 프롬프트 문법

- `{tag}` — 약한 강조 (× 1.05)
- `{{tag}}` — 더 강한 강조 (× 1.1)
- `[tag]` — 약화 (÷ 1.05)
- `artist:이름` 또는 `by 이름` 둘 다 통용 (Danbooru는 `artist_name` 단일 태그)
- 작가 weight 조합 예: `{{by artist_a}}, {{{character_tag}}}`
- 캐릭터 토큰은 Danbooru 정식 태그 그대로 (`hu_tao_(genshin_impact)`)

## ZIP 응답 처리 (TypeScript / Workers)

```ts
import { unzipSync } from "fflate";

async function callNai(payload: NaiV45Payload, token: string) {
  const r = await fetch("https://image.novelai.net/ai/generate-image", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`NAI ${r.status}: ${await r.text()}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  const entries = unzipSync(buf);
  const images: Uint8Array[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.endsWith(".png")) images.push(bytes);
  }
  return images; // base64로 변환 후 DO storage 저장 또는 R2 업로드
}
```

## 에러 처리

| HTTP | 의미 | 대응 |
|------|------|------|
| 400 | 잘못된 페이로드 | 메시지를 그대로 jobId 상태에 저장, 큐 다음 진행 |
| 401 | 토큰 만료/무효 | 즉시 전체 큐 일시 중지 + 운영자 알림 (시크릿 갱신 필요) |
| 402 | 크레딧/Anlas 부족 | 사용자에게 표시, 다음 진행 |
| 429 | rate limit | alarm 인터벌 늘려서 재시도 |
| 500 | NAI 측 장애 | 1회 재시도 후 실패 처리 |

## 시크릿 위생

- 빌드 후 `dist/`, `.vercel/output/`, `.open-next/`에 `pst-` 문자열이 없는지 grep
- 로그 출력 시 token은 반드시 `pst-***` 마스킹
- 에러 메시지를 클라이언트로 보낼 때 토큰이 응답에 섞이지 않게 redact

## 1차 자료

- 페이로드 구조 원본: `/Users/izowooi/git/NAIA2.0_origiin/core/api_service.py:62-208`
- 큐 아키텍처: `gen-nai/docs/queueing.md`
