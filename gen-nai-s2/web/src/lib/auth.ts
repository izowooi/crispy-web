import { runtimeEnv } from "./runtime-env";

export const SESSION_COOKIE = "gen-nai-s2-session";
const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function createSession(now = Date.now()): Promise<string> {
  const secret = runtimeEnv().SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET is not configured");
  const expires = now + 30 * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySession(value?: string, now = Date.now()): Promise<boolean> {
  if (!value) return false;
  const secret = runtimeEnv().SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || Number(payload) <= now) return false;
  return signature === await sign(payload, secret);
}

export function passwordMatches(value: string): boolean {
  const expected = runtimeEnv().AUTH_PASSWORD;
  if (!expected) return false;
  const a = encoder.encode(value);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
