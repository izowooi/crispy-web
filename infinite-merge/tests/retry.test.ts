import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/server/errors";
import { withTransientRetry } from "@/lib/server/retry";

function harness() {
  const waits: number[] = [];
  let now = 0;
  return {
    waits,
    opts: {
      delaysMs: [800, 2500],
      budgetMs: 15_000,
      jitter: () => 1,
      now: () => now,
      sleep: async (ms: number) => {
        waits.push(ms);
        now += ms;
      },
      advance: (ms: number) => (now += ms),
    },
  };
}

describe("withTransientRetry", () => {
  it("retries transient failures with growing delays, then succeeds", async () => {
    const { waits, opts } = harness();
    let calls = 0;
    const result = await withTransientRetry(async () => {
      calls++;
      if (calls < 3) throw new AppError("unavailable", { detail: "server_is_overloaded" });
      return "증기";
    }, opts);
    expect(result).toBe("증기");
    expect(calls).toBe(3);
    expect(waits).toEqual([800, 2500]);
  });

  it("gives up after the configured retries", async () => {
    const { opts } = harness();
    let calls = 0;
    await expect(
      withTransientRetry(async () => {
        calls++;
        throw new AppError("unavailable");
      }, opts),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(calls).toBe(3);
  });

  it.each(["usage_limit", "not_eligible", "session_expired", "unsupported", "plan_not_enabled"] as const)(
    "never retries %s",
    async (code) => {
      const { waits, opts } = harness();
      let calls = 0;
      await expect(
        withTransientRetry(async () => {
          calls++;
          throw new AppError(code);
        }, opts),
      ).rejects.toMatchObject({ code });
      expect(calls).toBe(1);
      expect(waits).toEqual([]);
    },
  );

  it("does not start a retry that would blow the time budget", async () => {
    const { waits, opts } = harness();
    let calls = 0;
    await expect(
      withTransientRetry(async () => {
        calls++;
        opts.advance(7_000); // each attempt is slow
        throw new AppError("unavailable");
      }, opts),
    ).rejects.toMatchObject({ code: "unavailable" });
    // 7s + 0.8s wait + 7s = 14.8s; a third attempt would end past 15s.
    expect(calls).toBe(2);
    expect(waits).toEqual([800]);
  });

  it("honors a server Retry-After hint over the default delay", async () => {
    const { waits, opts } = harness();
    let calls = 0;
    await withTransientRetry(async () => {
      calls++;
      if (calls === 1) throw new AppError("unavailable", { retryAfterMs: 2000 });
      return "ok";
    }, opts);
    expect(waits).toEqual([2000]);
  });
});
