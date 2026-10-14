import { aiProvider, guestConfig } from "@/lib/server/config";
import { AppError, errorResponse } from "@/lib/server/errors";
import { globalBudgetLeft } from "@/lib/server/guest/quota";
import { createGuestSession, getCurrentAccount } from "@/lib/server/session";

/** Anonymous start: no OAuth, plays on the operator's Claude credits within daily limits. */
export async function POST() {
  try {
    if (aiProvider() === "mock") return Response.json({ ok: true });
    const { enabled, limits } = guestConfig();
    if (!enabled) throw new AppError("guest_unavailable", { detail: "guest mode disabled" });
    if (globalBudgetLeft(limits) <= 0) throw new AppError("guest_unavailable", { detail: "global daily budget spent" });
    if (await getCurrentAccount()) return Response.json({ ok: true });
    await createGuestSession();
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
