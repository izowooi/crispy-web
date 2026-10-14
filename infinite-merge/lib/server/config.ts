import "server-only";
import path from "node:path";
import type { AiProvider } from "@/lib/types";

// Overridable only so the full OAuth + streaming path can be exercised against a local fake server.
const AUTH_ORIGIN = process.env.INFINITE_MERGE_AUTH_ORIGIN || "https://auth.openai.com";
const API_BASE = process.env.INFINITE_MERGE_API_BASE || "https://api.openai.com/v1";

export const SIWC = {
  authorizeUrl: `${AUTH_ORIGIN}/api/accounts/authorize`,
  tokenUrl: `${AUTH_ORIGIN}/api/accounts/oauth/token`,
  issuer: AUTH_ORIGIN,
  jwksUrl: `${AUTH_ORIGIN}/.well-known/jwks.json`,
  discoveryUrl: `${AUTH_ORIGIN}/.well-known/openid-configuration`,
  resource: "https://api.openai.com/v1",
  apiBase: API_BASE,
  scope: "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
  planScope: "chatgpt.tokens.use.direct",
  dynamicClientId: "dynamic_agent_client",
  callbackPath: "/auth/callback",
  manageUsageUrl: "https://chatgpt.com/settings/usage",
} as const;

export const APP_NAME = "Infinite Merge";

export function dataDir(): string {
  return process.env.INFINITE_MERGE_DATA_DIR || path.join(process.cwd(), ".data");
}

export function aiProvider(): AiProvider {
  return process.env.INFINITE_MERGE_AI === "mock" ? "mock" : "chatgpt";
}

export function modelOverride(): string | null {
  return process.env.INFINITE_MERGE_MODEL?.trim() || null;
}

export const GUEST_MODEL = "claude-haiku-5-5";

export type GuestLimits = {
  /** Model calls per guest per KST day. */
  perGuest: number;
  /** Model calls for all guests combined per KST day: the hard ceiling on operator spend. */
  global: number;
  /** Model calls per hashed client IP per KST day; survives cookie clearing. */
  perIp: number;
  /** New guest sessions per hashed client IP per KST day. */
  joinsPerIp: number;
};

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Guest mode spends the operator's Claude credits. The key is read explicitly (never via the
 * SDK's ambient credential chain) so a developer's `ant auth login` profile can't leak into it.
 */
export function guestConfig(): { enabled: boolean; apiKey: string | null; limits: GuestLimits } {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || null;
  const wellFormed = apiKey !== null && isAnthropicKeyShape(apiKey);
  return {
    enabled: wellFormed && process.env.INFINITE_MERGE_GUEST !== "off",
    apiKey,
    limits: {
      perGuest: intEnv("INFINITE_MERGE_GUEST_DAILY", 60),
      global: intEnv("INFINITE_MERGE_GUEST_GLOBAL_DAILY", 1500),
      perIp: intEnv("INFINITE_MERGE_GUEST_IP_DAILY", 150),
      joinsPerIp: intEnv("INFINITE_MERGE_GUEST_JOIN_IP_DAILY", 20),
    },
  };
}

/** Kill switch for Sign in with ChatGPT; it is also off on any non-loopback host (see siwcAvailable). */
export function siwcDisabled(): boolean {
  return process.env.INFINITE_MERGE_SIWC === "off";
}

/** Both keys come from the Turnstile widget; without them the bot check is skipped (local runs). */
export function turnstileConfig(): { siteKey: string; secretKey: string } | null {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

/** Salt for hashing client IPs so raw addresses never reach the database. Set as a Worker secret. */
export function ipSalt(): string {
  return process.env.IM_IP_SALT?.trim() || "infinite-merge-local";
}

let warnedKeyShape = false;

/**
 * Catches .env.local typos like `ANTHROPIC_API_KEY==sk-ant-…` (the value keeps the extra "=") or
 * a quoted value, which would otherwise surface only as a 401 on the first guest combine.
 */
function isAnthropicKeyShape(key: string): boolean {
  if (key.startsWith("sk-ant-")) return true;
  if (!warnedKeyShape) {
    warnedKeyShape = true;
    console.warn(
      `[guest] ANTHROPIC_API_KEY does not start with "sk-ant-" (starts with ${JSON.stringify(key.slice(0, 1))}); guest mode is off. Check .env.local for a stray "=" or quotes.`,
    );
  }
  return false;
}
