import { SELF, env } from "cloudflare:test";
import { createSession } from "../worker/session";
import { ORIGIN } from "./helpers";

/** first-user 가입 정책을 우회해 DB에 직접 사용자와 세션을 만든다(테스트 파일 안에서 여러 사용자가 필요할 때). */
export async function seedUser(email: string, kind: "web" | "device" = "web") {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, google_sub, email, name, picture, created_at) VALUES (?, ?, ?, '', '', ?)")
    .bind(id, `seed:${email}`, email, Date.now())
    .run();
  const token = await createSession(env.DB, id, kind, "test");
  const headers = (extra?: Record<string, string>, json?: unknown) => ({
    ...(kind === "web" ? { Cookie: `__Host-zk=${token}`, Origin: ORIGIN } : { Authorization: `Bearer ${token}` }),
    ...(json !== undefined ? { "content-type": "application/json" } : {}),
    ...extra,
  });
  const request = (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const { json, ...rest } = init;
    return SELF.fetch(`${ORIGIN}${path}`, {
      redirect: "manual",
      ...rest,
      headers: headers(rest.headers as Record<string, string> | undefined, json),
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  };
  return { id, token, request };
}

export type Item = {
  id: string;
  url: string | null;
  title: string;
  note: string;
  domain: string;
  createdAt: number;
  readAt: number | null;
};
