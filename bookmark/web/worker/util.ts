export type Env = {
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  SIGNUP_MODE?: string;
  ALLOWED_EMAILS?: string;
  BOOTSTRAP_KEY?: string;
  DEV_LOGIN?: string;
  META_FETCH?: string;
};

export type User = { id: string; email: string; name: string; picture: string };

export type AppEnv = { Bindings: Env };

export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 429,
    message: string,
  ) {
    super(message);
  }
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sha256(input: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
}

export async function sha256Hex(input: string): Promise<string> {
  return [...(await sha256(input))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256B64url(input: string): Promise<string> {
  return b64url(await sha256(input));
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** 오픈 리다이렉트 방지: 같은 origin의 절대 경로만 허용한다. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}

export const DAY = 86_400_000;
