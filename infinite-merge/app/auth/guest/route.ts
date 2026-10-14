import { aiProvider, guestConfig } from "@/lib/server/config";
import { AppError, errorResponse } from "@/lib/server/errors";
import { assertSameOrigin, clientIp, enforceRateLimit, ipKey, verifyTurnstile } from "@/lib/server/guard";
import { consumeGuestJoin, globalBudgetLeft } from "@/lib/server/guest/quota";
import { readJson } from "@/lib/server/http";
import { createGuestSession, getCurrentAccount } from "@/lib/server/session";
import type { GuestStartRequest } from "@/lib/types";

/**
 * Anonymous start: no OAuth, plays on the operator's Claude credits within daily limits.
 * Layers, cheapest first: same-origin → burst rate limit → Turnstile → per-IP daily join cap.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (aiProvider() === "mock") return Response.json({ ok: true });
    const { enabled, limits } = guestConfig();
    if (!enabled) throw new AppError("guest_unavailable", { detail: "guest mode disabled" });
    const ip = clientIp(request);
    const key = await ipKey(ip);
    await enforceRateLimit("GUEST_START_LIMITER", key);
    if (await getCurrentAccount()) return Response.json({ ok: true });
    if ((await globalBudgetLeft(limits)) <= 0) throw new AppError("guest_unavailable", { detail: "global daily budget spent" });
    const body = await readJson<GuestStartRequest>(request);
    await verifyTurnstile(body?.turnstileToken, ip);
    await consumeGuestJoin(key, limits);
    await createGuestSession();
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
