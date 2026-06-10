import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isValidApiKey, extractApiKey } from "@/lib/apikey";

describe("isValidApiKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("API_KEY 미설정 시 모든 요청 허용 (dev 모드)", () => {
    delete process.env.API_KEY;
    expect(isValidApiKey(undefined)).toBe(true);
    expect(isValidApiKey("any-value")).toBe(true);
  });

  it("API_KEY 설정 시 키 없는 요청 거부", () => {
    process.env.API_KEY = "secret";
    expect(isValidApiKey(undefined)).toBe(false);
    expect(isValidApiKey("")).toBe(false);
  });

  it("API_KEY 설정 시 잘못된 키 거부", () => {
    process.env.API_KEY = "secret";
    expect(isValidApiKey("wrong")).toBe(false);
  });

  it("올바른 키 수락", () => {
    process.env.API_KEY = "secret";
    expect(isValidApiKey("secret")).toBe(true);
  });
});

describe("extractApiKey", () => {
  it("X-Api-Key 헤더에서 키 추출", () => {
    const req = new Request("http://localhost/api/archives", {
      method: "POST",
      headers: { "X-Api-Key": "my-key", "Content-Type": "application/json" },
    });
    expect(extractApiKey(req)).toBe("my-key");
  });

  it("헤더 없으면 undefined 반환", () => {
    const req = new Request("http://localhost/api/archives", { method: "POST" });
    expect(extractApiKey(req)).toBeUndefined();
  });
});
