import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import wranglerConfig from '../wrangler.jsonc?raw';
import gitignore from '../.gitignore?raw';
import { AuthError, devIdentity, identityFromClaims, verifyAccessJwt } from '../src/auth.js';
import * as main from '../src/index.js';
import { handleApi } from '../src/index.js';
import { NOW, api, fakeJwksFetch, freshJwks, signJwt, untrusted } from './helpers.js';

const verify = (token, now = NOW) => verifyAccessJwt(token, env, fakeJwksFetch, now);

beforeEach(freshJwks);

describe('Access JWT verification', () => {
  it('accepts a correctly signed token', async () => {
    const claims = await verify(await signJwt({ email: 'a@wemadeplay.com' }));
    expect(claims.email).toBe('a@wemadeplay.com');
  });

  it('rejects an expired token', async () => {
    const token = await signJwt({ email: 'a@wemadeplay.com', exp: Math.floor(NOW / 1000) - 1 });
    await expect(verify(token)).rejects.toThrow('Expired');
  });

  it('rejects a token without exp', async () => {
    const token = await signJwt({ email: 'a@wemadeplay.com', exp: undefined });
    await expect(verify(token)).rejects.toThrow('Expired');
  });

  it('rejects a wrong audience', async () => {
    const token = await signJwt({ email: 'a@wemadeplay.com', aud: ['another-app'] });
    await expect(verify(token)).rejects.toThrow('Bad audience');
  });

  it('rejects a wrong issuer', async () => {
    const token = await signJwt({ email: 'a@wemadeplay.com', iss: 'https://evil.cloudflareaccess.com' });
    await expect(verify(token)).rejects.toThrow('Bad issuer');
  });

  it('rejects a forged signature', async () => {
    const token = await signJwt({ email: 'a@wemadeplay.com' }, untrusted);
    await expect(verify(token)).rejects.toThrow('Bad signature');
  });

  it('rejects a non-RS256 header', async () => {
    const token = await signJwt({ email: 'a@wemadeplay.com' }, undefined, { alg: 'none' });
    await expect(verify(token)).rejects.toThrow('Unexpected alg');
  });

  it('rejects missing or malformed tokens', async () => {
    await expect(verify(null)).rejects.toThrow(AuthError);
    await expect(verify('a.b')).rejects.toThrow(AuthError);
    await expect(verify('!!.??.##')).rejects.toThrow(AuthError);
  });
});

describe('identity rules', () => {
  const domainEnv = { ...env, ALLOWED_DOMAIN: 'wemadeplay.com' };

  it('admits any verified email when ALLOWED_DOMAIN is "*" (production config)', () => {
    expect(env.ALLOWED_DOMAIN).toBe('*');
    expect(identityFromClaims({ email: 'Kim@Gmail.com' }, env)).toBe('kim@gmail.com');
  });

  it('still requires an email (or an allowlisted service token)', () => {
    expect(() => identityFromClaims({}, env)).toThrow(AuthError);
    expect(() => identityFromClaims({ email: '  ' }, env)).toThrow(AuthError);
  });

  it('allows the configured domain (case-insensitive)', () => {
    expect(identityFromClaims({ email: 'Kim@WemadePlay.com' }, domainEnv)).toBe('kim@wemadeplay.com');
  });

  it('rejects other domains and look-alike domains when a domain is set', () => {
    for (const email of ['kim@gmail.com', 'kim@notwemadeplay.com', 'kim@wemadeplay.com.evil.io', 'wemadeplay.com']) {
      expect(() => identityFromClaims({ email }, domainEnv)).toThrow(AuthError);
    }
  });

  it('treats an empty ALLOWED_DOMAIN as admins only, not as open', () => {
    expect(() => identityFromClaims({ email: 'kim@gmail.com' }, { ...env, ALLOWED_DOMAIN: '' })).toThrow(AuthError);
  });

  it('allows ADMIN_EMAILS outside the domain', () => {
    expect(identityFromClaims({ email: 'izowooi85@gmail.com' }, domainEnv)).toBe('izowooi85@gmail.com');
  });

  it('rejects service tokens unless explicitly allowlisted', () => {
    expect(() => identityFromClaims({ common_name: 'abc.access' }, env)).toThrow(AuthError);
    expect(identityFromClaims({ common_name: 'abc.access' }, { ...env, ALLOWED_SERVICE_TOKENS: 'abc.access' })).toBe('service-token:abc.access');
  });
});

describe('API authentication', () => {
  it('returns 403 without a JWT', async () => {
    const res = await api(null, 'GET', '/api/polls', undefined, { token: null });
    expect(res.status).toBe(403);
  });

  it('accepts any Google account with a valid JWT', async () => {
    expect((await api('kim@gmail.com', 'GET', '/api/polls')).status).toBe(200);
  });

  it('ignores identity sent by the client', async () => {
    const res = await api('kim@gmail.com', 'GET', '/api/me', undefined, {
      headers: { 'Cf-Access-Authenticated-User-Email': 'izowooi85@gmail.com', 'X-User-Email': 'izowooi85@gmail.com' },
    });
    expect(res.data).toEqual({ email: 'kim@gmail.com', is_admin: false });
  });

  it('reports the verified identity', async () => {
    const res = await api('kim@wemadeplay.com', 'GET', '/api/me');
    expect(res).toMatchObject({ status: 200, data: { email: 'kim@wemadeplay.com', is_admin: false } });
    expect((await api('izowooi85@gmail.com', 'GET', '/api/me')).data.is_admin).toBe(true);
  });
});

describe('CSRF', () => {
  it('rejects non-JSON content types', async () => {
    const res = await api('kim@wemadeplay.com', 'POST', '/api/polls', {}, { headers: { 'Content-Type': 'text/plain' } });
    expect(res.status).toBe(415);
  });

  it('rejects foreign or missing origins', async () => {
    expect((await api('kim@wemadeplay.com', 'POST', '/api/polls', {}, { headers: { Origin: 'https://evil.example' } })).status).toBe(403);
    expect((await api('kim@wemadeplay.com', 'POST', '/api/polls', {}, { headers: { Origin: 'null' } })).status).toBe(403);
  });
});

describe('DEV_EMAIL bypass stays local', () => {
  const devEnv = { ...env, DEV_EMAIL: 'dev@wemadeplay.com' };

  it('is not part of the deployed configuration', () => {
    expect(wranglerConfig).not.toMatch(/DEV_EMAIL"\s*:/);
    expect(env.DEV_EMAIL).toBeUndefined();
    expect(gitignore).toMatch(/^\.dev\.vars/m);
  });

  it('only applies on localhost', () => {
    expect(devIdentity(new Request('http://localhost:8787/api/me'), devEnv)).toBe('dev@wemadeplay.com');
    expect(devIdentity(new Request('http://127.0.0.1:8787/api/me'), devEnv)).toBe('dev@wemadeplay.com');
    expect(devIdentity(new Request('https://poll.zowoo.uk/api/me'), devEnv)).toBeNull();
    expect(devIdentity(new Request('https://poll.izowooi.workers.dev/api/me'), devEnv)).toBeNull();
  });

  it('does not bypass Access on the production host even if DEV_EMAIL is set', async () => {
    const res = await handleApi(new Request('https://poll.zowoo.uk/api/me'), devEnv, { fetchImpl: fakeJwksFetch, now: NOW });
    expect(res.status).toBe(403);
  });

  it('works under wrangler dev on localhost', async () => {
    const res = await handleApi(new Request('http://localhost:8787/api/me'), devEnv, { fetchImpl: fakeJwksFetch, now: NOW });
    expect(res.status).toBe(200);
  });
});

describe('worker entry module', () => {
  // workerd rejects any non-function named export of the main module and refuses to start.
  it('exports only functions besides the default handler', () => {
    for (const [name, value] of Object.entries(main)) {
      if (name === 'default') expect(typeof value.fetch).toBe('function');
      else expect(typeof value, name).toBe('function');
    }
  });
});
