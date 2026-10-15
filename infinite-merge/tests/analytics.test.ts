import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsEnvironment, resetAnalyticsForTests, setPlayerContext, syncAnalytics, track, type AnalyticsClient } from "@/lib/analytics";

function fake() {
  const calls: unknown[][] = [];
  const client: AnalyticsClient = {
    init: (...a) => calls.push(["init", ...a]),
    register: (...a) => calls.push(["register", ...a]),
    capture: (...a) => calls.push(["capture", ...a]),
    identify: (...a) => calls.push(["identify", ...a]),
    reset: () => calls.push(["reset"]),
  };
  return { calls, load: vi.fn(async () => client) };
}

const info = (distinctId: string | null) => ({ key: "phc_test", host: "https://us.i.posthog.com", distinctId });

describe("analytics", () => {
  afterEach(() => resetAnalyticsForTests());

  it("labels only the hosted site as production", () => {
    expect(analyticsEnvironment("merge.zowoo.uk")).toBe("production");
    expect(analyticsEnvironment("127.0.0.1")).toBe("development");
    expect(analyticsEnvironment("localhost")).toBe("development");
  });

  it("never loads the SDK without a key, and drops events instead of queueing them", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = fake();
    track("landing_viewed");
    await syncAnalytics(null, "merge.zowoo.uk", f.load);
    track("game_started");
    expect(f.load).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled(); // production stays quiet
    await syncAnalytics(null, "127.0.0.1", f.load);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("INFINITE_MERGE_POSTHOG_KEY"));
    warn.mockRestore();
  });

  it("starts once, tags the environment, and sends events queued before the SDK loaded", async () => {
    const f = fake();
    track("landing_viewed", { world_count: 3 });
    await syncAnalytics(info(null), "127.0.0.1", f.load);
    await syncAnalytics(info(null), "127.0.0.1", f.load);
    expect(f.load).toHaveBeenCalledTimes(1);
    expect(f.calls[0][0]).toBe("init");
    expect(f.calls[0][2]).toMatchObject({ api_host: "https://us.i.posthog.com", autocapture: false, disable_session_recording: true });
    expect(f.calls).toContainEqual(["register", { app: "infinite-merge", environment: "development" }]);
    expect(f.calls).toContainEqual(["capture", "landing_viewed", { world_count: 3 }]);
    expect(f.calls.some((c) => c[0] === "identify" || c[0] === "reset")).toBe(false);
  });

  it("identifies a signed-in player before their first event and resets only when leaving", async () => {
    const f = fake();
    await syncAnalytics(info(null), "merge.zowoo.uk", f.load);
    await syncAnalytics(info("abc"), "merge.zowoo.uk", f.load);
    track("game_started");
    setPlayerContext("claude");
    await syncAnalytics(info("abc"), "merge.zowoo.uk", f.load);
    await syncAnalytics(info(null), "merge.zowoo.uk", f.load);
    const names = f.calls.map((c) => (c[0] === "capture" ? `capture:${c[1]}` : String(c[0])));
    expect(names.filter((n) => n !== "init")).toEqual(["register", "identify", "capture:game_started", "register", "reset"]);
    expect(f.calls).toContainEqual(["identify", "abc"]);
    expect(f.calls).toContainEqual(["register", { provider: "claude" }]);
  });

  it("keeps queued events when a second sync arrives while the SDK is still loading", async () => {
    const f = fake();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow = vi.fn(async () => {
      await gate;
      return f.load();
    });
    const first = syncAnalytics(info(null), "127.0.0.1", slow);
    track("landing_viewed");
    const second = syncAnalytics(info("abc"), "127.0.0.1", slow);
    track("game_started");
    release();
    await Promise.all([first, second]);
    const captures = f.calls.filter((c) => c[0] === "capture").map((c) => c[1]);
    expect(captures).toEqual(["landing_viewed", "game_started"]);
    expect(f.calls).toContainEqual(["identify", "abc"]);
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it("keeps playing without analytics when the SDK is blocked", async () => {
    const load = vi.fn(async (): Promise<AnalyticsClient> => {
      throw new Error("blocked");
    });
    await expect(syncAnalytics(info("abc"), "merge.zowoo.uk", load)).resolves.toBeUndefined();
    expect(() => track("game_started")).not.toThrow();
  });
});
