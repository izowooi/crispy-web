const encoder = new TextEncoder();
const keyCache = new Map();

async function hmacKey(secret) {
  let key = keyCache.get(secret);
  if (!key) {
    key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    keyCache.set(secret, key);
  }
  return key;
}

export async function hmacHex(secret, message) {
  if (!secret) throw Error('VOTER_SECRET is not configured');
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const voterHash = (secret, pollId, email) => hmacHex(secret, `${pollId}:${email.toLowerCase()}`);
export const creatorHash = (secret, pollId, email) => hmacHex(secret, `creator:${pollId}:${email.toLowerCase()}`);
// Rate-limit keys must not carry the email either.
export const rateLimitKey = (secret, email) => hmacHex(secret, `ratelimit:${email.toLowerCase()}`);

export function randomId(bytes = 12) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
