// Shared contract between the game UI (client) and route handlers (server).

export type ElementView = {
  name: string;
  emoji: string;
  /** One-line flavor text from the alchemy engine. Base elements carry their own. */
  desc?: string;
  /** Hanja glyph, only for the five base elements (木火土金水). */
  hanja?: string;
  base?: boolean;
  /** Unix ms when this user first obtained the element. */
  discoveredAt?: number;
  /** True when this user was the first in the shared world to create it. */
  firstDiscovery?: boolean;
};

export type UserView = {
  name: string | null;
  email: string | null;
  picture: string | null;
};

/** chatgpt: the user's own ChatGPT plan. claude: anonymous guest on the operator's Claude credits. */
export type AiProvider = "chatgpt" | "claude" | "mock";

export type PlanView = {
  provider: AiProvider;
  /** True when the granted scopes include chatgpt.tokens.use.direct. */
  sharing: boolean;
  model: string | null;
  /** Guest mode only: model calls left today for this guest. */
  remaining?: number | null;
  /** Guest mode only: refill schedule, as in GuestInfo.refill. */
  refill?: { minutes: number; amount: number } | null;
};

export type GuestInfo = {
  /** False when the operator key is missing, the kill switch is on, or today's global budget is spent. */
  available: boolean;
  model: string;
  dailyLimit: number;
  /** Spent calls come back: +amount every `minutes`, up to dailyLimit. Null when refill is off. */
  refill: { minutes: number; amount: number } | null;
  /** Cloudflare Turnstile site key when bot checks are on; the guest start must then carry a token. */
  turnstileSiteKey: string | null;
};

/** PostHog settings for the browser SDK; see lib/analytics.ts. */
export type AnalyticsInfo = {
  key: string;
  host: string;
  /** Salted hash of the account id, so PostHog never sees the raw guest or ChatGPT id. Null when signed out. */
  distinctId: string | null;
};

/** GET /api/state */
export type StateResponse = {
  user: UserView | null;
  plan: PlanView | null;
  elements: ElementView[];
  /** Total distinct elements discovered by anyone in the shared world. */
  worldCount: number;
  guest: GuestInfo;
  /** Sign in with ChatGPT is offered only on a local loopback run (http://127.0.0.1), never when hosted. */
  siwc: boolean;
  /** Null when analytics is off (no INFINITE_MERGE_POSTHOG_KEY). */
  analytics: AnalyticsInfo | null;
};

/** POST /auth/guest body */
export type GuestStartRequest = { turnstileToken?: string };

/** POST /api/combine body */
export type CombineRequest = { a: string; b: string };

/** POST /api/combine 200 */
export type CombineResponse = {
  result: ElementView;
  /** New to this user's collection. */
  isNew: boolean;
  /** Never existed in the world before this combine. */
  isFirstDiscovery: boolean;
  /** Served from the recipe book without calling the model. */
  cached: boolean;
  model: string | null;
  elapsedMs: number;
  /** Guest mode only: model calls left today after this combine. */
  remaining?: number | null;
};

export type AppErrorCode =
  | "not_signed_in"
  | "plan_not_enabled"
  | "usage_limit"
  | "not_eligible"
  | "session_expired"
  | "unsupported"
  | "unavailable"
  | "bad_output"
  | "bad_request"
  | "unknown_element"
  | "guest_limit"
  | "guest_unavailable"
  | "rate_limited"
  | "forbidden"
  | "bot_check_failed"
  | "internal";

export type ErrorAction = "signin" | "manage_usage" | "retry" | "none";

/** Any non-2xx JSON body from /api/* */
export type ErrorResponse = {
  error: { code: AppErrorCode; message: string; action: ErrorAction; detail?: string };
};

/** GET /api/models */
export type ModelsResponse = {
  models: { slug: string; displayName: string }[];
  selected: string | null;
};
