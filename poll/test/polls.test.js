import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { voterHash } from '../src/crypto.js';
import { WRITE_LIMIT_PER_MINUTE } from '../src/ratelimit.js';
import { DAY, HOUR, NOW, api, createPoll, freshJwks, pollBody } from './helpers.js';

const ALICE = 'alice@wemadeplay.com';
const BOB = 'bob@wemadeplay.com';
const ADMIN = 'jongwoo.park@wemadeplay.com';

beforeEach(async () => {
  freshJwks();
  await env.DB.prepare('DELETE FROM rate_limits').run();
});

describe('voter_hash', () => {
  it('is deterministic, case-insensitive and differs per poll', async () => {
    const a = await voterHash('s', 'poll-1', ALICE);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await voterHash('s', 'poll-1', 'ALICE@wemadeplay.com')).toBe(a);
    expect(await voterHash('s', 'poll-2', ALICE)).not.toBe(a);
    expect(await voterHash('s', 'poll-1', BOB)).not.toBe(a);
    expect(await voterHash('other', 'poll-1', ALICE)).not.toBe(a);
  });
});

describe('creating polls', () => {
  it('creates a poll with defaults', async () => {
    const { title, description, options, closes_at } = pollBody();
    const res = await api(ALICE, 'POST', '/api/polls', { title, description, options, closes_at });
    expect(res.status).toBe(201);
    const detail = await api(BOB, 'GET', `/api/polls/${res.data.id}`);
    expect(detail.data.poll).toMatchObject({ title, multi: false, results_mode: 'live', closed: false });
    expect(detail.data.options.map((o) => o.label)).toEqual(options);
  });

  it('requires 2 to 5 options', async () => {
    expect((await api(ALICE, 'POST', '/api/polls', pollBody({ options: ['하나'] }))).status).toBe(400);
    expect((await api(ALICE, 'POST', '/api/polls', pollBody({ options: ['1', '2', '3', '4', '5', '6'] }))).status).toBe(400);
    expect((await api(ALICE, 'POST', '/api/polls', pollBody({ options: ['1', '2'] }))).status).toBe(201);
    expect((await api(ALICE, 'POST', '/api/polls', pollBody({ options: ['1', '2', '3', '4', '5'] }))).status).toBe(201);
  });

  it('validates lengths and types', async () => {
    const bad = [
      { title: '' },
      { title: 'x'.repeat(101) },
      { title: 123 },
      { description: 'x'.repeat(501) },
      { options: ['a', 'x'.repeat(51)] },
      { options: ['a', ''] },
      { options: ['a', 'a'] },
      { options: 'a,b' },
      { multi: 'yes' },
      { results_mode: 'never' },
      { closes_at: NOW - 1 },
      { closes_at: NOW + 91 * DAY },
      { closes_at: '2026-10-30' },
    ];
    for (const override of bad) {
      expect((await api(ALICE, 'POST', '/api/polls', pollBody(override))).status, JSON.stringify(override)).toBe(400);
    }
    expect((await api(ALICE, 'POST', '/api/polls', pollBody({ title: '가'.repeat(100), closes_at: NOW + 90 * DAY }))).status).toBe(201);
  });
});

describe('voting', () => {
  it('stores one ballot per person and lets them change it', async () => {
    const poll = await createPoll(ALICE);
    expect((await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0]] })).status).toBe(200);
    expect((await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[1]] })).status).toBe(200);
    const detail = await api(BOB, 'GET', `/api/polls/${poll.id}`);
    expect(detail.data.my_choices).toEqual([poll.options[1]]);
    expect(detail.data.results.voters).toBe(1);
    expect(detail.data.results.counts).toEqual({ [poll.options[0]]: 0, [poll.options[1]]: 1, [poll.options[2]]: 0 });
  });

  it('cannot create a duplicate ballot even with a direct insert', async () => {
    const poll = await createPoll(ALICE);
    await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0]] });
    const vh = await voterHash(env.VOTER_SECRET, poll.id, BOB);
    await expect(env.DB.prepare('INSERT INTO ballots (poll_id, voter_hash, updated_at) VALUES (?, ?, ?)').bind(poll.id, vh, NOW).run()).rejects.toThrow(
      /UNIQUE|PRIMARY KEY/,
    );
    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?').bind(poll.id).first();
    expect(rows.n).toBe(1);
  });

  it('rejects two choices when multiple choice is off', async () => {
    const poll = await createPoll(ALICE);
    const res = await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: poll.options.slice(0, 2) });
    expect(res.status).toBe(400);
    expect((await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [] })).status).toBe(400);
  });

  it('accepts 1..all choices when multiple choice is on', async () => {
    const poll = await createPoll(ALICE, { multi: true });
    expect((await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: poll.options })).status).toBe(200);
    expect((await api(ALICE, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0]] })).status).toBe(200);
    expect((await api(ALICE, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [] })).status).toBe(400);
    expect((await api(ALICE, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0], poll.options[0]] })).status).toBe(400);
    const detail = await api(ALICE, 'GET', `/api/polls/${poll.id}`);
    expect(detail.data.results.voters).toBe(2);
    expect(detail.data.results.counts[poll.options[0]]).toBe(2);
  });

  it('rejects options from another poll', async () => {
    const a = await createPoll(ALICE);
    const b = await createPoll(ALICE);
    expect((await api(BOB, 'POST', `/api/polls/${a.id}/ballot`, { option_ids: [b.options[0]] })).status).toBe(400);
  });

  it('rejects voting and changing a vote after the deadline', async () => {
    const poll = await createPoll(ALICE, { closes_at: NOW + HOUR });
    await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0]] });
    const later = { now: NOW + HOUR };
    expect((await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[1]] }, later)).status).toBe(409);
    expect((await api(ALICE, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[1]] }, later)).status).toBe(409);
    const detail = await api(BOB, 'GET', `/api/polls/${poll.id}`, undefined, later);
    expect(detail.data.my_choices).toEqual([poll.options[0]]);
    expect(detail.data.results.voters).toBe(1);
  });
});

describe('results visibility', () => {
  it('shows live results before voting', async () => {
    const poll = await createPoll(ALICE);
    expect((await api(BOB, 'GET', `/api/polls/${poll.id}`)).data.results).toEqual({
      voters: 0,
      counts: Object.fromEntries(poll.options.map((id) => [id, 0])),
    });
  });

  it('hides after_close results until the deadline, even from the creator and admins', async () => {
    const poll = await createPoll(ALICE, { results_mode: 'after_close', closes_at: NOW + HOUR });
    await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[2]] });
    for (const who of [ALICE, BOB, ADMIN]) expect((await api(who, 'GET', `/api/polls/${poll.id}`)).data.results).toBeNull();
    const list = await api(BOB, 'GET', '/api/polls?status=open');
    expect(list.data.items.find((p) => p.id === poll.id).voters).toBeNull();
    const after = await api(BOB, 'GET', `/api/polls/${poll.id}`, undefined, { now: NOW + HOUR });
    expect(after.data.results.voters).toBe(1);
    expect(after.data.results.counts[poll.options[2]]).toBe(1);
  });

  it('never exposes voter identities', async () => {
    const poll = await createPoll(ALICE);
    await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0]] });
    const body = JSON.stringify((await api(ADMIN, 'GET', `/api/polls/${poll.id}`)).data);
    const bobHash = await voterHash(env.VOTER_SECRET, poll.id, BOB);
    expect(body).not.toContain(bobHash);
    expect(body).not.toContain(BOB);
    expect(body).not.toContain('voter_hash');
    expect(body).not.toContain('creator_hash');
  });
});

describe('listing', () => {
  it('includes options with counts only when results are visible', async () => {
    const live = await createPoll(ALICE, { title: 'live-list' });
    const hidden = await createPoll(ALICE, { title: 'hidden-list', results_mode: 'after_close' });
    for (const p of [live, hidden]) await api(BOB, 'POST', `/api/polls/${p.id}/ballot`, { option_ids: [p.options[1]] });
    const { data } = await api(BOB, 'GET', '/api/polls?status=open');
    const l = data.items.find((p) => p.id === live.id);
    const h = data.items.find((p) => p.id === hidden.id);
    expect(l.options).toEqual([
      { id: live.options[0], label: '김치찌개', count: 0 },
      { id: live.options[1], label: '돈까스', count: 1 },
      { id: live.options[2], label: '쌀국수', count: 0 },
    ]);
    expect(l.voters).toBe(1);
    expect(h.options.map((o) => o.count)).toEqual([null, null, null]);
    expect(h.voters).toBeNull();
  });

  it('splits open and closed polls, newest first, 20 per page', async () => {
    const ids = [];
    for (let i = 0; i < 21; i++) {
      const res = await api(ALICE, 'POST', '/api/polls', pollBody({ title: `p${i}` }), { now: NOW + i });
      ids.push(res.data.id);
    }
    const closed = await createPoll(ALICE, { closes_at: NOW + 1000 });
    const later = { now: NOW + 2000 };
    const page1 = await api(BOB, 'GET', '/api/polls?status=open&page=1', undefined, later);
    expect(page1.data.items).toHaveLength(20);
    expect(page1.data.has_more).toBe(true);
    expect(page1.data.items[0].title).toBe('p20');
    const page2 = await api(BOB, 'GET', '/api/polls?status=open&page=2', undefined, later);
    expect(page2.data.items.map((p) => p.id)).toContain(ids[0]);
    const closedList = await api(BOB, 'GET', '/api/polls?status=closed', undefined, later);
    expect(closedList.data.items.map((p) => p.id)).toContain(closed.id);
    expect(page1.data.items.map((p) => p.id)).not.toContain(closed.id);
  });
});

describe('editing and deleting', () => {
  it('lets only the creator or an admin delete, and removes everything', async () => {
    const poll = await createPoll(ALICE);
    await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0]] });
    expect((await api(BOB, 'DELETE', `/api/polls/${poll.id}`, {})).status).toBe(403);
    expect((await api(ALICE, 'DELETE', `/api/polls/${poll.id}`, {})).status).toBe(200);
    expect((await api(ALICE, 'GET', `/api/polls/${poll.id}`)).status).toBe(404);
    for (const table of ['options', 'ballots', 'ballot_choices']) {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE poll_id = ?`).bind(poll.id).first();
      expect(row.n, table).toBe(0);
    }
    const other = await createPoll(BOB);
    expect((await api('izowooi85@gmail.com', 'DELETE', `/api/polls/${other.id}`, {})).status).toBe(200);
  });

  it('lets only the creator or an admin edit', async () => {
    const poll = await createPoll(ALICE);
    expect((await api(BOB, 'PUT', `/api/polls/${poll.id}`, { title: '탈취' })).status).toBe(403);
    expect((await api(ALICE, 'PUT', `/api/polls/${poll.id}`, { title: '수정함' })).status).toBe(200);
    expect((await api(ADMIN, 'PUT', `/api/polls/${poll.id}`, { description: '관리자 수정' })).status).toBe(200);
    const detail = await api(BOB, 'GET', `/api/polls/${poll.id}`);
    expect(detail.data.poll).toMatchObject({ title: '수정함', description: '관리자 수정' });
    expect(detail.data.can_manage).toBe(false);
    expect(detail.data.locked).toBeUndefined();
  });

  it('allows changing options before any vote', async () => {
    const poll = await createPoll(ALICE);
    expect((await api(ALICE, 'PUT', `/api/polls/${poll.id}`, { options: ['가', '나'], multi: true })).status).toBe(200);
    const detail = await api(ALICE, 'GET', `/api/polls/${poll.id}`);
    expect(detail.data.options.map((o) => o.label)).toEqual(['가', '나']);
    expect(detail.data.poll.multi).toBe(true);
  });

  it('rejects changing options or multi after a vote, but allows title/description/deadline', async () => {
    const poll = await createPoll(ALICE);
    await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: [poll.options[0]] });
    expect((await api(ALICE, 'PUT', `/api/polls/${poll.id}`, { options: ['가', '나'] })).status).toBe(409);
    expect((await api(ALICE, 'PUT', `/api/polls/${poll.id}`, { multi: true })).status).toBe(409);
    expect((await api(ADMIN, 'PUT', `/api/polls/${poll.id}`, { results_mode: 'after_close' })).status).toBe(409);
    const ok = await api(ALICE, 'PUT', `/api/polls/${poll.id}`, { title: '새 제목', description: '', closes_at: NOW + 2 * DAY, multi: false });
    expect(ok.status).toBe(200);
    const detail = await api(ALICE, 'GET', `/api/polls/${poll.id}`);
    expect(detail.data).toMatchObject({ locked: true, can_manage: true });
    expect(detail.data.poll).toMatchObject({ title: '새 제목', description: '', closes_at: NOW + 2 * DAY });
    expect(detail.data.options.map((o) => o.id)).toEqual(poll.options);
  });

  it('rejects edits after the deadline', async () => {
    const poll = await createPoll(ALICE, { closes_at: NOW + HOUR });
    expect((await api(ALICE, 'PUT', `/api/polls/${poll.id}`, { closes_at: NOW + 3 * HOUR }, { now: NOW + 2 * HOUR })).status).toBe(409);
  });
});

describe('privacy at rest', () => {
  it('stores no email anywhere in the database', async () => {
    const poll = await createPoll(ALICE, { multi: true });
    await api(BOB, 'POST', `/api/polls/${poll.id}/ballot`, { option_ids: poll.options });
    for (const table of ['polls', 'options', 'ballots', 'ballot_choices', 'rate_limits']) {
      const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
      expect(JSON.stringify(results), table).not.toMatch(/@/);
    }
  });
});

describe('rate limiting', () => {
  it('caps state changes per user per minute without storing the email', async () => {
    const user = 'burst@wemadeplay.com';
    const at = { now: NOW + 30 * DAY };
    const statuses = [];
    for (let i = 0; i < WRITE_LIMIT_PER_MINUTE + 2; i++) {
      statuses.push((await api(user, 'POST', '/api/polls', pollBody({ closes_at: at.now + DAY }), at)).status);
    }
    expect(statuses.slice(0, WRITE_LIMIT_PER_MINUTE).every((s) => s === 201)).toBe(true);
    expect(statuses.slice(WRITE_LIMIT_PER_MINUTE)).toEqual([429, 429]);
    expect((await api('other@wemadeplay.com', 'POST', '/api/polls', pollBody({ closes_at: at.now + DAY }), at)).status).toBe(201);
    expect((await api(user, 'POST', '/api/polls', pollBody({ closes_at: at.now + DAY }), { now: at.now + 60_000 })).status).toBe(201);
    const { results } = await env.DB.prepare('SELECT * FROM rate_limits').all();
    expect(JSON.stringify(results)).not.toMatch(/@/);
  });
});
