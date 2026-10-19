import { env } from 'cloudflare:test';
import { resetJwksCache } from '../src/auth.js';
import { handleApi } from '../src/index.js';

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

const ALG = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };

export async function makeKeyPair(kid) {
  const pair = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid, alg: 'RS256', use: 'sig' };
  return { kid, privateKey: pair.privateKey, jwk };
}

export const trusted = await makeKeyPair('trusted-kid');
export const untrusted = await makeKeyPair('trusted-kid'); // same kid, different key: forged signature

export const NOW = Date.UTC(2026, 9, 19, 3, 0, 0);
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export async function signJwt(claims, key = trusted, header = {}) {
  const h = b64urlJson({ alg: 'RS256', kid: key.kid, typ: 'JWT', ...header });
  const p = b64urlJson({
    iss: `https://${env.ACCESS_TEAM_DOMAIN}`,
    aud: [env.ACCESS_AUD],
    iat: Math.floor(NOW / 1000) - 60,
    exp: Math.floor(NOW / 1000) + 3600,
    ...claims,
  });
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(sig)}`;
}

export const fakeJwksFetch = async (url) => {
  if (url !== `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`) throw Error(`unexpected fetch ${url}`);
  return Response.json({ keys: [trusted.jwk] });
};

export function freshJwks() {
  resetJwksCache();
}

export const ORIGIN = 'https://poll.zowoo.uk';

// Sends an authenticated API request as `email` (signed Access JWT) at time `now`.
export async function api(email, method, path, body, { now = NOW, headers = {}, envOverride = {}, token } = {}) {
  const h = new Headers(headers);
  const sec = Math.floor(now / 1000);
  if (token !== null) h.set('Cf-Access-Jwt-Assertion', token ?? (await signJwt({ email, iat: sec - 60, exp: sec + 3600 })));
  if (method !== 'GET') {
    if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
    if (!h.has('Origin')) h.set('Origin', ORIGIN);
  }
  const req = new Request(`${ORIGIN}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await handleApi(req, { ...env, ...envOverride }, { fetchImpl: fakeJwksFetch, now });
  return { status: res.status, data: await res.json() };
}

export const pollBody = (overrides = {}) => ({
  title: '점심 메뉴',
  description: '금요일 점심',
  options: ['김치찌개', '돈까스', '쌀국수'],
  multi: false,
  results_mode: 'live',
  closes_at: NOW + 7 * DAY,
  ...overrides,
});

export async function createPoll(email, overrides) {
  const res = await api(email, 'POST', '/api/polls', pollBody(overrides));
  if (res.status !== 201) throw Error(`create failed: ${res.status} ${JSON.stringify(res.data)}`);
  const detail = await api(email, 'GET', `/api/polls/${res.data.id}`);
  return { id: res.data.id, options: detail.data.options.map((o) => o.id) };
}
