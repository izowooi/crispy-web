import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { callNai } from "@/lib/nai-client";
import type { GenerateInput } from "@/lib/types";

const baseInput: GenerateInput = {
  prompt: "1girl",
  negativePrompt: "lowres",
  width: 832,
  height: 1216,
  steps: 28,
  guidance: 5,
  sampler: "euler_ancestral",
};

describe("callNai", () => {
  it("정상 응답일 때 PNG 바이트 배열을 4장 반환한다 (n_samples=4)", async () => {
    const images = await callNai(baseInput, "pst-test-token");
    expect(Array.isArray(images)).toBe(true);
    expect(images.length).toBe(4);
    // 모든 PNG가 매직 헤더로 시작
    for (const img of images) {
      expect(img[0]).toBe(0x89);
      expect(img[1]).toBe(0x50);
      expect(img[2]).toBe(0x4e);
      expect(img[3]).toBe(0x47);
    }
  });

  it("Authorization 헤더에 Bearer 토큰을 보낸다", async () => {
    let seenAuth: string | null = null;
    server.use(
      http.post("https://image.novelai.net/ai/generate-image", ({ request }) => {
        seenAuth = request.headers.get("authorization");
        // 페이로드 통과시키지 않고 빈 ZIP 반환 — 헤더 확인 목적
        return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), {
          headers: { "Content-Type": "binary/octet-stream" },
        });
      }),
    );
    try {
      await callNai(baseInput, "pst-secret-XYZ");
    } catch {
      // 빈 ZIP이라 이미지 없음 — 헤더만 확인
    }
    expect(seenAuth).toBe("Bearer pst-secret-XYZ");
  });

  it("HTTP 4xx 응답이면 에러를 던지고 메시지에 상태 코드가 포함된다", async () => {
    server.use(
      http.post("https://image.novelai.net/ai/generate-image", () => {
        return new HttpResponse("bad payload", { status: 400 });
      }),
    );
    await expect(callNai(baseInput, "pst-test")).rejects.toThrow(/400/);
  });

  it("응답 ZIP 안에 PNG가 없으면 에러를 던진다", async () => {
    const emptyZip = new Uint8Array([
      0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    server.use(
      http.post("https://image.novelai.net/ai/generate-image", () => {
        return new HttpResponse(emptyZip, { headers: { "Content-Type": "binary/octet-stream" } });
      }),
    );
    await expect(callNai(baseInput, "pst-test")).rejects.toThrow(/no png/i);
  });
});
