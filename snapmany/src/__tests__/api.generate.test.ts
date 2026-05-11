import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Replicate wrapper만 모킹. SDK 자체는 건드리지 않는다.
const mockGenerateStyledImage = vi.fn();
vi.mock("@/lib/replicate", () => ({
  generateStyledImage: mockGenerateStyledImage,
}));

const SAMPLE_IMAGE_JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB";
const SAMPLE_IMAGE_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABAABc7BqEAAAAABJRU5ErkJggg==";
const SAMPLE_IMAGE_WEBP =
  "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v3AgAA=";

async function callPOST(body: unknown): Promise<Response> {
  const mod = await import("@/app/api/generate/route");
  const req = new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return mod.POST(req);
}

describe("POST /api/generate — route handler", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGenerateStyledImage.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("declares edge runtime", async () => {
    const mod = await import("@/app/api/generate/route");
    expect(mod.runtime).toBe("edge");
  });

  it("returns 200 + ok:true with imageUrl on happy path", async () => {
    mockGenerateStyledImage.mockResolvedValueOnce({
      imageUrl: "https://replicate.delivery/example/ok.webp",
    });

    const res = await callPOST({ image: SAMPLE_IMAGE_JPEG, styleId: "id_photo_basic" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; styleId: string; imageUrl: string };
    expect(json.ok).toBe(true);
    expect(json.styleId).toBe("id_photo_basic");
    expect(json.imageUrl).toBe("https://replicate.delivery/example/ok.webp");
    expect(mockGenerateStyledImage).toHaveBeenCalledTimes(1);
  });

  it("accepts PNG and WEBP mime prefixes", async () => {
    mockGenerateStyledImage.mockResolvedValue({
      imageUrl: "https://replicate.delivery/example/x.webp",
    });
    const r1 = await callPOST({ image: SAMPLE_IMAGE_PNG, styleId: "passport" });
    expect(r1.status).toBe(200);
    const r2 = await callPOST({ image: SAMPLE_IMAGE_WEBP, styleId: "passport" });
    expect(r2.status).toBe(200);
  });

  it("returns 400 when JSON body is malformed", async () => {
    const res = await callPOST("{not json");
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe("string");
    expect(mockGenerateStyledImage).not.toHaveBeenCalled();
  });

  it("returns 400 when image is missing or not a string", async () => {
    const res = await callPOST({ styleId: "id_photo_basic" });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(mockGenerateStyledImage).not.toHaveBeenCalled();
  });

  it("returns 400 when styleId is missing", async () => {
    const res = await callPOST({ image: SAMPLE_IMAGE_JPEG });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(mockGenerateStyledImage).not.toHaveBeenCalled();
  });

  it("returns 400 when image has an unsupported mime (e.g. gif)", async () => {
    const res = await callPOST({
      image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      styleId: "id_photo_basic",
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; styleId: string; error: string };
    expect(json.ok).toBe(false);
    expect(json.styleId).toBe("id_photo_basic");
    expect(mockGenerateStyledImage).not.toHaveBeenCalled();
  });

  it("returns 400 when image doesn't start with data:image/...;base64,", async () => {
    const res = await callPOST({ image: "https://evil.example/x.jpg", styleId: "id_photo_basic" });
    expect(res.status).toBe(400);
    expect(mockGenerateStyledImage).not.toHaveBeenCalled();
  });

  it("returns 400 when styleId is unknown", async () => {
    const res = await callPOST({ image: SAMPLE_IMAGE_JPEG, styleId: "no_such_style_xyz" });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { ok: boolean; styleId: string; error: string };
    expect(json.ok).toBe(false);
    expect(json.styleId).toBe("no_such_style_xyz");
    expect(mockGenerateStyledImage).not.toHaveBeenCalled();
  });

  it("returns 413 when base64 payload exceeds the 10MB limit", async () => {
    // 10MB의 base64는 약 13.3MB의 문자열. 약간 더 큰 dummy 생성.
    const bytes = 11 * 1024 * 1024; // 11MB → 한도 초과
    const base64Length = Math.ceil((bytes * 4) / 3);
    const big = "A".repeat(base64Length);
    const dataUrl = "data:image/jpeg;base64," + big;
    const res = await callPOST({ image: dataUrl, styleId: "id_photo_basic" });
    expect(res.status).toBe(413);
    const json = (await res.json()) as { ok: boolean; styleId: string; error: string };
    expect(json.ok).toBe(false);
    expect(mockGenerateStyledImage).not.toHaveBeenCalled();
  });

  it("returns 502 when the wrapper throws a generic error", async () => {
    mockGenerateStyledImage.mockRejectedValueOnce(new Error("Replicate returned 503"));
    // 재시도 정책: 두 번째도 동일 실패 → 502
    mockGenerateStyledImage.mockRejectedValueOnce(new Error("Replicate returned 503"));

    const res = await callPOST({ image: SAMPLE_IMAGE_JPEG, styleId: "id_photo_basic" });
    expect(res.status).toBe(502);
    const json = (await res.json()) as { ok: boolean; styleId: string; error: string };
    expect(json.ok).toBe(false);
    expect(json.styleId).toBe("id_photo_basic");
    expect(typeof json.error).toBe("string");
    // 사용자 노출 메시지에 키 이름이 들어가서는 안 됨
    expect(json.error).not.toMatch(/REPLICATE_API_TOKEN/);
    expect(json.error).not.toMatch(/r8_/);
  });

  it("returns 504 when the wrapper throws a timeout error", async () => {
    mockGenerateStyledImage.mockRejectedValueOnce(
      new Error("Replicate request timed out after 60000ms")
    );

    const res = await callPOST({ image: SAMPLE_IMAGE_JPEG, styleId: "id_photo_basic" });
    expect(res.status).toBe(504);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/시간|초과|timeout/i);
    // 타임아웃은 재시도하지 않음 — wrapper가 1회만 호출되어야 한다
    expect(mockGenerateStyledImage).toHaveBeenCalledTimes(1);
  });

  it("returns 500 with masked message when wrapper throws config error", async () => {
    mockGenerateStyledImage.mockRejectedValueOnce(
      new Error("REPLICATE_API_TOKEN is not configured. Server cannot reach Replicate.")
    );

    const res = await callPOST({ image: SAMPLE_IMAGE_JPEG, styleId: "id_photo_basic" });
    expect(res.status).toBe(500);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    // 토큰 키 이름 노출 금지
    expect(json.error).not.toMatch(/REPLICATE_API_TOKEN/);
    expect(json.error).not.toMatch(/configured/i);
    // 재시도하지 않음
    expect(mockGenerateStyledImage).toHaveBeenCalledTimes(1);
  });

  it("retries once when first wrapper call fails and second succeeds → 200", async () => {
    mockGenerateStyledImage
      .mockRejectedValueOnce(new Error("transient 503"))
      .mockResolvedValueOnce({ imageUrl: "https://replicate.delivery/example/retry.webp" });

    const res = await callPOST({ image: SAMPLE_IMAGE_JPEG, styleId: "id_photo_basic" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; styleId: string; imageUrl: string };
    expect(json.ok).toBe(true);
    expect(json.imageUrl).toBe("https://replicate.delivery/example/retry.webp");
    expect(mockGenerateStyledImage).toHaveBeenCalledTimes(2);
  });

  it("rejects GET method with 405", async () => {
    const mod = await import("@/app/api/generate/route");
    // GET이 정의되어 있을 수도, 없을 수도 있다. 정의된 경우 405여야 한다.
    if (typeof (mod as Record<string, unknown>).GET === "function") {
      const req = new Request("http://localhost/api/generate", { method: "GET" });
      const res = await (mod as { GET: (r: Request) => Promise<Response> }).GET(req);
      expect(res.status).toBe(405);
    } else {
      // GET 핸들러 미정의는 Next.js가 자동으로 405 처리 → 본 테스트는 스킵
      expect(true).toBe(true);
    }
  });
});
