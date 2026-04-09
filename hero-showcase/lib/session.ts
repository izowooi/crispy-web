export interface SessionUser {
  email: string;
  name: string;
  picture?: string;
}

export const SESSION_COOKIE = "hs_session";
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7일

// Web Crypto API only — Edge Runtime 호환 (Buffer 미사용)
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function getHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.GOOGLE_CLIENT_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function encodeSession(user: SessionUser): Promise<string> {
  const payload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

export async function decodeSession(token: string): Promise<SessionUser | null> {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  try {
    const key = await getHmacKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;
    const payload: SessionUser & { exp: number } = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64))
    );
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: payload.email, name: payload.name, picture: payload.picture };
  } catch {
    return null;
  }
}

export const ADMIN_EMAIL = "izowooi85@gmail.com";

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return user?.email === ADMIN_EMAIL;
}

export { SESSION_MAX_AGE_SEC };
