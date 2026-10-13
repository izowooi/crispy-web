const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// Workers의 PBKDF2 반복 횟수 상한이 100,000이다.
const ITERATIONS = 100_000;

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPin(pin: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toHex(salt.buffer as ArrayBuffer), hash: await derive(pin, salt) };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPin(pin: string, salt: string, hash: string): Promise<boolean> {
  return safeEqual(await derive(pin, fromHex(salt)), hash);
}

/**
 * 편집 권한 쿠키 값. DB에만 있는 pin_hash에서 파생하므로 별도 서버 secret 없이도
 * 위조할 수 없고, 비밀번호를 바꾸면 기존 쿠키가 자동으로 무효가 된다.
 */
export async function editToken(daycareId: string, pinHash: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(`baby-menu:edit:${daycareId}:${pinHash}`)));
}

export function newDaycareId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

export const LAST_DAYCARE_COOKIE = "bm_last";
export const editCookieName = (daycareId: string) => `bm_edit_${daycareId}`;
// 브라우저가 허용하는 최대치(400일)에 가깝게 둔다. 한 달에 한 번 쓰는 앱이라 짧으면 매번 잊는다.
export const LONG_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
