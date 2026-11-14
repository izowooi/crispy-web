import { Hono } from "hono";
import { enrichBookmark } from "./meta";
import { USER_ID_SQL, authenticate } from "./session";
import { type AppEnv, DAY, HttpError } from "./util";

type Row = {
  id: string;
  user_id: string;
  url: string | null;
  title: string;
  note: string;
  description: string;
  image: string | null;
  site_name: string;
  favicon: string | null;
  created_at: number;
  read_at: number | null;
  deleted_at: number | null;
};

function domainOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function toBookmark(row: Row) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    note: row.note,
    description: row.description,
    image: row.image,
    siteName: row.site_name,
    favicon: row.favicon,
    domain: domainOf(row.url),
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

const MAX_TITLE = 500;
const MAX_NOTE = 20_000;
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const URL_RE = /https?:\/\/[^\s<>"'`]+/i;

export type SaveInput = { id?: unknown; text?: unknown; url?: unknown; title?: unknown; note?: unknown; createdAt?: unknown };
export type Normalized = { url: string | null; title: string; note: string };

function normalizeUrl(raw: string): string | null {
  // 문장 끝에 붙은 구두점과 짝 없는 닫는 괄호는 URL의 일부가 아니다.
  let s = raw.trim().replace(/[.,;:!?]+$/, "");
  while (s.endsWith(")") && s.split("(").length <= s.split(")").length - 1) s = s.slice(0, -1);
  try {
    const url = new URL(s);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const out = url.toString();
    return out.length <= 2048 ? out : null;
  } catch {
    return null;
  }
}

/** 공유 인텐트의 자유 텍스트("제목 + URL", URL만, 메모만)를 url/title/note로 정리한다. */
export function normalizeInput(input: SaveInput): Normalized {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  let url = str(input.url) ? normalizeUrl(str(input.url)) : null;
  if (str(input.url) && !url) throw new HttpError(400, "올바른 URL이 아닙니다");

  let title = str(input.title).replace(/\s+/g, " ");
  let note = str(input.note);
  const text = str(input.text);

  if (text) {
    let rest = text;
    if (!url) {
      const match = URL_RE.exec(text);
      const found = match && normalizeUrl(match[0]);
      if (match && found) {
        url = found;
        rest = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim();
      }
    }
    // 남은 텍스트가 제목과 같으면(Chrome은 제목을 subject와 본문 양쪽에 넣기도 한다) 중복 저장하지 않는다.
    if (rest && rest.replace(/\s+/g, " ") !== title) {
      if (!title && url && !rest.includes("\n") && rest.length <= 200) title = rest;
      else note = note ? `${note}\n${rest}` : rest;
    }
  }

  if (!url && !note && !title) throw new HttpError(400, "저장할 내용이 없습니다");
  return { url, title: title.slice(0, MAX_TITLE), note: note.slice(0, MAX_NOTE) };
}

const api = new Hono<AppEnv>();

api.get("/me", async (c) => {
  const { user } = await authenticate(c);
  return c.json({ user });
});

api.get("/bookmarks", async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 100);
  const filter = c.req.query("filter") ?? "all";
  const q = (c.req.query("q") ?? "").trim().slice(0, 200);
  const cursor = c.req.query("cursor") ?? "";

  const { results } = await authenticate<Row | { all_count: number; unread: number }>(c, (tokenHash, now) => {
    const where = [`user_id = ${USER_ID_SQL}`, "deleted_at IS NULL"];
    const args: unknown[] = [tokenHash, now];

    if (filter === "unread") where.push("read_at IS NULL");
    else if (filter === "read") where.push("read_at IS NOT NULL");

    if (q) {
      const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      where.push(
        "(title LIKE ? ESCAPE '\\' OR url LIKE ? ESCAPE '\\' OR note LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR site_name LIKE ? ESCAPE '\\')",
      );
      args.push(like, like, like, like, like);
    }

    const sep = cursor.indexOf("_");
    const cursorAt = Number(cursor.slice(0, sep));
    if (sep > 0 && Number.isFinite(cursorAt)) {
      where.push("(created_at, id) < (?, ?)");
      args.push(cursorAt, cursor.slice(sep + 1));
    }

    const db = c.env.DB;
    const stmts = [
      db
        .prepare(`SELECT * FROM bookmarks WHERE ${where.join(" AND ")} ORDER BY created_at DESC, id DESC LIMIT ?`)
        .bind(...args, limit + 1),
    ];
    if (!cursor) {
      stmts.push(
        db
          .prepare(
            `SELECT COUNT(*) AS all_count, COUNT(*) FILTER (WHERE read_at IS NULL) AS unread
               FROM bookmarks WHERE user_id = ${USER_ID_SQL} AND deleted_at IS NULL`,
          )
          .bind(tokenHash, now),
      );
    }
    return stmts;
  });

  const rows = results[0].results as Row[];
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const counts = results[1]?.results[0] as { all_count: number; unread: number } | undefined;

  c.header("Cache-Control", "private, no-store");
  return c.json({
    items: page.map(toBookmark),
    nextCursor: rows.length > limit && last ? `${last.created_at}_${last.id}` : null,
    ...(counts ? { counts: { all: counts.all_count, unread: counts.unread } } : {}),
  });
});

api.post("/bookmarks", async (c) => {
  const { user, now } = await authenticate(c);
  const input = await c.req.json<SaveInput>().catch(() => {
    throw new HttpError(400, "JSON 본문이 필요합니다");
  });
  const { url, title, note } = normalizeInput(input);
  const db = c.env.DB;

  const id = typeof input.id === "string" && ID_RE.test(input.id) ? input.id : crypto.randomUUID();
  // 오프라인 큐에서 늦게 올라온 항목은 공유한 시각을 유지한다(미래 시각/너무 오래된 값은 무시).
  const clientAt = typeof input.createdAt === "number" ? input.createdAt : now;
  const createdAt = clientAt <= now && clientAt > now - 30 * DAY ? Math.floor(clientAt) : now;

  const [byId, byUrl] = await db.batch<Row>([
    db.prepare("SELECT * FROM bookmarks WHERE id = ?").bind(id),
    db.prepare("SELECT * FROM bookmarks WHERE user_id = ? AND url = ? AND deleted_at IS NULL").bind(user.id, url),
  ]);

  // 같은 id 재전송(앱의 재시도)은 멱등 처리한다.
  const sameId = byId.results[0];
  if (sameId) {
    if (sameId.user_id !== user.id) throw new HttpError(409, "id가 충돌합니다");
    return c.json({ item: toBookmark(sameId), duplicate: false });
  }

  // 이미 저장한 URL을 다시 공유하면 새로 만들지 않고 맨 위·안읽음으로 되돌린다.
  const sameUrl = url ? byUrl.results[0] : undefined;
  if (sameUrl) {
    const bumped = await db
      .prepare(
        `UPDATE bookmarks SET created_at = ?, read_at = NULL,
           note = CASE WHEN ? = '' OR note = ? THEN note WHEN note = '' THEN ? ELSE note || char(10) || ? END
         WHERE id = ? RETURNING *`,
      )
      .bind(createdAt, note, note, note, note, sameUrl.id)
      .first<Row>();
    return c.json({ item: toBookmark(bumped ?? sameUrl), duplicate: true });
  }

  let row: Row | null;
  try {
    row = await db
      .prepare("INSERT INTO bookmarks (id, user_id, url, title, note, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *")
      .bind(id, user.id, url, title, note, createdAt)
      .first<Row>();
  } catch (err) {
    // 동시 요청이 먼저 넣은 경우: 이미 있는 행을 돌려준다.
    row = await db
      .prepare("SELECT * FROM bookmarks WHERE id = ? OR (user_id = ? AND url = ? AND deleted_at IS NULL) LIMIT 1")
      .bind(id, user.id, url)
      .first<Row>();
    if (!row || row.user_id !== user.id) throw err;
    return c.json({ item: toBookmark(row), duplicate: true });
  }

  if (url) c.executionCtx.waitUntil(enrichBookmark(c.env, id, url));
  return c.json({ item: toBookmark(row!), duplicate: false }, 201);
});

api.patch("/bookmarks/:id", async (c) => {
  const { user, now } = await authenticate(c);
  const body = await c.req.json<{ read?: unknown; title?: unknown; note?: unknown }>().catch(() => {
    throw new HttpError(400, "JSON 본문이 필요합니다");
  });

  const sets: string[] = [];
  const args: unknown[] = [];
  if (typeof body.read === "boolean") {
    // 이미 읽은 항목의 읽은 시각은 유지한다.
    sets.push(body.read ? "read_at = COALESCE(read_at, ?)" : "read_at = NULL");
    if (body.read) args.push(now);
  }
  if (typeof body.title === "string") {
    sets.push("title = ?");
    args.push(body.title.trim().slice(0, MAX_TITLE));
  }
  if (typeof body.note === "string") {
    sets.push("note = ?");
    args.push(body.note.trim().slice(0, MAX_NOTE));
  }
  if (!sets.length) throw new HttpError(400, "변경할 내용이 없습니다");

  const row = await c.env.DB.prepare(
    `UPDATE bookmarks SET ${sets.join(", ")} WHERE id = ? AND user_id = ? AND deleted_at IS NULL RETURNING *`,
  )
    .bind(...args, c.req.param("id"), user.id)
    .first<Row>();
  if (!row) throw new HttpError(404, "북마크를 찾을 수 없습니다");
  return c.json({ item: toBookmark(row) });
});

api.delete("/bookmarks/:id", async (c) => {
  const { user, now } = await authenticate(c);
  // 실행취소를 위해 soft delete. 실제 삭제는 cron이 30일 뒤에 한다. 이미 삭제된 항목도 204(멱등).
  const res = await c.env.DB.prepare("UPDATE bookmarks SET deleted_at = COALESCE(deleted_at, ?) WHERE id = ? AND user_id = ?")
    .bind(now, c.req.param("id"), user.id)
    .run();
  if (!res.meta.changes) throw new HttpError(404, "북마크를 찾을 수 없습니다");
  return c.body(null, 204);
});

api.post("/bookmarks/:id/restore", async (c) => {
  const { user } = await authenticate(c);
  let row: Row | null;
  try {
    row = await c.env.DB.prepare("UPDATE bookmarks SET deleted_at = NULL WHERE id = ? AND user_id = ? RETURNING *")
      .bind(c.req.param("id"), user.id)
      .first<Row>();
  } catch {
    throw new HttpError(409, "같은 링크가 이미 다시 저장되어 있습니다");
  }
  if (!row) throw new HttpError(404, "북마크를 찾을 수 없습니다");
  return c.json({ item: toBookmark(row) });
});

export default api;
