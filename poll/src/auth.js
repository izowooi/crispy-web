// Cloudflare Access guards poll.zowoo.uk at the edge; the Worker re-verifies the Access JWT on every
// /api request so nothing is trusted from the client, and fails closed if Access is misconfigured.
const JWKS_TTL_MS = 10 * 60 * 1000;
let jwksCache; // { url, at, keys }

export class AuthError extends Error {}

function b64urlBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

async function accessKeys(teamDomain, fetchImpl) {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  if (jwksCache?.url === url && Date.now() - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetchImpl(url);
  if (!res.ok) throw new AuthError(`JWKS fetch failed: ${res.status}`);
  const { keys } = await res.json();
  jwksCache = { url, at: Date.now(), keys };
  return keys;
}

export function resetJwksCache() {
  jwksCache = undefined;
}

// Returns verified claims, or throws AuthError. Checks signature (RS256), issuer, audience, expiry.
export async function verifyAccessJwt(token, env, fetchImpl = fetch, now = Date.now()) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new AuthError('Access not configured');
  const parts = token?.split('.');
  if (parts?.length !== 3) throw new AuthError('Malformed token');
  const [h, p, s] = parts;
  let header, claims;
  try {
    header = b64urlJson(h);
    claims = b64urlJson(p);
  } catch {
    throw new AuthError('Malformed token');
  }
  if (header.alg !== 'RS256') throw new AuthError('Unexpected alg');
  let jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, fetchImpl)).find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache = undefined; // key rotation: refetch once
    jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, fetchImpl)).find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new AuthError('Unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new AuthError('Bad signature');
  if (claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) throw new AuthError('Bad issuer');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw new AuthError('Bad audience');
  const sec = now / 1000;
  if (typeof claims.exp !== 'number' || claims.exp <= sec) throw new AuthError('Expired');
  if (typeof claims.nbf === 'number' && claims.nbf > sec + 60) throw new AuthError('Not yet valid');
  return claims;
}

export const emailList = (s) =>
  String(s ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const isAdmin = (email, env) => emailList(env.ADMIN_EMAILS).includes(email);

// Maps verified claims to the identity used by the app, or throws.
export function identityFromClaims(claims, env) {
  const email = String(claims.email ?? '').trim().toLowerCase();
  if (email) {
    const domain = String(env.ALLOWED_DOMAIN ?? '').trim().toLowerCase();
    if ((domain && email.endsWith(`@${domain}`)) || isAdmin(email, env)) return email;
    throw new AuthError('Identity not allowed');
  }
  // Service-token JWTs carry no email, only the token's client id. Only used for temporary
  // post-deploy smoke tests; ALLOWED_SERVICE_TOKENS stays empty in normal operation.
  const clientId = String(claims.common_name ?? '').trim().toLowerCase();
  if (clientId && emailList(env.ALLOWED_SERVICE_TOKENS).includes(clientId)) return `service-token:${clientId}`;
  throw new AuthError('Identity not allowed');
}

// DEV_EMAIL only exists in .dev.vars, which `wrangler dev` loads and `wrangler deploy` never uploads.
// The localhost check keeps it inert even if someone sets the variable on the deployed Worker.
export function devIdentity(request, env) {
  if (!env.DEV_EMAIL) return null;
  const { hostname } = new URL(request.url);
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') return null;
  return String(env.DEV_EMAIL).trim().toLowerCase();
}

export async function authenticate(request, env, fetchImpl = fetch, now = Date.now()) {
  const dev = devIdentity(request, env);
  if (dev) return { email: identityFromClaims({ email: dev }, env), dev: true };
  const claims = await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion'), env, fetchImpl, now);
  return { email: identityFromClaims(claims, env), dev: false };
}
