import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ipSalt, turnstileConfig } from "./config";
import { AppError } from "./errors";
import { hostInfo } from "./http";

type LimiterName = "COMBINE_LIMITER" | "GUEST_START_LIMITER";

/** Cloudflare sets cf-connecting-ip on every request that reaches the Worker; local runs have none. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

/** Salted SHA-256 so quotas can key on an IP without storing the address itself. */
/** Stable PostHog distinct id for an account: salted like ipKey, so the raw id never leaves the server. */
export async function analyticsId(sub: string): Promise<string> {
  return ipKey(`analytics:${sub}`);
}

export async function ipKey(ip: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ipSalt()}:${ip}`));
  return [...new Uint8Array(bytes)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function limiter(name: LimiterName) {
  try {
    return getCloudflareContext().env[name];
  } catch {
    return undefined; // tests, or a runtime without the binding
  }
}

/**
 * Workers Rate Limiting binding: a per-location, eventually consistent burst limiter.
 * It is the first, cheap line; the exact per-IP daily cap lives in D1 (guest/quota.ts).
 */
export async function enforceRateLimit(name: LimiterName, key: string): Promise<void> {
  const binding = limiter(name);
  if (!binding) return;
  const { success } = await binding.limit({ key });
  if (!success) throw new AppError("rate_limited", { detail: name });
}

/**
 * Cookie-authenticated POSTs must come from this site's own pages. Browsers always send
 * Sec-Fetch-Site/Origin on cross-site requests, so a forged form or fetch from another site fails here.
 */
export function assertSameOrigin(request: Request): void {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new AppError("forbidden", { detail: `sec-fetch-site=${site}` });
  const origin = request.headers.get("origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new AppError("forbidden", { detail: "bad origin" });
  }
  const { hostname, port } = hostInfo(request);
  const host = port ? `${hostname}:${port}` : hostname;
  if (originHost.toLowerCase() !== host) throw new AppError("forbidden", { detail: `origin=${originHost}` });
}

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Server-side Turnstile check. Skipped when no widget keys are configured (local runs). */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<void> {
  const config = turnstileConfig();
  if (!config) return;
  if (!token) throw new AppError("bot_check_failed", { detail: "missing token" });
  const form = new FormData();
  form.append("secret", config.secretKey);
  form.append("response", token);
  if (ip !== "local") form.append("remoteip", ip);
  let outcome: { success?: boolean; "error-codes"?: string[] };
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    outcome = (await res.json()) as typeof outcome;
  } catch (err) {
    throw new AppError("unavailable", { detail: `turnstile ${String(err)}` });
  }
  if (!outcome.success) {
    throw new AppError("bot_check_failed", { detail: (outcome["error-codes"] ?? []).join(",") || "rejected" });
  }
}
