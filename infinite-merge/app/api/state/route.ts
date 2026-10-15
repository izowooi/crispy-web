import { connection } from "next/server";
import { BASE_ELEMENTS } from "@/lib/elements";
import { listUserElements, worldCount } from "@/lib/server/alchemy/combine";
import { aiProvider, GUEST_MODEL, guestConfig, modelOverride, turnstileConfig } from "@/lib/server/config";
import { errorResponse } from "@/lib/server/errors";
import { globalBudgetLeft, guestRefillView, guestRemaining } from "@/lib/server/guest/quota";
import { siwcAvailable } from "@/lib/server/http";
import { getCurrentAccount, isGuest } from "@/lib/server/session";
import { readCredentials } from "@/lib/server/siwc/credentials";
import { hasPlanScope } from "@/lib/server/siwc/oauth";
import type { GuestInfo, PlanView, StateResponse } from "@/lib/types";

export async function GET(request: Request) {
  // Request-time only; awaited outside try so the prerender bail-out isn't swallowed as an app error.
  await connection();
  try {
    const { enabled, limits } = guestConfig();
    const siwc = siwcAvailable(request);
    const [budgetLeft, world, account] = await Promise.all([
      enabled ? globalBudgetLeft(limits) : Promise.resolve(0),
      worldCount(),
      getCurrentAccount(),
    ]);
    const guest: GuestInfo = {
      available: enabled && budgetLeft > 0,
      model: GUEST_MODEL,
      dailyLimit: limits.perGuest,
      refill: guestRefillView(limits),
      turnstileSiteKey: turnstileConfig()?.siteKey ?? null,
    };

    if (!account) {
      return Response.json(
        { user: null, plan: null, elements: BASE_ELEMENTS, worldCount: world, guest, siwc } satisfies StateResponse,
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    let plan: PlanView;
    if (aiProvider() === "mock") {
      plan = { provider: "mock", sharing: true, model: "mock" };
    } else if (isGuest(account.sub)) {
      plan = { provider: "claude", sharing: enabled, model: GUEST_MODEL, remaining: await guestRemaining(account.sub, limits),
        refill: guest.refill,
      };
    } else {
      const record = account.client_id ? readCredentials(account.client_id) : null;
      const hasTokens = Boolean(record?.access_token || record?.refresh_token);
      plan = {
        provider: "chatgpt",
        sharing: hasTokens && hasPlanScope(record?.scopes ?? []),
        model: account.selected_model ?? modelOverride(),
      };
    }

    const body: StateResponse = {
      user: { name: account.name, email: account.email, picture: account.picture },
      plan,
      elements: [...BASE_ELEMENTS, ...(await listUserElements(account.sub))],
      worldCount: world,
      guest,
      siwc,
    };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
