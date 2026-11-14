import { SELF } from "cloudflare:test";

export const ORIGIN = "https://keep.test";

/** dev-login으로 웹 세션 쿠키를 받아, 그 사용자로 요청하는 함수를 돌려준다. */
export async function signIn(email = "me@example.com") {
  const res = await SELF.fetch(`${ORIGIN}/auth/dev-login`, {
    method: "POST",
    headers: { "content-type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ email }),
  });
  if (res.status !== 200) throw new Error(`dev-login failed: ${res.status} ${await res.text()}`);
  const cookie = res.headers.get("set-cookie")!.split(";")[0];

  const request = (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const { json, ...rest } = init;
    return SELF.fetch(`${ORIGIN}${path}`, {
      redirect: "manual",
      ...rest,
      headers: {
        Cookie: cookie,
        Origin: ORIGIN,
        ...(json !== undefined ? { "content-type": "application/json" } : {}),
        ...(rest.headers as Record<string, string> | undefined),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  };
  return { cookie, request };
}
