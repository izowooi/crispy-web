import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker, { verifyAccessJwt } from '../src/worker.js';

const TEAM = 'team.example.cloudflareaccess.com';
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: 'aud-1', ALLOWED_EMAILS: 'me@example.com', ALLOWED_HOST: 's5.example.com' };
const b64url = (bytes) => Buffer.from(bytes).toString('base64url');

const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const otherPair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1', alg: 'RS256' };
globalThis.fetch = async (url) => {
  assert.equal(String(url), `https://${TEAM}/cdn-cgi/access/certs`);
  return Response.json({ keys: [jwk] });
};

async function sign(claims, { key = pair.privateKey, kid = 'k1' } = {}) {
  const h = b64url(JSON.stringify({ alg: 'RS256', kid }));
  const p = b64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
}
const good = () => ({ iss: `https://${TEAM}`, aud: ['aud-1'], email: 'Me@Example.com', exp: Math.floor(Date.now() / 1000) + 600 });

test('accepts a valid Access token for the allowed email', async () => {
  assert.equal(await verifyAccessJwt(await sign(good()), env), 'me@example.com');
});

test('rejects wrong audience, issuer, expired, other email, forged signature, unknown kid', async () => {
  const cases = [
    { ...good(), aud: ['other-app'] },
    { ...good(), iss: 'https://evil.cloudflareaccess.com' },
    { ...good(), exp: Math.floor(Date.now() / 1000) - 1 },
    { ...good(), email: 'someone@example.com' },
  ];
  for (const claims of cases) await assert.rejects(verifyAccessJwt(await sign(claims), env));
  await assert.rejects(verifyAccessJwt(await sign(good(), { key: otherPair.privateKey }), env), /Bad signature/);
  await assert.rejects(verifyAccessJwt(await sign(good(), { kid: 'nope' }), env), /Unknown key/);
  await assert.rejects(verifyAccessJwt(undefined, env), /Malformed/);
});

test('service tokens pass only when their client id is listed', async () => {
  const svc = { iss: `https://${TEAM}`, aud: ['aud-1'], common_name: 'abc.access', exp: Math.floor(Date.now() / 1000) + 600 };
  await assert.rejects(verifyAccessJwt(await sign(svc), env), /not allowed/);
  assert.equal(await verifyAccessJwt(await sign(svc), { ...env, ALLOWED_SERVICE_TOKENS: 'abc.access' }), 'service:abc.access');
  await assert.rejects(verifyAccessJwt(await sign({ ...svc, common_name: 'other.access' }), { ...env, ALLOWED_SERVICE_TOKENS: 'abc.access' }));
});

test('fails closed when Access is not configured', async () => {
  await assert.rejects(verifyAccessJwt(await sign(good()), { ...env, ACCESS_AUD: '' }), /not configured/);
});

const bucket = {
  async get(key) {
    if (key !== 'gamepacks/x.bin') return null;
    return { size: 3, httpEtag: '"e"', body: new Blob([new Uint8Array([1, 2, 3])]).stream() };
  },
};
const assets = { fetch: async () => new Response('asset') };
const call = (path, headers = {}, host = 's5.example.com') =>
  worker.fetch(new Request(`https://${host}${path}`, { headers }), { ...env, GAMEPACKS: bucket, ASSETS: assets });

test('pack requests need a valid token; other paths go to static assets', async () => {
  assert.equal(await (await call('/index.html')).text(), 'asset');
  assert.equal((await call('/gamepacks/x.bin')).status, 403);
  assert.equal((await call('/gamepacks/x.bin', { 'Cf-Access-Jwt-Assertion': 'a.b.c' })).status, 403);
  const token = await sign(good());
  assert.equal((await call('/gamepacks/x.bin', { 'Cf-Access-Jwt-Assertion': token }, 'sam5-personal.workers.dev')).status, 403);
  const res = await call('/gamepacks/x.bin', { 'Cf-Access-Jwt-Assertion': token });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cross-Origin-Embedder-Policy'), 'require-corp');
  assert.match(res.headers.get('Cache-Control'), /^private/);
  assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [1, 2, 3]);
  assert.equal((await call('/gamepacks/missing.bin', { 'Cf-Access-Jwt-Assertion': token })).status, 404);
});

test('bypass IPs get the pack without a JWT; other IPs still need one', async () => {
  const ipEnv = { ...env, ALLOWED_IPS: '203.0.113.7, 198.51.100.9', GAMEPACKS: bucket, ASSETS: assets };
  const get = (ip) => worker.fetch(new Request('https://s5.example.com/gamepacks/x.bin', { headers: ip ? { 'CF-Connecting-IP': ip } : {} }), ipEnv);
  assert.equal((await get('203.0.113.7')).status, 200);
  assert.equal((await get('198.51.100.9')).status, 200);
  assert.equal((await get('203.0.113.8')).status, 403);
  assert.equal((await get()).status, 403);
});
