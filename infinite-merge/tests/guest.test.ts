import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, setDbForTests } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { claudeErrorToAppError, extractAlchemyText } from "@/lib/server/guest/claude";
import { consumeGuestCall, guestRemaining, kstDay } from "@/lib/server/guest/quota";

const limits = { perGuest: 3, global: 5 };

describe("guest quota", () => {
  beforeEach(() => setDbForTests(openDatabase(":memory:")));
  afterEach(() => setDbForTests(undefined));

  it("counts model calls per guest per day", () => {
    const now = Date.UTC(2026, 9, 13, 3);
    expect(guestRemaining("guest:a", limits, now)).toBe(3);
    consumeGuestCall("guest:a", limits, now);
    consumeGuestCall("guest:a", limits, now);
    expect(guestRemaining("guest:a", limits, now)).toBe(1);
    expect(guestRemaining("guest:b", limits, now)).toBe(3);
  });

  it("stops a guest at the per-guest limit with guest_limit", () => {
    const now = Date.UTC(2026, 9, 13, 3);
    for (let i = 0; i < 3; i++) consumeGuestCall("guest:a", limits, now);
    expect(() => consumeGuestCall("guest:a", limits, now)).toThrowError(
      expect.objectContaining({ code: "guest_limit" }),
    );
  });

  it("stops everyone when the operator's global budget is spent, with guest_unavailable", () => {
    const now = Date.UTC(2026, 9, 13, 3);
    for (const g of ["guest:a", "guest:a", "guest:b", "guest:b", "guest:c"]) consumeGuestCall(g, limits, now);
    expect(() => consumeGuestCall("guest:d", limits, now)).toThrowError(
      expect.objectContaining({ code: "guest_unavailable" }),
    );
    // The guest who still has personal quota left is reported as having none.
    expect(guestRemaining("guest:d", limits, now)).toBe(0);
  });

  it("resets at midnight KST", () => {
    const before = Date.UTC(2026, 9, 13, 14, 59); // 23:59 KST
    const after = Date.UTC(2026, 9, 13, 15, 1); // 00:01 KST next day
    expect(kstDay(before)).toBe("2026-10-13");
    expect(kstDay(after)).toBe("2026-10-14");
    for (let i = 0; i < 3; i++) consumeGuestCall("guest:a", limits, before);
    expect(guestRemaining("guest:a", limits, after)).toBe(3);
  });
});

function message(content: unknown[], stop_reason = "end_turn"): Anthropic.Message {
  return { content, stop_reason } as unknown as Anthropic.Message;
}

describe("extractAlchemyText", () => {
  it("reads text blocks by type, skipping thinking blocks", () => {
    const text = extractAlchemyText(
      message([
        { type: "thinking", thinking: "", signature: "sig" },
        { type: "text", text: '{"name":"증기","emoji":"♨️","desc":"x"}' },
      ]),
    );
    expect(text).toContain("증기");
  });

  it("treats a refusal as bad output, not a crash", () => {
    expect(() => extractAlchemyText(message([], "refusal"))).toThrowError(
      expect.objectContaining({ code: "bad_output" }),
    );
  });

  it("treats a max_tokens cut as bad output", () => {
    expect(() => extractAlchemyText(message([{ type: "text", text: '{"name":"증' }], "max_tokens"))).toThrowError(
      expect.objectContaining({ code: "bad_output" }),
    );
  });
});

describe("claudeErrorToAppError", () => {
  const headers = new Headers();
  it.each([
    [new Anthropic.AuthenticationError(401, undefined, "bad key", headers), "guest_unavailable"],
    [new Anthropic.PermissionDeniedError(403, undefined, "nope", headers), "guest_unavailable"],
    // e.g. "credit balance is too low" arrives as a 400.
    [new Anthropic.BadRequestError(400, undefined, "credit", headers), "guest_unavailable"],
    [new Anthropic.RateLimitError(429, undefined, "slow down", headers), "unavailable"],
    [new Anthropic.InternalServerError(529, undefined, "overloaded", headers), "unavailable"],
    [new Anthropic.APIConnectionError({ message: "offline" }), "unavailable"],
  ])("%s → %s", (err, code) => {
    expect(claudeErrorToAppError(err).code).toBe(code);
  });

  it("passes AppErrors through", () => {
    const e = new AppError("bad_output");
    expect(claudeErrorToAppError(e)).toBe(e);
  });
});

describe("guestConfig key check", () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
  });

  it.each([
    ["sk-ant-api03-abc", true],
    ["=sk-ant-api03-abc", false], // ANTHROPIC_API_KEY==sk-ant-… in .env.local
    ["", false],
  ])("%j → enabled %s", async (key, enabled) => {
    process.env.ANTHROPIC_API_KEY = key;
    const { guestConfig } = await import("@/lib/server/config");
    expect(guestConfig().enabled).toBe(enabled);
  });
});
