import type { NextRequest } from "next/server";
import { SIWC } from "@/lib/server/config";
import { getDb, PENDING_TTL_MS } from "@/lib/server/db";
import { hostInfo, loopbackOrigin, redirectTo, siwcAvailable } from "@/lib/server/http";
import { createSession, getCurrentAccount, isGuest, mergeGuestInto } from "@/lib/server/session";
import { writeCredentials } from "@/lib/server/siwc/credentials";
import { getHostId } from "@/lib/server/siwc/hostId";
import { exchangeCode, hasPlanScope, OAuthError, scopesOf, verifyIdToken } from "@/lib/server/siwc/oauth";
import { forgetModels } from "@/lib/server/siwc/responses";

type PendingRow = {
  state: string;
  nonce: string;
  verifier: string;
  redirect_uri: string;
  client_id: string;
  account_sub: string | null;
  created_at: number;
};

export async function GET(request: NextRequest) {
  // The hosted site shares this database; it must never consume a local sign-in's pending state.
  if (!siwcAvailable(request)) return new Response("Not found", { status: 404 });
  const origin = loopbackOrigin(hostInfo(request).port);
  const fail = (code: string, diagnostic?: string) => {
    console.warn(`[siwc] sign-in failed: ${code}${diagnostic ? ` (${diagnostic})` : ""}`);
    return redirectTo(`${origin}/?auth_error=${encodeURIComponent(code)}`);
  };

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  if (!state) return fail("invalid_state", "missing state");

  const db = getDb();
  const pending = await db.prepare("DELETE FROM im_oauth_pending WHERE state = ? RETURNING *").bind(state).first<PendingRow>();
  if (!pending || Date.now() - pending.created_at > PENDING_TTL_MS) return fail("invalid_state", "unknown or expired state");

  const oauthError = params.get("error");
  if (oauthError) return fail(oauthError === "access_denied" ? "access_denied" : oauthError);

  const code = params.get("code");
  if (!code) return fail("missing_code");

  const isNewRegistration = pending.client_id === SIWC.dynamicClientId;
  const callbackClientId = params.get("client_id");
  let clientId: string;
  if (isNewRegistration) {
    if (!callbackClientId || callbackClientId === SIWC.dynamicClientId) {
      return fail("registration_incomplete", "callback carried no issued client_id");
    }
    clientId = callbackClientId;
  } else {
    if (callbackClientId && callbackClientId !== pending.client_id) {
      return fail("client_mismatch", "callback client_id differs from the selected registration");
    }
    clientId = pending.client_id;
  }

  try {
    const tokens = await exchangeCode({ clientId, code, verifier: pending.verifier, redirectUri: pending.redirect_uri });
    if (!tokens.id_token) return fail("no_id_token");
    const identity = await verifyIdToken(tokens.id_token, clientId, pending.nonce);
    const sub = identity.sub!;
    if (pending.account_sub && pending.account_sub !== sub) {
      return fail("account_mismatch", "re-auth returned a different ChatGPT account");
    }

    const scopes = scopesOf(tokens.scope ?? params.get("scope") ?? "");
    const email = typeof identity.email === "string" ? identity.email : null;
    const name = typeof identity.name === "string" ? identity.name : null;
    const picture = typeof identity.picture === "string" ? identity.picture : null;
    const now = Date.now();

    writeCredentials({
      email,
      issuer: SIWC.issuer,
      subject: sub,
      client_id: clientId,
      ext_agent_host_id: getHostId(),
      id_token: tokens.id_token,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_type: tokens.token_type ?? "Bearer",
      expires_in: tokens.expires_in,
      scopes,
      saved_at: new Date(now).toISOString(),
      expires_at: now + tokens.expires_in * 1000,
    });

    await db
      .prepare(
        `INSERT INTO im_accounts (sub, email, name, picture, client_id, selected_model, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
       ON CONFLICT(sub) DO UPDATE SET
         email = excluded.email, name = excluded.name, picture = excluded.picture,
         client_id = excluded.client_id, last_login_at = excluded.last_login_at`,
      )
      .bind(sub, email, name, picture, clientId, now, now)
      .run();
    forgetModels(sub);

    // A guest who signs in keeps what they discovered.
    const previous = await getCurrentAccount();
    if (previous && isGuest(previous.sub)) {
      const moved = await mergeGuestInto(previous.sub, sub);
      console.info(`[siwc] merged ${moved} guest discoveries into the signed-in account`);
    }

    await createSession(sub);
    const planOff = hasPlanScope(scopes) ? "" : "&plan=off";
    return redirectTo(`${origin}/?signed_in=1${planOff}`);
  } catch (err) {
    if (err instanceof OAuthError) return fail(err.code === "invalid_grant" ? "invalid_grant" : "token_exchange_failed", `status=${err.status} code=${err.code}`);
    return fail("id_token_invalid", err instanceof Error ? err.message : String(err));
  }
}
