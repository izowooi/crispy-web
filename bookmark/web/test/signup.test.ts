import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { ORIGIN } from "./helpers";

const devLogin = (email: string) =>
  SELF.fetch(`${ORIGIN}/auth/dev-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

describe("signup policy (first-user mode)", () => {
  it("accepts the first user, rejects a second distinct email, and lets the first user sign in again", async () => {
    expect((await devLogin("first@example.com")).status).toBe(200);

    const second = await devLogin("second@example.com");
    expect(second.status).toBe(403);
    expect(second.headers.get("set-cookie")).toBeNull();

    expect((await devLogin("first@example.com")).status).toBe(200);
  });
});
