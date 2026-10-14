import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb, setDbForTests } from "@/lib/server/db";
import { AppError } from "@/lib/server/errors";
import { claudeErrorToAppError, extractAlchemyText } from "@/lib/server/guest/claude";
import { consumeGuestCall, consumeGuestJoin, guestRemaining, kstDay } from "@/lib/server/guest/quota";
import { createTestD1 } from "./support/d1";

const limits = { perGuest: 3, global: 5, perIp: 4, joinsPerIp: 2 };
const NOW = Date.UTC(2026, 9, 13, 3);

async function usage(scope: string): Promise<number> {
  return (await getDb().prepare("SELECT count FROM im_guest_usage WHERE scope = ?").bind(scope).first<number>("count")) ?? 0;
}

describe("guest quota", () => {
  beforeEach(() => setDbForTests(createTestD1()));
  afterEach(() => setDbForTests(undefined));

  it("counts model calls per guest per day", async () => {
    expect(await guestRemaining("guest:a", limits, NOW)).toBe(3);
    await consumeGuestCall("guest:a", null, limits, NOW);
    expect(await consumeGuestCall("guest:a", null, limits, NOW)).toBe(1);
    expect(await guestRemaining("guest:a", limits, NOW)).toBe(1);
    expect(await guestRemaining("guest:b", limits, NOW)).toBe(3);
  });

  it("stops a guest at the per-guest limit with guest_limit, without charging the global pool", async () => {
    for (let i = 0; i < 3; i++) await consumeGuestCall("guest:a", null, limits, NOW);
    await expect(consumeGuestCall("guest:a", null, limits, NOW)).rejects.toMatchObject({ code: "guest_limit" });
    // The failed attempt handed its global unit back.
    expect(await usage("*")).toBe(3);
  });

  it("stops everyone when the operator's global budget is spent, with guest_unavailable", async () => {
    for (const g of ["guest:a", "guest:a", "guest:b", "guest:b", "guest:c"]) await consumeGuestCall(g, null, limits, NOW);
    await expect(consumeGuestCall("guest:d", null, limits, NOW)).rejects.toMatchObject({ code: "guest_unavailable" });
    // The guest who still has personal quota left is reported as having none.
    expect(await guestRemaining("guest:d", limits, NOW)).toBe(0);
    expect(await usage("guest:d")).toBe(0);
  });

  it("caps one IP across many guests (cookie clearing doesn't reset it)", async () => {
    const wide = { ...limits, global: 100 };
    for (const g of ["guest:a", "guest:a", "guest:b", "guest:c"]) await consumeGuestCall(g, "iphash", wide, NOW);
    await expect(consumeGuestCall("guest:d", "iphash", wide, NOW)).rejects.toMatchObject({ code: "guest_limit", detail: "ip daily limit" });
    expect(await usage("guest:d")).toBe(0);
    expect(await usage("*")).toBe(4);
    await expect(consumeGuestCall("guest:d", "otherhash", wide, NOW)).resolves.toBe(2);
  });

  it("treats a zero limit as closed", async () => {
    await expect(consumeGuestCall("guest:a", null, { ...limits, global: 0 }, NOW)).rejects.toMatchObject({ code: "guest_unavailable" });
    expect(await usage("guest:a")).toBe(0);
  });

  it("limits new guest sessions per IP per day", async () => {
    await consumeGuestJoin("iphash", limits, NOW);
    await consumeGuestJoin("iphash", limits, NOW);
    await expect(consumeGuestJoin("iphash", limits, NOW)).rejects.toMatchObject({ code: "guest_limit", detail: "join daily limit" });
    await expect(consumeGuestJoin("iphash", limits, NOW + 86_400_000)).resolves.toBeUndefined();
  });

  it("resets at midnight KST", async () => {
    const before = Date.UTC(2026, 9, 13, 14, 59); // 23:59 KST
    const after = Date.UTC(2026, 9, 13, 15, 1); // 00:01 KST next day
    expect(kstDay(before)).toBe("2026-10-13");
    expect(kstDay(after)).toBe("2026-10-14");
    for (let i = 0; i < 3; i++) await consumeGuestCall("guest:a", null, limits, before);
    expect(await guestRemaining("guest:a", limits, after)).toBe(3);
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
