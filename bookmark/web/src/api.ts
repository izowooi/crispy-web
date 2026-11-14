export type Bookmark = {
  id: string;
  url: string | null;
  title: string;
  note: string;
  description: string;
  image: string | null;
  siteName: string;
  favicon: string | null;
  domain: string;
  createdAt: number;
  readAt: number | null;
};

export type User = { id: string; email: string; name: string; picture: string };
export type Filter = "unread" | "read" | "all";
export type Counts = { all: number; unread: number };
export type Page = { items: Bookmark[]; nextCursor: string | null; counts?: Counts };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

declare global {
  interface Window {
    __zkPre?: Record<string, Promise<Response> | undefined>;
  }
}

/** index.html이 JS 번들보다 먼저 시작해 둔 요청이 있으면 그것을 한 번만 재사용한다. */
function takePreloaded(path: string): Promise<Response> | undefined {
  const pre = window.__zkPre;
  const p = pre?.[path];
  if (p && pre) pre[path] = undefined;
  return p;
}

async function send<T>(path: string, method: string, json?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await ((method === "GET" && takePreloaded(path)) ||
      fetch(path, {
        method,
        credentials: "same-origin",
        headers: json !== undefined ? { "content-type": "application/json", accept: "application/json" } : { accept: "application/json" },
        body: json !== undefined ? JSON.stringify(json) : undefined,
      }));
  } catch {
    throw new ApiError(0, "네트워크에 연결할 수 없어요");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error || `요청 실패 (${res.status})`);
  return data as T;
}

// 같은 GET이 겹치면(StrictMode 이중 effect, 탭 복귀 재검증 등) 요청 하나를 공유한다.
const inflight = new Map<string, Promise<unknown>>();

function get<T>(path: string): Promise<T> {
  let p = inflight.get(path) as Promise<T> | undefined;
  if (!p) {
    p = send<T>(path, "GET").finally(() => inflight.delete(path));
    inflight.set(path, p);
  }
  return p;
}

/** 프리로드 URL과 정확히 같은 문자열이 나오도록 빈 파라미터는 생략하고 순서를 고정한다. */
export function listPath(filter: Filter, q: string, cursor: string | null): string {
  const p = new URLSearchParams({ limit: "50" });
  if (cursor) p.set("cursor", cursor);
  if (q) p.set("q", q);
  p.set("filter", filter);
  return `/api/bookmarks?${p}`;
}

const itemPath = (id: string) => `/api/bookmarks/${encodeURIComponent(id)}`;

export const api = {
  me: () => get<{ user: User }>("/api/me"),
  list: (filter: Filter, q: string, cursor: string | null) => get<Page>(listPath(filter, q, cursor)),
  add: (body: { id: string; text: string }) => send<{ item: Bookmark; duplicate: boolean }>("/api/bookmarks", "POST", body),
  setRead: (id: string, read: boolean) => send<{ item: Bookmark }>(itemPath(id), "PATCH", { read }),
  remove: (id: string) => send<void>(itemPath(id), "DELETE"),
  restore: (id: string) => send<{ item: Bookmark }>(`${itemPath(id)}/restore`, "POST"),
  logout: () => send<void>("/auth/logout", "POST"),
};

export const isUnauthorized = (err: unknown) => err instanceof ApiError && err.status === 401;
export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : "알 수 없는 오류");
