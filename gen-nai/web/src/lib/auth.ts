export const ACCESS_PASSWORD = "nicenovel";
export const AUTH_COOKIE_NAME = "gennai-auth";
export const AUTH_COOKIE_VALUE = "1";
export const AUTH_STORAGE_KEY = "gennai-auth";
export const AUTH_STORAGE_VALUE = "1";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AuthResponse = { ok: true } | { ok: false; error: string };

export function jsonAuthResponse(body: AuthResponse, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

export function authCookieHeader(): string {
  return [
    `${AUTH_COOKIE_NAME}=${AUTH_COOKIE_VALUE}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ].join("; ");
}

export function requestHasAuth(req: Request): boolean {
  const cookie = req.headers.get("cookie");
  if (!cookie) return false;

  return cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${AUTH_COOKIE_NAME}=${AUTH_COOKIE_VALUE}`);
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
