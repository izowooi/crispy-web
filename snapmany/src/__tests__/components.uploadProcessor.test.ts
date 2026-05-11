import { describe, it, expect } from "vitest";
import { validateFile } from "@/components/uploadProcessor";

const DEFAULT_MAX = 10 * 1024 * 1024; // 10MB

function makeFile(opts: { type: string; size: number; name?: string }): File {
  // Use a tiny payload then override .size via a property descriptor so we don't
  // actually allocate megabytes of buffer in tests.
  const f = new File(["x"], opts.name ?? "img", { type: opts.type });
  Object.defineProperty(f, "size", { value: opts.size, configurable: true });
  return f;
}

describe("uploadProcessor.validateFile — MIME matrix", () => {
  it.each([
    ["image/jpeg"],
    ["image/png"],
    ["image/webp"],
  ])("accepts allowed mime %s", (type) => {
    const file = makeFile({ type, size: 1024 });
    const result = validateFile(file, DEFAULT_MAX);
    expect(result.ok).toBe(true);
  });

  it.each([
    ["image/gif"],
    ["image/bmp"],
    ["image/svg+xml"],
    ["image/heic"],
    ["application/pdf"],
    ["text/plain"],
    [""],
  ])("rejects disallowed mime %s with the canonical error message", (type) => {
    const file = makeFile({ type, size: 1024 });
    const result = validateFile(file, DEFAULT_MAX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(
        "지원하지 않는 파일 형식입니다. JPG/PNG/WEBP만 업로드 가능합니다.",
      );
    }
  });
});

describe("uploadProcessor.validateFile — size threshold", () => {
  it("accepts file exactly at maxSizeBytes", () => {
    const file = makeFile({ type: "image/jpeg", size: DEFAULT_MAX });
    const result = validateFile(file, DEFAULT_MAX);
    expect(result.ok).toBe(true);
  });

  it("rejects file 1 byte over maxSizeBytes with canonical message", () => {
    const file = makeFile({ type: "image/jpeg", size: DEFAULT_MAX + 1 });
    const result = validateFile(file, DEFAULT_MAX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(
        "파일이 너무 큽니다. 10MB 이하의 이미지를 사용해주세요.",
      );
    }
  });

  it("respects a custom maxSizeBytes (smaller)", () => {
    const small = 1024;
    const file = makeFile({ type: "image/png", size: small + 1 });
    const result = validateFile(file, small);
    expect(result.ok).toBe(false);
  });

  it("checks MIME before size — invalid mime AND too-large still reports mime error", () => {
    const file = makeFile({ type: "image/gif", size: DEFAULT_MAX + 999 });
    const result = validateFile(file, DEFAULT_MAX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("형식");
    }
  });
});
