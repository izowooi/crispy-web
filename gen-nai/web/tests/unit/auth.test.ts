import { describe, expect, it } from "vitest";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  authCookieHeader,
  requestHasAuth,
} from "@/lib/auth";

describe("auth helpers", () => {
  it("sets the gennai auth cookie as HttpOnly", () => {
    const cookie = authCookieHeader();
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=${AUTH_COOKIE_VALUE}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("detects the auth cookie on requests", () => {
    const req = new Request("https://app.test/api/generate", {
      headers: { cookie: `other=0; ${AUTH_COOKIE_NAME}=${AUTH_COOKIE_VALUE}` },
    });
    expect(requestHasAuth(req)).toBe(true);
  });

  it("rejects missing auth cookie", () => {
    const req = new Request("https://app.test/api/generate");
    expect(requestHasAuth(req)).toBe(false);
  });
});
