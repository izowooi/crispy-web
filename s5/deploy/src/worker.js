// Serves the private game pack from R2. Everything else is Static Assets (see wrangler.jsonc).
//
// Cloudflare Access guards the whole hostname at the edge; this Worker re-verifies the Access JWT
// so the pack never leaks if the Worker is reached some other way (workers.dev/preview are off,
// but fail closed regardless).
const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
};
const PACK_PATH = /^\/gamepacks\/[\w.-]+\.bin$/;
const JWKS_TTL_MS = 10 * 60 * 1000;
let jwksCache; // { url, at, keys }

const deny = (status, text) =>
  new Response(text, { status, headers: { ...ISOLATION_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

function b64urlBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

async function accessKeys(teamDomain, fetchImpl) {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  if (jwksCache?.url === url && Date.now() - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetchImpl(url);
  if (!res.ok) throw Error(`JWKS fetch failed: ${res.status}`);
  const { keys } = await res.json();
  jwksCache = { url, at: Date.now(), keys };
  return keys;
}

// Returns the verified email, or throws. Checks signature (RS256), issuer, audience, expiry.
export async function verifyAccessJwt(token, env, fetchImpl = fetch, now = Date.now()) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ALLOWED_EMAILS) throw Error('Access not configured');
  const parts = token?.split('.');
  if (parts?.length !== 3) throw Error('Malformed token');
  const [h, p, s] = parts;
  const header = b64urlJson(h);
  if (header.alg !== 'RS256') throw Error('Unexpected alg');
  let jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, fetchImpl)).find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache = undefined; // key rotation: refetch once
    jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN, fetchImpl)).find((k) => k.kid === header.kid);
  }
  if (!jwk) throw Error('Unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw Error('Bad signature');
  const claims = b64urlJson(p);
  if (claims.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) throw Error('Bad issuer');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw Error('Bad audience');
  const sec = now / 1000;
  if (typeof claims.exp !== 'number' || claims.exp <= sec) throw Error('Expired');
  if (typeof claims.nbf === 'number' && claims.nbf > sec + 60) throw Error('Not yet valid');
  const list = (s) => (s ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const email = String(claims.email ?? '').toLowerCase();
  if (email && list(env.ALLOWED_EMAILS).includes(email)) return email;
  // Service-token JWTs carry no email, only the token's client id; used for automated E2E checks.
  const clientId = String(claims.common_name ?? '').toLowerCase();
  if (!email && clientId && list(env.ALLOWED_SERVICE_TOKENS).includes(clientId)) return `service:${clientId}`;
  throw Error('Identity not allowed');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!PACK_PATH.test(url.pathname)) return env.ASSETS.fetch(request);
    if (request.method !== 'GET' && request.method !== 'HEAD') return deny(405, 'Method not allowed');
    if (env.ALLOWED_HOST && url.hostname !== env.ALLOWED_HOST) return deny(403, 'Forbidden host');

    // Home networks pass Access through a Bypass policy, which forwards no JWT. CF-Connecting-IP is set
    // by Cloudflare's edge on the custom domain, so a client cannot forge it.
    const trustedIp = (env.ALLOWED_IPS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      .includes(request.headers.get('CF-Connecting-IP') ?? '');
    if (!trustedIp) {
      try {
        await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion'), env);
      } catch {
        return deny(403, 'Forbidden');
      }
    }

    const object = await env.GAMEPACKS.get(url.pathname.slice(1));
    if (!object) return deny(404, 'Not found');
    const headers = new Headers(ISOLATION_HEADERS);
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Length', String(object.size));
    headers.set('ETag', object.httpEtag);
    // Keys are content-addressed, so the browser may keep them; never a shared cache (Access-gated).
    headers.set('Cache-Control', 'private, max-age=31536000, immutable');
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  },
};
