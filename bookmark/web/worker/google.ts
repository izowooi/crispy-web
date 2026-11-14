import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

let keySet: JWTVerifyGetKey = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** 테스트에서 로컬 키로 바꿔 끼우기 위한 훅. */
export function setGoogleKeySetForTest(next: JWTVerifyGetKey) {
  keySet = next;
}

export type GoogleIdentity = { sub: string; email: string; name: string; picture: string };

export function googleAuthUrl(opts: { clientId: string; redirectUri: string; state: string; nonce: string }): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    // client secret이 필요 없는 OIDC implicit(id_token) + form_post. 토큰은 URL에 남지 않고 서버로 바로 POST된다.
    response_type: "id_token",
    response_mode: "form_post",
    scope: "openid email profile",
    state: opts.state,
    nonce: opts.nonce,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export async function verifyGoogleIdToken(idToken: string, clientId: string, nonce: string): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, keySet, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"],
  });
  if (payload.nonce !== nonce) throw new Error("nonce mismatch");
  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("unverified google account");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : "",
    picture: typeof payload.picture === "string" ? payload.picture : "",
  };
}
