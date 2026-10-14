import type { NextRequest } from "next/server";
import { SIWC } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";
import { hostInfo, isLocalAlias, loopbackOrigin, redirectTo } from "@/lib/server/http";
import { findAccount, getCurrentAccount, isGuest, type Account } from "@/lib/server/session";
import { readCredentials } from "@/lib/server/siwc/credentials";
import { getHostId } from "@/lib/server/siwc/hostId";
import { buildAuthorizeUrl } from "@/lib/server/siwc/oauth";
import { createPkce, randomToken } from "@/lib/server/siwc/pkce";

function previousAccount(): Account | null {
  const row = getDb()
    .prepare("SELECT sub FROM accounts WHERE client_id IS NOT NULL ORDER BY last_login_at DESC LIMIT 1")
    .get() as { sub: string } | undefined;
  return row ? findAccount(row.sub) : null;
}

export async function GET(request: NextRequest) {
  const { hostname, port } = hostInfo(request);
  const url = request.nextUrl;
  if (isLocalAlias(hostname)) {
    return redirectTo(`${loopbackOrigin(port)}${url.pathname}${url.search}`);
  }
  if (hostname !== "127.0.0.1") {
    return new Response(
      "Sign in with ChatGPT(로컬 앱 모드)는 http://127.0.0.1 루프백 콜백만 허용해요. 이 PC의 브라우저에서 http://127.0.0.1:" +
        (port || "3000") +
        " 으로 접속해 주세요.",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  let account: Account | null = null;
  if (url.searchParams.get("new") !== "1") {
    const requested = url.searchParams.get("account");
    const current = await getCurrentAccount();
    // A guest has no ChatGPT registration; fall back to whoever signed in with ChatGPT last.
    account = requested ? findAccount(requested) : ((current && !isGuest(current.sub) ? current : null) ?? previousAccount());
    if (!account?.client_id) account = null;
  }
  const credentials = account?.client_id ? readCredentials(account.client_id) : null;

  const state = randomToken();
  const nonce = randomToken();
  const { verifier, challenge } = createPkce();
  const redirectUri = `${loopbackOrigin(port)}${SIWC.callbackPath}`;
  const clientId = account?.client_id ?? SIWC.dynamicClientId;

  const db = getDb();
  db.prepare("DELETE FROM oauth_pending WHERE created_at < ?").run(Date.now() - 10 * 60 * 1000);
  db.prepare(
    "INSERT INTO oauth_pending (state, nonce, verifier, redirect_uri, client_id, account_sub, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(state, nonce, verifier, redirectUri, clientId, account?.sub ?? null, Date.now());

  // Contains id_token_hint on re-auth: never log this URL.
  const authorizeUrl = buildAuthorizeUrl({
    redirectUri,
    hostId: getHostId(),
    state,
    nonce,
    codeChallenge: challenge,
    clientId: account?.client_id ?? null,
    idTokenHint: credentials?.id_token ?? null,
    loginHint: credentials?.email ?? account?.email ?? null,
  });
  return new Response(null, { status: 302, headers: { Location: authorizeUrl, "Cache-Control": "no-store" } });
}
