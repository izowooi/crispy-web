import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage, isUnauthorized, type Bookmark, type Counts, type Filter, type Page, type User } from "./api";
import { BookmarkRow } from "./BookmarkRow";
import { cache } from "./cache";
import { domainOf } from "./format";
import { BookmarkMark, KeyboardIcon, PlusIcon, SearchIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

type ListState = { key: string; items: Bookmark[]; nextCursor: string | null };
type Status = "loading" | "ready" | "error";
type Toast = { id: number; text: string; tone: "info" | "error"; action?: { label: string; run: () => void } };
type View = { filter: Filter; q: string };

const URL_RE = /https?:\/\/[^\s<>"'`]+/i;
const viewKey = (v: View) => `${v.filter}|${v.q}`;
const belongs = (b: Bookmark, v: View) => v.filter === "all" || (v.filter === "unread") === (b.readAt === null);
const isOlder = (a: Bookmark, b: Bookmark) => a.createdAt < b.createdAt || (a.createdAt === b.createdAt && a.id < b.id);
const byNewest = (a: Bookmark, b: Bookmark) => (isOlder(a, b) ? 1 : isOlder(b, a) ? -1 : 0);
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function upsertSorted(items: Bookmark[], item: Bookmark): Bookmark[] {
  const rest = items.filter((x) => x.id !== item.id);
  const at = rest.findIndex((x) => isOlder(x, item));
  return at < 0 ? [...rest, item] : [...rest.slice(0, at), item, ...rest.slice(at)];
}

/** 새 첫 페이지로 머리를 갈아끼우되, 이미 더 불러온 뒷부분과 저장 중인 항목은 유지한다. */
function mergeHead(prev: ListState | null, page: Page, keep: (b: Bookmark) => boolean): Omit<ListState, "key"> {
  const fresh = page.items;
  if (!prev) return { items: fresh, nextCursor: page.nextCursor };
  const ids = new Set(fresh.map((b) => b.id));
  const last = fresh[fresh.length - 1];
  // 이전 목록에 새 첫 페이지의 마지막 항목이 있어야 그 뒤 꼬리가 끊김 없이 이어진다고 볼 수 있다.
  const contiguous = !!last && prev.items.some((b) => b.id === last.id);
  const tail = page.nextCursor && last && contiguous ? prev.items.filter((b) => !ids.has(b.id) && isOlder(b, last)) : [];
  const pending = prev.items.filter((b) => !ids.has(b.id) && keep(b) && !tail.includes(b));
  return {
    items: [...fresh, ...tail, ...pending].sort(byNewest),
    nextCursor: tail.length ? prev.nextCursor : page.nextCursor,
  };
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "unread", label: "안읽음" },
  { id: "read", label: "읽음" },
  { id: "all", label: "전체" },
];

export function Inbox({ user, onUnauthorized }: { user: User; onUnauthorized: () => void }) {
  const [filter, setFilter] = useState<Filter>("unread");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<ListState>(() => {
    const cached = cache.page(user.id, "unread");
    return { key: "unread|", items: cached?.items ?? [], nextCursor: cached?.nextCursor ?? null };
  });
  const [counts, setCounts] = useState<Counts | null>(() => cache.page(user.id, "unread")?.counts ?? null);
  const [status, setStatus] = useState<Status>(() => (cache.page(user.id, "unread") ? "ready" : "loading"));
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const view: View = { filter, q };
  const viewRef = useRef(view);
  viewRef.current = view;
  const listRef = useRef(list);
  listRef.current = list;
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const savingRef = useRef(saving);
  savingRef.current = saving;

  // 낙관적으로 목록에서 뺀 항목. 요청이 끝나기 전에 도착한 응답이 되살리지 않도록 걸러낸다.
  const hidden = useRef(new Set<string>());
  // 같은 항목에 대한 변경(삭제 → 복원 등)은 서버에 보낸 순서대로 처리되게 묶는다.
  const chains = useRef(new Map<string, Promise<unknown>>());
  const undoRef = useRef<(() => void) | null>(null);
  const reqSeq = useRef(0);
  const lastFetchAt = useRef(0);
  const scrollToSelection = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const toastSeq = useRef(0);

  const showToast = useCallback((text: string, tone: Toast["tone"] = "info", action?: Toast["action"]) => {
    setToast({ id: ++toastSeq.current, text, tone, action });
  }, []);

  const fail = useCallback(
    (err: unknown, text: string) => {
      if (isUnauthorized(err)) return onUnauthorized();
      showToast(`${text} · ${errorMessage(err)}`, "error");
    },
    [onUnauthorized, showToast],
  );

  const chain = (id: string, run: () => Promise<unknown>) => {
    const p = (chains.current.get(id) ?? Promise.resolve()).catch(() => {}).then(run);
    chains.current.set(id, p);
    return p;
  };

  const bumpCounts = (all: number, unread: number) =>
    setCounts((c) => (c ? { all: Math.max(0, c.all + all), unread: Math.max(0, c.unread + unread) } : c));

  const applyCounts = (c: Counts | undefined) => {
    if (c) setCounts(c);
  };

  /* ---------- 목록 로딩 ---------- */

  const loadFirst = useCallback(async () => {
    const seq = ++reqSeq.current;
    const v = viewRef.current;
    const key = viewKey(v);
    setBusy(true);
    try {
      const page = await api.list(v.filter, v.q, null);
      if (seq !== reqSeq.current) return;
      lastFetchAt.current = Date.now();
      setNow(Date.now());
      const visible = { ...page, items: page.items.filter((b) => !hidden.current.has(b.id)) };
      setList((prev) => ({ key, ...mergeHead(prev.key === key ? prev : null, visible, (b) => savingRef.current.has(b.id)) }));
      applyCounts(page.counts);
      setStatus("ready");
    } catch (err) {
      if (seq !== reqSeq.current) return;
      if (isUnauthorized(err)) return onUnauthorized();
      if (listRef.current.key === key && listRef.current.items.length) {
        showToast(`새로고침하지 못했어요 · ${errorMessage(err)}`, "error");
        setStatus("ready");
      } else {
        setErrorText(errorMessage(err));
        setStatus("error");
      }
    } finally {
      if (seq === reqSeq.current) setBusy(false);
    }
  }, [onUnauthorized, showToast]);

  useEffect(() => {
    const key = viewKey({ filter, q });
    if (listRef.current.key !== key) {
      const cached = q ? null : cache.page(user.id, filter);
      if (cached) {
        setList({ key, items: cached.items, nextCursor: cached.nextCursor });
        applyCounts(cached.counts);
        setStatus("ready");
      } else if (!q) {
        setList({ key, items: [], nextCursor: null });
        setStatus("loading");
      }
      // 검색어가 바뀌는 동안에는 이전 결과를 그대로 보여 주다가 새 결과로 바꾼다.
    }
    void loadFirst();
  }, [filter, q, user.id, loadFirst]);

  useEffect(() => {
    const t = setTimeout(() => setQ(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // 검색 결과는 캐시하지 않는다. 키가 현재 보기와 같을 때만 저장해 탭 전환 중 섞이지 않게 한다.
  useEffect(() => {
    if (status !== "ready" || q || list.key !== viewKey({ filter, q })) return;
    const t = setTimeout(() => {
      const items = list.items.filter((b) => !savingRef.current.has(b.id));
      cache.setPage(user.id, filter, {
        items: items.slice(0, 100),
        nextCursor: items.length <= 100 ? list.nextCursor : null,
        counts: counts ?? undefined,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [list, counts, status, filter, q, user.id]);

  const loadMore = useCallback(async () => {
    const cur = listRef.current;
    const v = viewRef.current;
    if (!cur.nextCursor || cur.key !== viewKey(v)) return;
    const cursor = cur.nextCursor;
    setLoadingMore(true);
    try {
      const page = await api.list(v.filter, v.q, cursor);
      setList((prev) => {
        if (prev.key !== cur.key || prev.nextCursor !== cursor) return prev;
        const ids = new Set(prev.items.map((b) => b.id));
        const more = page.items.filter((b) => !ids.has(b.id) && !hidden.current.has(b.id));
        return { ...prev, items: [...prev.items, ...more], nextCursor: page.nextCursor };
      });
    } catch (err) {
      fail(err, "더 불러오지 못했어요");
    } finally {
      setLoadingMore(false);
    }
  }, [fail]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !list.nextCursor || loadingMore || status !== "ready") return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), {
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [list.nextCursor, loadingMore, status, loadMore]);

  // 태블릿에서 새로 공유한 항목이 탭으로 돌아왔을 때 바로 보이게 한다.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      if (Date.now() - lastFetchAt.current > 30_000) void loadFirst();
    };
    document.addEventListener("visibilitychange", onVisible);
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(tick);
    };
  }, [loadFirst]);

  useEffect(() => {
    document.title = counts && counts.unread > 0 ? `(${counts.unread}) ZKeep` : "ZKeep";
  }, [counts]);

  /* ---------- 목록 조작 ---------- */

  const upsert = (item: Bookmark) => {
    hidden.current.delete(item.id);
    setLeaving((s) => {
      if (!s.has(item.id)) return s;
      const n = new Set(s);
      n.delete(item.id);
      return n;
    });
    setList((prev) => ({ ...prev, items: upsertSorted(prev.items, item) }));
  };

  const patch = (item: Bookmark) =>
    setList((prev) =>
      prev.items.some((x) => x.id === item.id) ? { ...prev, items: prev.items.map((x) => (x.id === item.id ? item : x)) } : prev,
    );

  const removeNow = (id: string) => setList((prev) => ({ ...prev, items: prev.items.filter((x) => x.id !== id) }));

  const visibleItems = () => listRef.current.items.filter((b) => !leavingRef.current.has(b.id));

  const dropFromList = (id: string) => {
    const vis = visibleItems();
    const i = vis.findIndex((b) => b.id === id);
    setSelectedId((sel) => (sel === id ? (vis[i + 1]?.id ?? vis[i - 1]?.id ?? null) : sel));
    hidden.current.add(id);
    setLeaving((s) => new Set(s).add(id));
    setTimeout(
      () => {
        // 그 사이 실행취소로 되살아났으면 지우지 않는다.
        if (!leavingRef.current.has(id)) return;
        removeNow(id);
        setLeaving((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      },
      reduceMotion() ? 0 : 210,
    );
  };

  const setUndo = (text: string, undo: () => void) => {
    let used = false;
    const run = () => {
      if (used) return;
      used = true;
      if (undoRef.current === run) undoRef.current = null;
      setToast(null);
      undo();
    };
    undoRef.current = run;
    showToast(text, "info", { label: "실행취소", run });
  };

  const toggleRead = (b: Bookmark, isUndo = false) => {
    const read = b.readAt === null;
    const updated: Bookmark = { ...b, readAt: read ? Date.now() : null };
    const v = viewRef.current;
    const stays = belongs(updated, v);
    if (stays) {
      upsert(updated);
      if (isUndo) setSelectedId(b.id);
      else {
        // 전체 탭에서도 처리한 뒤에는 다음 항목으로 넘어가 연속으로 정리할 수 있게 한다.
        const vis = visibleItems();
        const next = vis[vis.findIndex((x) => x.id === b.id) + 1];
        if (next) setSelectedId((sel) => (sel === b.id ? next.id : sel));
      }
    } else dropFromList(b.id);
    bumpCounts(0, read ? -1 : 1);

    const p = chain(b.id, () => api.setRead(b.id, read));
    p.then((res) => {
      // 그 뒤에 같은 항목에 대한 변경(실행취소 등)이 있었다면 그쪽 결과를 따른다.
      if (chains.current.get(b.id) !== p) return;
      if (!stays) hidden.current.delete(b.id);
      else patch((res as { item: Bookmark }).item);
    }).catch((err: unknown) => {
      if (chains.current.get(b.id) !== p) return;
        hidden.current.delete(b.id);
        if (belongs(b, viewRef.current)) upsert(b);
        else removeNow(b.id);
        bumpCounts(0, read ? 1 : -1);
        fail(err, read ? "읽음 처리하지 못했어요" : "안읽음으로 되돌리지 못했어요");
      });

    if (!isUndo) setUndo(read ? "읽음 처리됨" : "안읽음으로 표시됨", () => toggleRead(updated, true));
  };

  const restore = (b: Bookmark) => {
    if (belongs(b, viewRef.current)) {
      upsert(b);
      setSelectedId(b.id);
    } else hidden.current.delete(b.id);
    bumpCounts(1, b.readAt === null ? 1 : 0);
    chain(b.id, () => api.restore(b.id))
      .then((res) => patch((res as { item: Bookmark }).item))
      .catch((err: unknown) => {
        removeNow(b.id);
        bumpCounts(-1, b.readAt === null ? -1 : 0);
        fail(err, "되살리지 못했어요");
      });
  };

  const remove = (b: Bookmark) => {
    dropFromList(b.id);
    bumpCounts(-1, b.readAt === null ? -1 : 0);
    chain(b.id, () => api.remove(b.id))
      .then(() => {
        // 삭제가 확정된 뒤에도 hidden에 남겨 둬서, 그 전에 시작된 목록 응답이 되살리지 않게 한다.
      })
      .catch((err: unknown) => {
        hidden.current.delete(b.id);
        if (belongs(b, viewRef.current)) upsert(b);
        bumpCounts(1, b.readAt === null ? 1 : 0);
        fail(err, "삭제하지 못했어요");
      });
    setUndo("삭제됨", () => restore(b));
  };

  const copy = async (b: Bookmark) => {
    if (!b.url) return;
    try {
      await navigator.clipboard.writeText(b.url);
      showToast("링크를 복사했어요");
    } catch {
      showToast("클립보드에 복사하지 못했어요", "error");
    }
  };

  const open = (b: Bookmark | undefined) => {
    if (b?.url) window.open(b.url, "_blank", "noopener,noreferrer");
  };

  // 저장 직후에는 제목·이미지가 비어 있다. 서버가 메타데이터를 채운 뒤 조용히 반영한다.
  const refreshFields = useCallback(async () => {
    const v = viewRef.current;
    const key = viewKey(v);
    try {
      const page = await api.list(v.filter, v.q, null);
      const fresh = new Map(page.items.map((b) => [b.id, b]));
      setList((prev) => (prev.key !== key ? prev : { ...prev, items: prev.items.map((x) => fresh.get(x.id) ?? x) }));
      applyCounts(page.counts);
    } catch {
      // 다음 재검증 때 다시 시도된다.
    }
  }, []);

  const add = async (text: string): Promise<boolean> => {
    const t = text.trim();
    if (!t) return false;
    const id = crypto.randomUUID();
    const url = URL_RE.exec(t)?.[0] ?? null;
    const temp: Bookmark = {
      id,
      url,
      title: "",
      note: url ? t.replace(url, "").trim() : t,
      description: "",
      image: null,
      siteName: "",
      favicon: null,
      domain: url ? domainOf(url) : "",
      createdAt: Date.now(),
      readAt: null,
    };
    const v = viewRef.current;
    const show = !v.q && v.filter !== "read";
    setSaving((s) => new Set(s).add(id));
    if (show) upsert(temp);
    bumpCounts(1, 1);

    const done = () =>
      setSaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    try {
      const { item, duplicate } = await api.add({ id, text: t });
      done();
      // 서버가 보낸 id를 쓰지 않더라도 임시 행이 남지 않도록 항상 교체한다.
      removeNow(id);
      if (show) upsert(item);
      if (duplicate) {
        bumpCounts(-1, -1);
        showToast("이미 저장한 링크라 맨 위로 올렸어요");
      }
      if (item.url) {
        setTimeout(() => void refreshFields(), 2500);
        setTimeout(() => void refreshFields(), 8000);
      }
      if (duplicate) void refreshFields();
      return true;
    } catch (err) {
      done();
      removeNow(id);
      bumpCounts(-1, -1);
      fail(err, "저장하지 못했어요");
      return false;
    }
  };
  const addRef = useRef(add);
  addRef.current = add;

  // 행 컴포넌트 memo가 유지되도록 안정된 콜백으로 감싼다.
  const actionsRef = useRef({ toggleRead, remove, copy });
  actionsRef.current = { toggleRead, remove, copy };
  const onToggleRead = useCallback((b: Bookmark) => actionsRef.current.toggleRead(b), []);
  const onDelete = useCallback((b: Bookmark) => actionsRef.current.remove(b), []);
  const onCopy = useCallback((b: Bookmark) => void actionsRef.current.copy(b), []);

  /* ---------- 키보드 ---------- */

  const move = (delta: number) => {
    const vis = visibleItems();
    if (!vis.length) return;
    const i = vis.findIndex((b) => b.id === selectedId);
    const next = i < 0 ? (delta > 0 ? 0 : vis.length - 1) : Math.min(vis.length - 1, Math.max(0, i + delta));
    scrollToSelection.current = true;
    setSelectedId(vis[next]!.id);
  };

  useEffect(() => {
    if (!scrollToSelection.current || !selectedId) return;
    scrollToSelection.current = false;
    document.getElementById(`bm-${selectedId}`)?.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
  }, [selectedId]);

  const keyHandler = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : document.body;
    if (target.closest("input, textarea, select, [contenteditable='true']")) {
      if (e.key === "Escape") (target as HTMLInputElement).blur();
      return;
    }
    if (helpOpen) {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        setHelpOpen(false);
      }
      return;
    }
    const sel = visibleItems().find((b) => b.id === selectedId);
    // 한글 자판 상태에서도 동작하도록 글자 단축키는 물리 키(e.code)로 판별한다.
    const code = e.code;
    if (e.key === "?") setHelpOpen(true);
    else if (e.key === "/") searchRef.current?.focus();
    else if (e.key === "ArrowDown" || code === "KeyJ") move(1);
    else if (e.key === "ArrowUp" || code === "KeyK") move(-1);
    else if (code === "KeyO" || (e.key === "Enter" && !target.closest("a, button"))) open(sel);
    else if (code === "KeyE") sel && toggleRead(sel);
    else if (e.key === "#" || code === "KeyD" || e.key === "Delete") sel && remove(sel);
    else if (code === "KeyZ") undoRef.current?.();
    else if (code === "KeyC") sel && void copy(sel);
    else if (e.key === "Escape") setSelectedId(null);
    else return;
    e.preventDefault();
  };
  const keyRef = useRef(keyHandler);
  keyRef.current = keyHandler;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    // 입력창 밖에서 URL을 붙여넣으면 바로 저장한다.
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof Element && e.target.closest("input, textarea, [contenteditable='true']")) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (!URL_RE.test(text)) return;
      e.preventDefault();
      void addRef.current(text);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.action ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------- 렌더 ---------- */

  const items = list.items;
  const showSkeleton = status === "loading" && items.length === 0;
  const changeFilter = (f: Filter) => {
    if (f === filter) return;
    setSelectedId(null);
    setFilter(f);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-dvh bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/85">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <a href="/" className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-indigo-500" aria-label="ZKeep 홈">
            <BookmarkMark className="size-7" />
            <span className="hidden text-[17px] font-bold tracking-tight sm:inline">ZKeep</span>
          </a>
          <label className="relative ml-1 min-w-0 flex-1">
            <span className="sr-only">검색</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색"
              enterKeyHint="search"
              className="h-9 w-full rounded-lg border border-transparent bg-gray-100 pr-14 pl-9 text-sm placeholder:text-gray-500 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
            />
            {busy && q ? (
              <span className="absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" aria-label="검색 중" />
            ) : (
              <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-gray-300 px-1.5 text-[11px] text-gray-400 sm:block dark:border-gray-700">
                /
              </kbd>
            )}
          </label>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="단축키 보기"
            title="단축키 (?)"
            className="hidden size-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-indigo-500 sm:inline-flex dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
          >
            <KeyboardIcon className="size-[18px]" />
          </button>
          <ThemeToggle />
          <AccountMenu user={user} onLoggedOut={onUnauthorized} />
        </div>
        <nav className="mx-auto flex max-w-3xl items-center gap-1 px-3 pb-2 sm:px-4" aria-label="필터">
          {FILTERS.map((f) => {
            const active = f.id === filter;
            const n = f.id === "unread" ? counts?.unread : f.id === "all" ? counts?.all : undefined;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => changeFilter(f.id)}
                aria-pressed={active}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  active
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {f.label}
                {n !== undefined && (
                  <span className={`text-xs tabular-nums ${active ? "opacity-70" : "text-gray-400 dark:text-gray-500"}`}>{n}</span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-1.5 pb-32 sm:px-2">
        <AddBox onAdd={add} />

        {status === "error" && items.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <p className="font-semibold">목록을 불러오지 못했어요</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{errorText}</p>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                void loadFirst();
              }}
              className="mt-5 h-9 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              다시 시도
            </button>
          </div>
        ) : showSkeleton ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <Empty filter={filter} q={q} total={counts?.all ?? 0} />
        ) : (
          <ul className="flex flex-col gap-0.5" aria-label="저장한 항목">
            {items.map((b) => (
              <BookmarkRow
                key={b.id}
                item={b}
                selected={b.id === selectedId}
                leaving={leaving.has(b.id)}
                saving={saving.has(b.id)}
                showReadBadge={filter === "all"}
                now={now}
                onSelect={setSelectedId}
                onToggleRead={onToggleRead}
                onDelete={onDelete}
                onCopy={onCopy}
              />
            ))}
          </ul>
        )}
        <div ref={sentinelRef} aria-hidden="true" />
        {loadingMore && <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">더 불러오는 중…</p>}
      </main>

      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`zk-toast fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-2.5 text-sm shadow-lg ${
            toast.tone === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
          }`}
        >
          <span className="min-w-0">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.run}
              className="shrink-0 rounded-md px-2 py-1 font-semibold text-indigo-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white dark:text-indigo-600 dark:hover:bg-black/5"
            >
              {toast.action.label}
              <kbd className="ml-1.5 hidden text-xs font-normal opacity-60 sm:inline">z</kbd>
            </button>
          )}
        </div>
      )}

      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function AddBox({ onAdd }: { onAdd: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = text;
    if (!value.trim()) return;
    setText("");
    if (!(await onAdd(value))) setText(value);
  };
  return (
    <form onSubmit={submit} className="px-1.5 pt-4 pb-3 sm:px-2">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900">
        <PlusIcon className="size-4 shrink-0 text-gray-400" />
        <label className="min-w-0 flex-1">
          <span className="sr-only">링크 또는 메모 추가</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="링크 또는 메모 붙여넣기"
            enterKeyHint="done"
            autoComplete="off"
            className="h-11 w-full bg-transparent text-[15px] placeholder:text-gray-400 focus:outline-none dark:placeholder:text-gray-500"
          />
        </label>
        <button
          type="submit"
          disabled={!text.trim()}
          className="h-8 shrink-0 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        >
          저장
        </button>
      </div>
    </form>
  );
}

function AccountMenu({ user, onLoggedOut }: { user: User; onLoggedOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = async () => {
    setBusy(true);
    try {
      await api.logout();
    } catch {
      // 세션이 이미 없어도 로그인 화면으로 보낸다.
    }
    cache.clear();
    onLoggedOut();
  };

  const initial = (user.name || user.email).slice(0, 1).toUpperCase();
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="계정 메뉴"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex size-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
      >
        {user.picture && !imgFailed ? (
          <img
            src={user.picture}
            alt=""
            width={30}
            height={30}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="size-[30px] rounded-full"
          />
        ) : (
          <span className="flex size-[30px] items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {initial}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-11 right-0 z-30 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="px-4 py-3">
            {user.name && <p className="truncate text-sm font-semibold">{user.name}</p>}
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800" />
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            disabled={busy}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none disabled:opacity-50 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <ul className="flex flex-col gap-0.5" aria-label="불러오는 중" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="zk-skeleton flex gap-4 px-3 py-3.5 sm:px-4">
          <div className="h-16 w-20 shrink-0 rounded-lg bg-gray-100 sm:h-[72px] sm:w-28 dark:bg-gray-800/80" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-4 w-4/5 rounded bg-gray-100 dark:bg-gray-800/80" />
            <div className="h-3 w-3/5 rounded bg-gray-100 dark:bg-gray-800/80" />
            <div className="h-3 w-1/4 rounded bg-gray-100 dark:bg-gray-800/80" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ filter, q, total }: { filter: Filter; q: string; total: number }) {
  let title: string;
  let body: string;
  if (q) {
    title = `‘${q}’에 맞는 항목이 없어요`;
    body = filter === "all" ? "다른 검색어로 찾아보세요." : "다른 검색어로 찾거나 ‘전체’ 탭에서 찾아보세요.";
  } else if (filter === "unread" && total > 0) {
    title = "모두 읽었어요 🎉";
    body = "새로 공유한 링크가 여기에 쌓여요.";
  } else if (filter === "read") {
    title = "아직 읽음 처리한 항목이 없어요";
    body = "다 읽은 항목에서 e 를 누르면 여기로 옮겨져요.";
  } else {
    title = "아직 저장한 링크가 없어요";
    body = "태블릿에서 공유하거나, 위 입력창에 링크를 붙여넣어 보세요.";
  }
  return (
    <div className="px-4 py-24 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{body}</p>
    </div>
  );
}

const SHORTCUTS: [string[], string][] = [
  [["j", "↓"], "다음 항목"],
  [["k", "↑"], "이전 항목"],
  [["o", "Enter"], "열기 (새 탭)"],
  [["e"], "읽음 / 안읽음"],
  [["#", "d", "Del"], "삭제"],
  [["z"], "실행취소"],
  [["c"], "링크 복사"],
  [["/"], "검색"],
  [["?"], "단축키 보기"],
];

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zk-help-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between">
          <h2 id="zk-help-title" className="text-base font-semibold">
            키보드 단축키
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            닫기
          </button>
        </div>
        <dl className="mt-4 space-y-2.5">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
              <dd className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-6 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-center font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">입력창 밖에서 링크를 붙여넣으면 바로 저장돼요.</p>
      </div>
    </div>
  );
}
