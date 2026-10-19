import { creatorHash, randomId, voterHash } from './crypto.js';
import { ValidationError, parseBallot, parseCreate, parseUpdate } from './validate.js';

export const PAGE_SIZE = 20;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const resultsVisible = (poll, now) => poll.results_mode === 'live' || poll.closes_at <= now;

async function loadPoll(db, id) {
  const poll = await db.prepare('SELECT * FROM polls WHERE id = ?').bind(id).first();
  if (!poll) throw new HttpError(404, '질문을 찾을 수 없습니다.');
  return poll;
}

async function canManage(env, user, poll) {
  if (user.admin) return true;
  return (await creatorHash(env.VOTER_SECRET, poll.id, user.email)) === poll.creator_hash;
}

async function voterCount(db, pollId) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?').bind(pollId).first();
  return row.n;
}

const publicPoll = (p, now) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  multi: p.multi === 1,
  results_mode: p.results_mode,
  closes_at: p.closes_at,
  created_at: p.created_at,
  closed: p.closes_at <= now,
});

async function optionsWithCounts(db, pollIds) {
  const byPoll = new Map();
  if (pollIds.length === 0) return byPoll;
  const marks = pollIds.map(() => '?').join(', ');
  const { results } = await db
    .prepare(
      `SELECT o.poll_id, o.id, o.label, COUNT(c.option_id) AS count
       FROM options o LEFT JOIN ballot_choices c ON c.poll_id = o.poll_id AND c.option_id = o.id
       WHERE o.poll_id IN (${marks}) GROUP BY o.id ORDER BY o.poll_id, o.position`,
    )
    .bind(...pollIds)
    .all();
  for (const { poll_id, ...option } of results) {
    if (!byPoll.has(poll_id)) byPoll.set(poll_id, []);
    byPoll.get(poll_id).push(option);
  }
  return byPoll;
}

export async function listPolls({ env, now, url }) {
  const status = url.searchParams.get('status') === 'closed' ? 'closed' : 'open';
  const page = Math.min(Math.max(Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1, 1), 1000);
  const where = status === 'open' ? 'p.closes_at > ?1' : 'p.closes_at <= ?1';
  const { results } = await env.DB.prepare(
    `SELECT p.*, (SELECT COUNT(*) FROM ballots b WHERE b.poll_id = p.id) AS voters
     FROM polls p WHERE ${where} ORDER BY p.created_at DESC, p.id DESC LIMIT ?2 OFFSET ?3`,
  )
    .bind(now, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE)
    .all();
  const rows = results.slice(0, PAGE_SIZE);
  const byPoll = await optionsWithCounts(env.DB, rows.map((r) => r.id));
  const items = rows.map((row) => {
    const visible = resultsVisible(row, now);
    return {
      ...publicPoll(row, now),
      voters: visible ? row.voters : null,
      options: (byPoll.get(row.id) ?? []).map((o) => ({ ...o, count: visible ? o.count : null })),
    };
  });
  return { status, page, has_more: results.length > PAGE_SIZE, items };
}

export async function createPoll({ env, user, now, body }) {
  const input = parseCreate(body, now);
  const id = randomId();
  const stmts = [
    env.DB.prepare(
      'INSERT INTO polls (id, title, description, multi, results_mode, closes_at, created_at, creator_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, input.title, input.description, input.multi ? 1 : 0, input.resultsMode, input.closesAt, now, await creatorHash(env.VOTER_SECRET, id, user.email)),
    ...input.options.map((label, i) =>
      env.DB.prepare('INSERT INTO options (id, poll_id, label, position) VALUES (?, ?, ?, ?)').bind(randomId(), id, label, i),
    ),
  ];
  await env.DB.batch(stmts);
  return { id };
}

export async function getPoll({ env, user, now, params }) {
  const poll = await loadPoll(env.DB, params.id);
  const vh = await voterHash(env.VOTER_SECRET, poll.id, user.email);
  const [opts, mine, counts, voters] = await Promise.all([
    env.DB.prepare('SELECT id, label FROM options WHERE poll_id = ? ORDER BY position').bind(poll.id).all(),
    env.DB.prepare('SELECT option_id FROM ballot_choices WHERE poll_id = ? AND voter_hash = ?').bind(poll.id, vh).all(),
    env.DB.prepare('SELECT option_id, COUNT(*) AS n FROM ballot_choices WHERE poll_id = ? GROUP BY option_id').bind(poll.id).all(),
    voterCount(env.DB, poll.id),
  ]);
  const manage = await canManage(env, user, poll);
  const out = {
    poll: publicPoll(poll, now),
    options: opts.results,
    my_choices: mine.results.map((r) => r.option_id),
    can_manage: manage,
    results: null,
  };
  // Aggregates only; individual ballots never leave the database.
  if (resultsVisible(poll, now)) {
    out.results = { voters, counts: Object.fromEntries(opts.results.map((o) => [o.id, 0])) };
    for (const r of counts.results) out.results.counts[r.option_id] = r.n;
  }
  if (manage) out.locked = voters > 0;
  return out;
}

export async function castBallot({ env, user, now, params, body }) {
  const optionIds = parseBallot(body);
  const poll = await loadPoll(env.DB, params.id);
  if (poll.closes_at <= now) throw new HttpError(409, '마감된 질문입니다.');
  const { results: opts } = await env.DB.prepare('SELECT id FROM options WHERE poll_id = ?').bind(poll.id).all();
  const valid = new Set(opts.map((o) => o.id));
  if (!optionIds.every((id) => valid.has(id))) throw new ValidationError('선택한 항목이 올바르지 않습니다.');
  if (poll.multi ? optionIds.length < 1 : optionIds.length !== 1) {
    throw new ValidationError(poll.multi ? '1개 이상 선택하세요.' : '1개만 선택할 수 있습니다.');
  }
  const vh = await voterHash(env.VOTER_SECRET, poll.id, user.email);
  // Every statement re-checks that the poll is still open, so a ballot can't slip in after the deadline
  // between the check above and the batch. The batch is one transaction.
  const open = 'EXISTS (SELECT 1 FROM polls WHERE id = ?1 AND closes_at > ?3)';
  const results = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ballots (poll_id, voter_hash, updated_at) SELECT ?1, ?2, ?3 WHERE ${open}
       ON CONFLICT (poll_id, voter_hash) DO UPDATE SET updated_at = excluded.updated_at`,
    ).bind(poll.id, vh, now),
    env.DB.prepare(`DELETE FROM ballot_choices WHERE poll_id = ?1 AND voter_hash = ?2 AND ${open}`).bind(poll.id, vh, now),
    ...optionIds.map((oid) =>
      env.DB.prepare(
        `INSERT INTO ballot_choices (poll_id, voter_hash, option_id)
         SELECT ?1, ?2, id FROM options WHERE id = ?4 AND poll_id = ?1 AND ${open}`,
      ).bind(poll.id, vh, now, oid),
    ),
  ]);
  if (results[0].meta.changes !== 1) throw new HttpError(409, '마감된 질문입니다.');
  return { ok: true, my_choices: optionIds };
}

export async function updatePoll({ env, user, now, params, body }) {
  const poll = await loadPoll(env.DB, params.id);
  if (!(await canManage(env, user, poll))) throw new HttpError(403, '수정 권한이 없습니다.');
  if (poll.closes_at <= now) throw new HttpError(409, '마감된 질문은 수정할 수 없습니다.');
  const input = parseUpdate(body, now);
  const structural =
    input.options !== undefined ||
    (input.multi !== undefined && input.multi !== (poll.multi === 1)) ||
    (input.resultsMode !== undefined && input.resultsMode !== poll.results_mode);
  if (structural && (await voterCount(env.DB, poll.id)) > 0) {
    throw new HttpError(409, '투표가 시작된 질문은 선택지·복수 선택·결과 공개 방식을 바꿀 수 없습니다.');
  }
  const next = {
    title: input.title ?? poll.title,
    description: input.description ?? poll.description,
    closesAt: input.closesAt ?? poll.closes_at,
    multi: input.multi === undefined ? poll.multi : input.multi ? 1 : 0,
    resultsMode: input.resultsMode ?? poll.results_mode,
  };
  const stmts = [
    env.DB.prepare('UPDATE polls SET title = ?, description = ?, closes_at = ?, multi = ?, results_mode = ? WHERE id = ?').bind(
      next.title,
      next.description,
      next.closesAt,
      next.multi,
      next.resultsMode,
      poll.id,
    ),
  ];
  if (input.options) {
    // Guarded so a ballot cast concurrently keeps its options intact.
    const noVotes = 'NOT EXISTS (SELECT 1 FROM ballots WHERE poll_id = ?1)';
    stmts.push(env.DB.prepare(`DELETE FROM options WHERE poll_id = ?1 AND ${noVotes}`).bind(poll.id));
    input.options.forEach((label, i) =>
      stmts.push(
        env.DB.prepare(`INSERT INTO options (id, poll_id, label, position) SELECT ?2, ?1, ?3, ?4 WHERE ${noVotes}`).bind(poll.id, randomId(), label, i),
      ),
    );
  }
  await env.DB.batch(stmts);
  return { ok: true };
}

export async function deletePoll({ env, user, params }) {
  const poll = await loadPoll(env.DB, params.id);
  if (!(await canManage(env, user, poll))) throw new HttpError(403, '삭제 권한이 없습니다.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM ballot_choices WHERE poll_id = ?').bind(poll.id),
    env.DB.prepare('DELETE FROM ballots WHERE poll_id = ?').bind(poll.id),
    env.DB.prepare('DELETE FROM options WHERE poll_id = ?').bind(poll.id),
    env.DB.prepare('DELETE FROM polls WHERE id = ?').bind(poll.id),
  ]);
  return { ok: true };
}
