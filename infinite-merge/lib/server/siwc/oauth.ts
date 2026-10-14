import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { getDb } from "../db";
import { AppError } from "../errors";
import { APP_NAME, SIWC } from "../config";
import { clearTokens, readCredentials, writeCredentials, type CredentialRecord } from "./credentials";

export type AuthorizeParams = {
  redirectUri: string;
  hostId: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  /** Issued client_id for re-auth; omit for a first-time dynamic registration. */
  clientId?: string | null;
  idTokenHint?: string | null;
  loginHint?: string | null;
};

export function buildAuthorizeUrl(p: AuthorizeParams): string {
  const reauth = Boolean(p.clientId);
  const q = new URLSearchParams();
  q.set("client_id", reauth ? p.clientId! : SIWC.dynamicClientId);
  if (!reauth) q.set("agent_name_hint", APP_NAME);
  q.set("ext_agent_host_id", p.hostId);
  if (reauth && p.idTokenHint) q.set("id_token_hint", p.idTokenHint);
  if (reauth && p.loginHint) q.set("login_hint", p.loginHint);
  q.set("response_type", "code");
  q.set("redirect_uri", p.redirectUri);
  q.set("scope", SIWC.scope);
  q.set("resource", SIWC.resource);
  q.set("state", p.state);
  q.set("nonce", p.nonce);
  q.set("code_challenge_method", "S256");
  q.set("code_challenge", p.codeChallenge);
  return `${SIWC.authorizeUrl}?${q.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  earliest_refresh_at?: number;
};

export class OAuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly description?: string,
  ) {
    super(`${code}${description ? `: ${description}` : ""}`);
  }
}

async function postToken(form: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(SIWC.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(form),
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {
    // non-JSON error page
  }
  if (!res.ok) {
    const code = typeof body.error === "string" ? body.error : `http_${res.status}`;
    const desc = typeof body.error_description === "string" ? body.error_description : undefined;
    throw new OAuthError(res.status, code, desc);
  }
  return body as unknown as TokenResponse;
}

export function exchangeCode(p: { clientId: string; code: string; verifier: string; redirectUri: string }) {
  return postToken({
    grant_type: "authorization_code",
    client_id: p.clientId,
    code: p.code,
    code_verifier: p.verifier,
    redirect_uri: p.redirectUri,
    resource: SIWC.resource,
  });
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function verifyIdToken(idToken: string, clientId: string, nonce: string): Promise<JWTPayload> {
  jwks ??= createRemoteJWKSet(new URL(SIWC.jwksUrl));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: SIWC.issuer,
    audience: clientId,
    requiredClaims: ["sub", "exp", "iat"],
    clockTolerance: 5,
  });
  if (payload.nonce !== nonce) throw new Error("ID token nonce mismatch");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("ID token has no subject");
  return payload;
}

export function scopesOf(scope: string | undefined): string[] {
  return (scope ?? "").split(/\s+/).filter(Boolean).sort();
}

export function hasPlanScope(scopes: string[]): boolean {
  return scopes.includes(SIWC.planScope);
}

const TERMINAL_REFRESH_ERRORS = new Set([
  "invalid_grant",
  "invalid_refresh_token",
  "token_expired",
  "refresh_token_expired",
  "refresh_token_invalidated",
  "refresh_token_reused",
]);

// Refresh tokens rotate: two concurrent refreshes would burn each other (refresh_token_reused).
const refreshing = new Map<string, Promise<CredentialRecord>>();

export function refreshCredentials(clientId: string): Promise<CredentialRecord> {
  const inflight = refreshing.get(clientId);
  if (inflight) return inflight;
  const task = doRefresh(clientId).finally(() => refreshing.delete(clientId));
  refreshing.set(clientId, task);
  return task;
}

async function doRefresh(clientId: string): Promise<CredentialRecord> {
  const record = readCredentials(clientId);
  if (!record?.refresh_token) throw new AppError("session_expired");
  try {
    const t = await postToken({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: record.refresh_token,
      resource: SIWC.resource,
    });
    const now = Date.now();
    const next: CredentialRecord = {
      ...record,
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? record.refresh_token,
      id_token: t.id_token ?? record.id_token,
      token_type: t.token_type ?? "Bearer",
      expires_in: t.expires_in,
      scopes: t.scope ? scopesOf(t.scope) : record.scopes,
      saved_at: new Date(now).toISOString(),
      expires_at: now + t.expires_in * 1000,
    };
    writeCredentials(next);
    return next;
  } catch (err) {
    if (err instanceof OAuthError) {
      console.warn(`[siwc] refresh failed: status=${err.status} code=${err.code}`);
      if (TERMINAL_REFRESH_ERRORS.has(err.code)) {
        clearTokens(clientId, true);
        throw new AppError("session_expired");
      }
      if (err.code === "invalid_client") {
        throw new AppError("internal", { message: "앱의 ChatGPT 클라이언트 설정이 올바르지 않아요.", detail: err.code });
      }
      throw new AppError("unavailable", { detail: err.code });
    }
    // Network failure: keep credentials, let the user retry.
    throw new AppError("unavailable", { detail: String(err) });
  }
}

const REFRESH_SKEW_MS = 120_000;

export async function getValidAccessToken(sub: string): Promise<{ accessToken: string; record: CredentialRecord }> {
  const row = await getDb()
    .prepare("SELECT client_id FROM im_accounts WHERE sub = ?")
    .bind(sub)
    .first<{ client_id: string | null }>();
  if (!row?.client_id) throw new AppError("not_signed_in");
  let record = readCredentials(row.client_id);
  if (!record?.access_token && !record?.refresh_token) throw new AppError("session_expired");
  if (!hasPlanScope(record.scopes)) throw new AppError("plan_not_enabled");
  if (!record.access_token || record.expires_at - Date.now() < REFRESH_SKEW_MS) {
    record = await refreshCredentials(row.client_id);
  }
  return { accessToken: record.access_token!, record };
}

let revocationEndpoint: string | undefined;

async function getRevocationEndpoint(): Promise<string> {
  if (revocationEndpoint) return revocationEndpoint;
  const res = await fetch(SIWC.discoveryUrl);
  if (!res.ok) throw new Error(`discovery http_${res.status}`);
  const doc = (await res.json()) as { revocation_endpoint?: string };
  if (!doc.revocation_endpoint) throw new Error("no revocation_endpoint");
  revocationEndpoint = doc.revocation_endpoint;
  return revocationEndpoint;
}

/** Best effort: true only when OpenAI confirmed (empty 200, also for already-invalid tokens). */
export async function revokeRefreshToken(clientId: string, refreshToken: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    try {
      const endpoint = await getRevocationEndpoint();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken, token_type_hint: "refresh_token", client_id: clientId }),
      });
      if (res.ok) return true;
      if (res.status < 500) {
        console.warn(`[siwc] revoke rejected: status=${res.status}`);
        return false;
      }
    } catch (err) {
      console.warn(`[siwc] revoke attempt ${attempt + 1} failed: ${String(err)}`);
    }
  }
  return false;
}
