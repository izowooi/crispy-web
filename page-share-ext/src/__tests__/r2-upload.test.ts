import { describe, it, expect, vi, beforeEach } from "vitest";
import { isR2Configured, uploadHtmlToR2 } from "../lib/r2-upload";
import type { R2Config } from "../lib/r2-upload";

const TEST_CONFIG: R2Config = {
  endpoint: "https://account123.r2.cloudflarestorage.com",
  bucket: "test-bucket",
  keyId: "test-key-id-0000000000000000",
  secret: "test-secret-key-000000000000000000000000000000",
  publicUrlBase: "https://pub-test.r2.dev",
};

const FIXED_UUID = "aaaabbbb-cccc-4ddd-eeee-ffffffffffff";

function makeMockFetch(ok = true, status = 200, body = ""): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => body,
  }) as unknown as typeof globalThis.fetch;
}

describe("isR2Configured", () => {
  it("returns true when all fields are present", () => {
    expect(isR2Configured(TEST_CONFIG)).toBe(true);
  });

  it("returns false when secret is empty", () => {
    expect(isR2Configured({ ...TEST_CONFIG, secret: "" })).toBe(false);
  });

  it("returns false when endpoint is missing", () => {
    const { endpoint: _, ...rest } = TEST_CONFIG;
    expect(isR2Configured(rest)).toBe(false);
  });

  it("returns false on empty object", () => {
    expect(isR2Configured({})).toBe(false);
  });
});

describe("uploadHtmlToR2", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      FIXED_UUID as ReturnType<typeof crypto.randomUUID>,
    );
  });

  it("returns publicUrl and fileSize on success", async () => {
    const result = await uploadHtmlToR2(TEST_CONFIG, "<html>hello</html>", makeMockFetch());
    expect(result.publicUrl).toBe(`https://pub-test.r2.dev/${FIXED_UUID}.html`);
    expect(result.fileKey).toBe(`${FIXED_UUID}.html`);
    expect(result.fileSize).toBeGreaterThan(0);
  });

  it("sends PUT to the correct R2 endpoint with bucket prefix", async () => {
    const mockFetch = makeMockFetch();
    await uploadHtmlToR2(TEST_CONFIG, "<html>test</html>", mockFetch);

    // sign() produces a Request object passed as the single argument to fetch
    const [signedReq] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [Request];
    expect(signedReq.url).toContain("account123.r2.cloudflarestorage.com");
    expect(signedReq.url).toContain("/test-bucket/");
    expect(signedReq.url).toContain(`${FIXED_UUID}.html`);
    expect(signedReq.method).toBe("PUT");
  });

  it("sets Content-Type header to text/html", async () => {
    const mockFetch = makeMockFetch();
    await uploadHtmlToR2(TEST_CONFIG, "<html>test</html>", mockFetch);

    const [signedReq] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [Request];
    expect(signedReq.headers.get("Content-Type")).toContain("text/html");
  });

  it("throws with status code on non-ok response", async () => {
    const errBody = "<Error><Code>SignatureDoesNotMatch</Code></Error>";
    await expect(
      uploadHtmlToR2(TEST_CONFIG, "<html>test</html>", makeMockFetch(false, 403, errBody)),
    ).rejects.toThrow("403");
  });

  it("trims trailing slash from endpoint and publicUrlBase", async () => {
    const config: R2Config = {
      ...TEST_CONFIG,
      endpoint: "https://account123.r2.cloudflarestorage.com/",
      publicUrlBase: "https://pub-test.r2.dev/",
    };
    const result = await uploadHtmlToR2(config, "<html>x</html>", makeMockFetch());
    expect(result.publicUrl).toBe(`https://pub-test.r2.dev/${FIXED_UUID}.html`);
  });
});
