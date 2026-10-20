import { AuthError, authenticate, isAdmin } from './auth.js';
import { rateLimitKey } from './crypto.js';
import { CREATE_LIMIT_PER_DAY, allowWrite, canCreate, countCreate } from './ratelimit.js';
import { HttpError, castBallot, createPoll, deletePoll, getPoll, listPolls, updatePoll } from './polls.js';
import { ValidationError } from './validate.js';

const MAX_BODY_BYTES = 16 * 1024;
const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' } });
const error = (status, message) => json(status, { error: message });

const ROUTES = [
  ['GET', /^\/api\/me$/, ({ user }) => ({ email: user.email, is_admin: user.admin })],
  ['GET', /^\/api\/polls$/, listPolls],
  ['POST', /^\/api\/polls$/, createPoll],
  ['GET', /^\/api\/polls\/(?<id>[\w-]{1,32})$/, getPoll],
  ['PUT', /^\/api\/polls\/(?<id>[\w-]{1,32})$/, updatePoll],
  ['DELETE', /^\/api\/polls\/(?<id>[\w-]{1,32})$/, deletePoll],
  ['POST', /^\/api\/polls\/(?<id>[\w-]{1,32})\/ballot$/, castBallot],
];

// CSRF: state changes must be JSON (not a form-encodable type) and come from our own origin.
function checkCsrf(request, env, devMode) {
  const type = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new HttpError(415, 'Content-Type 은 application/json 이어야 합니다.');
  const allowed = new Set([`https://${env.ALLOWED_HOST}`]);
  if (devMode) allowed.add(new URL(request.url).origin);
  if (!allowed.has(request.headers.get('Origin'))) throw new HttpError(403, '허용되지 않은 출처입니다.');
}

async function readJson(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new HttpError(413, '요청이 너무 큽니다.');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError('JSON 형식이 올바르지 않습니다.');
  }
}

export async function handleApi(request, env, { fetchImpl = fetch, now = Date.now() } = {}) {
  const url = new URL(request.url);
  let auth;
  try {
    auth = await authenticate(request, env, fetchImpl, now);
  } catch (e) {
    if (e instanceof AuthError) return error(403, '접근 권한이 없습니다.');
    throw e;
  }
  const user = { email: auth.email, admin: isAdmin(auth.email, env) };

  const limitKey = await rateLimitKey(env.VOTER_SECRET, user.email);
  if (env.RATE_LIMITER) {
    // Best effort: the binding is per-location and deliberately permissive.
    const { success } = await env.RATE_LIMITER.limit({ key: limitKey });
    if (!success) return error(429, '요청이 너무 많습니다. 잠시 후 다시 시도하세요.');
  }
  if (request.method !== 'GET' && !(await allowWrite(env.DB, limitKey, now))) {
    return error(429, '요청이 너무 많습니다. 잠시 후 다시 시도하세요.');
  }

  const route = ROUTES.find(([method, re]) => method === request.method && re.test(url.pathname));
  if (!route) {
    const known = ROUTES.some(([, re]) => re.test(url.pathname));
    return error(known ? 405 : 404, known ? '허용되지 않은 메서드입니다.' : '찾을 수 없습니다.');
  }
  const [method, re, handler] = route;
  const quotaApplies = handler === createPoll && !user.admin;
  if (quotaApplies && !(await canCreate(env.DB, limitKey, now))) {
    return error(429, `질문은 하루에 ${CREATE_LIMIT_PER_DAY}개까지 만들 수 있습니다.`);
  }
  try {
    let body;
    if (method !== 'GET') {
      checkCsrf(request, env, auth.dev);
      body = await readJson(request);
    }
    const params = url.pathname.match(re).groups ?? {};
    const result = await handler({ env, user, now, url, params, body });
    if (quotaApplies) await countCreate(env.DB, limitKey, now);
    return json(method === 'POST' && !params.id ? 201 : 200, result);
  } catch (e) {
    if (e instanceof HttpError) return error(e.status, e.message);
    if (e instanceof ValidationError) return error(400, e.message);
    // Never log request data: it could identify a voter.
    console.error('unhandled', e?.name, e?.message);
    return error(500, '서버 오류가 발생했습니다.');
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
