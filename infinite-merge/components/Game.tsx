"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  CombineResponse,
  ElementView,
  ErrorResponse,
  StateResponse,
} from "@/lib/types";
import { BoardTileView, type BoardTile } from "./BoardTile";
import { Burst, makeSparks, type BurstSpec } from "./Burst";
import { DiscoveryBanner } from "./DiscoveryBanner";
import { crossedMilestone, MilestoneBadge, type Milestone } from "./MilestoneBadge";
import { FusionNode, type FusionSpec } from "./FusionNode";
import { Inventory } from "./Inventory";
import { Landing } from "./Landing";
import { PlanOffBanner, UsageLimitModal, WelcomeModal } from "./Modals";
import { Sky } from "./Sky";
import { Toasts, type ToastSpec } from "./Toasts";
import { TopBar } from "./TopBar";
import { tintOf } from "./tint";

const BOARD_KEY = "im.board.v1";
const WELCOME_KEY = "im.welcomed.v1";
const TOUCH_HOLD_MS = 220;
const TAP_SLOP = 6;

type DragState = {
  id: string;
  pointerId: number;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  moved: boolean;
  fromInventory: boolean;
};

type TouchPress = {
  pointerId: number;
  element: ElementView;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  timer: number;
};

type Banner = { key: string; element: ElementView };

const uid = () => Math.random().toString(36).slice(2, 10);

export function Game() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<BoardTile[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [overPanel, setOverPanel] = useState(false);
  const [fusions, setFusions] = useState<FusionSpec[]>([]);
  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  const [toasts, setToasts] = useState<ToastSpec[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<ElementView | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [planOff, setPlanOff] = useState(false);
  const [usageLimited, setUsageLimited] = useState(false);

  const tileEls = useRef(new Map<string, HTMLElement>());
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pressRef = useRef<TouchPress | null>(null);
  const tilesRef = useRef(tiles);
  useLayoutEffect(() => {
    tilesRef.current = tiles;
  });
  const boardLoaded = useRef(false);

  const signedIn = Boolean(state?.user);
  const siwc = state?.siwc ?? false;

  // ---------- boot ----------

  const loadState = useCallback(async (): Promise<StateResponse | null> => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as StateResponse;
      setState(next);
      setLoadError(null);
      // The board is per-browser but collections are per-account: drop tiles this account doesn't own.
      const owned = new Set(next.elements.map((e) => e.name));
      setTiles((prev) => prev.filter((t) => t.fusing || owned.has(t.name)));
      return next;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const pushToast = useCallback((t: Omit<ToastSpec, "id">) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.kind === "error" ? 6500 : 3200);
  }, []);

  const setModelShown = useCallback((model: string) => {
    setState((prev) =>
      prev?.plan && prev.plan.provider === "chatgpt" && prev.plan.model !== model
        ? { ...prev, plan: { ...prev.plan, model } }
        : prev,
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.size > 0) window.history.replaceState(null, "", window.location.pathname);
    const board = readBoard();

    void (async () => {
      const next = await loadState();
      // Board persistence is a per-viewer convenience; the collection itself lives in the DB.
      const owned = new Set(next?.elements.map((e) => e.name));
      setTiles(board.filter((t) => owned.has(t.name)).map(clampToBoard));
      boardLoaded.current = true;
      if (params.has("signed_in")) {
        if (params.get("plan") === "off") setPlanOff(true);
        else if (!safeGet(WELCOME_KEY)) setShowWelcome(true);
      }
      const authError = params.get("auth_error");
      if (authError) {
        pushToast({
          kind: "error",
          title: authError === "access_denied" ? "로그인이 취소되었어요" : "ChatGPT 로그인에 실패했어요",
          body: authError === "access_denied" ? undefined : `오류 코드: ${authError}`,
        });
      }
    })();
  }, [loadState, pushToast]);

  useEffect(() => {
    if (!boardLoaded.current) return;
    const stable = tiles.filter((t) => !t.fusing);
    safeSet(BOARD_KEY, JSON.stringify(stable.map(({ id, name, emoji, x, y }) => ({ id, name, emoji, x, y }))));
  }, [tiles]);

  // ---------- geometry ----------

  const spawnPoint = useCallback(() => {
    const { right, bottom } = boardBounds();
    const cx = right / 2;
    const cy = 64 + (bottom - 64) / 2;
    const spread = Math.min(right, bottom - 64) * 0.28;
    return {
      x: cx + (Math.random() - 0.5) * spread * 2,
      y: cy + (Math.random() - 0.5) * spread,
    };
  }, []);

  const isOverPanel = (x: number, y: number) => {
    const r = panelRef.current?.getBoundingClientRect();
    return Boolean(r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
  };

  /** `at` is the dragged tile's intended center; the DOM may still lag a frame behind the pointer. */
  const findTarget = (dragId: string, at: { x: number; y: number }): string | null => {
    const el = tileEls.current.get(dragId);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const a = { left: at.x - r.width / 2, right: at.x + r.width / 2, top: at.y - r.height / 2, bottom: at.y + r.height / 2, width: r.width, height: r.height };
    let best: string | null = null;
    let bestArea = 0;
    for (const t of tilesRef.current) {
      if (t.id === dragId || t.fusing) continue;
      const other = tileEls.current.get(t.id);
      if (!other) continue;
      const b = other.getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w <= 0 || h <= 0) continue;
      const area = w * h;
      const minArea = Math.min(a.width * a.height, b.width * b.height);
      if (area / minArea > 0.18 && area > bestArea) {
        best = t.id;
        bestArea = area;
      }
    }
    return best;
  };

  // ---------- fusion ----------

  const retryRef = useRef<(a: string, b: string) => void>(() => {});

  const addBurst = useCallback((x: number, y: number, tints: string[], big: boolean) => {
    const id = uid();
    setBursts((prev) => [...prev, { id, x, y, big, sparks: makeSparks(tints, big), ring: tints[2] ?? tints[0] }]);
    window.setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1400);
  }, []);

  const fuse = useCallback(
    async (dragTile: BoardTile, target: BoardTile) => {
      const fusionId = uid();
      const mid = { x: (dragTile.x + target.x) / 2, y: (dragTile.y + target.y) / 2 };
      setTiles((prev) =>
        prev.map((t) =>
          t.id === dragTile.id || t.id === target.id ? { ...t, x: mid.x, y: mid.y, fusing: fusionId } : t,
        ),
      );
      setFusions((prev) => [
        ...prev,
        { id: fusionId, x: mid.x, y: mid.y, a: dragTile, b: target },
      ]);

      const started = performance.now();
      let outcome: { ok: true; data: CombineResponse } | { ok: false; err: ErrorResponse["error"] };
      try {
        const res = await fetch("/api/combine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ a: dragTile.name, b: target.name }),
        });
        const body = await res.json().catch(() => null);
        outcome = res.ok
          ? { ok: true, data: body as CombineResponse }
          : {
              ok: false,
              err: (body as ErrorResponse | null)?.error ?? {
                code: "internal",
                message: `서버 오류 (HTTP ${res.status})`,
                action: "retry",
              },
            };
      } catch {
        outcome = { ok: false, err: { code: "unavailable", message: "서버에 연결할 수 없어요.", action: "retry" } };
      }
      // Let the suck-in animation read even when the recipe was cached.
      const wait = 420 - (performance.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));

      setFusions((prev) => prev.filter((f) => f.id !== fusionId));

      if (!outcome.ok) {
        const { err } = outcome;
        setTiles((prev) =>
          prev.map((t) => {
            if (t.id === dragTile.id) return { ...t, fusing: undefined, x: mid.x - 70, y: mid.y + 10, shake: Date.now() };
            if (t.id === target.id) return { ...t, fusing: undefined, x: mid.x + 70, y: mid.y - 10, shake: Date.now() };
            return t;
          }),
        );
        if (err.code === "usage_limit") {
          setUsageLimited(true);
          return;
        }
        if (err.code === "plan_not_enabled") setPlanOff(true);
        if (err.code === "not_signed_in" || err.code === "session_expired" || err.code === "guest_limit") void loadState();
        pushToast({
          kind: "error",
          title: err.message,
          action:
            err.action === "signin" && siwc
              ? { label: "Continue with ChatGPT", href: "/auth/chatgpt" }
              : err.action === "manage_usage"
                ? { label: "Manage usage", href: "https://chatgpt.com/settings/usage", external: true }
                : err.action === "retry"
                  ? { label: "다시 시도", onClick: () => retryRef.current(dragTile.name, target.name) }
                  : undefined,
        });
        return;
      }

      const { data } = outcome;
      const result = data.result;
      if (data.model) setModelShown(data.model);
      if (typeof data.remaining === "number") {
        const remaining = data.remaining;
        setState((prev) => (prev?.plan ? { ...prev, plan: { ...prev.plan, remaining } } : prev));
      }
      const resultTile: BoardTile = {
        id: uid(),
        name: result.name,
        emoji: result.emoji,
        x: mid.x,
        y: mid.y,
        born: Date.now(),
      };
      setTiles((prev) => [...prev.filter((t) => t.fusing !== fusionId), resultTile]);
      addBurst(mid.x, mid.y, [tintOf(dragTile.name), tintOf(target.name), tintOf(result.name)], data.isNew);
      setLastResult({ ...result });

      if (data.isNew) {
        setState((prev) =>
          prev
            ? {
                ...prev,
                elements: prev.elements.some((e) => e.name === result.name)
                  ? prev.elements
                  : [...prev.elements, { ...result, discoveredAt: Date.now(), firstDiscovery: data.isFirstDiscovery }],
                worldCount: prev.worldCount + (data.isFirstDiscovery ? 1 : 0),
              }
            : prev,
        );
        setFresh((prev) => new Set(prev).add(result.name));
        window.setTimeout(
          () =>
            setFresh((prev) => {
              const next = new Set(prev);
              next.delete(result.name);
              return next;
            }),
          3400,
        );
        if (data.isFirstDiscovery) {
          setBanner({ key: uid(), element: { ...result, firstDiscovery: true } });
        } else {
          pushToast({ kind: "new", title: `${result.emoji} ${result.name}`, body: result.desc ?? "새로운 원소를 얻었어요" });
        }
      }
    },
    [addBurst, loadState, pushToast, setModelShown, siwc],
  );

  useEffect(() => {
    retryRef.current = (a, b) => {
      const ta = tilesRef.current.find((t) => t.name === a && !t.fusing);
      const tb = tilesRef.current.find((t) => t.name === b && !t.fusing && t.id !== ta?.id);
      if (ta && tb) void fuse(ta, tb);
      else pushToast({ kind: "info", title: `${a} + ${b} 를 다시 겹쳐 보세요` });
    };
  }, [fuse, pushToast]);

  // ---------- pointer handling ----------

  const beginDrag = useCallback((d: DragState) => {
    dragRef.current = d;
    setDraggingId(d.id);
  }, []);

  const onTilePointerDown = useCallback(
    (e: React.PointerEvent, tile: BoardTile) => {
      if (tile.fusing || e.button > 0) return;
      e.preventDefault();
      beginDrag({
        id: tile.id,
        pointerId: e.pointerId,
        dx: e.clientX - tile.x,
        dy: e.clientY - tile.y,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        fromInventory: false,
      });
      // Bring to front.
      setTiles((prev) => [...prev.filter((t) => t.id !== tile.id), tile]);
    },
    [beginDrag],
  );

  const spawnFromInventory = useCallback(
    (element: ElementView, x: number, y: number, pointerId: number | null) => {
      const tile: BoardTile = { id: uid(), name: element.name, emoji: element.emoji, x, y, born: Date.now() };
      setTiles((prev) => [...prev, tile]);
      if (pointerId !== null) {
        beginDrag({
          id: tile.id,
          pointerId,
          dx: 0,
          dy: 0,
          startX: x,
          startY: y,
          moved: false,
          fromInventory: true,
        });
      }
      return tile;
    },
    [beginDrag],
  );

  const onChipPointerDown = useCallback(
    (e: React.PointerEvent, element: ElementView) => {
      if (e.button > 0) return;
      if (e.pointerType === "touch") {
        const press: TouchPress = {
          pointerId: e.pointerId,
          element,
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
          timer: window.setTimeout(() => {
            const p = pressRef.current;
            if (!p) return;
            pressRef.current = null;
            navigator.vibrate?.(8);
            spawnFromInventory(p.element, p.lastX, p.lastY - 28, p.pointerId);
            if (dragRef.current) dragRef.current.dy = 28;
          }, TOUCH_HOLD_MS),
        };
        pressRef.current = press;
        return;
      }
      e.preventDefault();
      spawnFromInventory(element, e.clientX, e.clientY, e.pointerId);
    },
    [spawnFromInventory],
  );

  // Called from window listeners; always sees the latest render's state and callbacks.
  const onTap = useEffectEvent((element: ElementView) => {
    const at = spawnPoint();
    spawnFromInventory(element, at.x, at.y, null);
  });

  const onDragFrame = useEffectEvent((x: number, y: number, d: DragState) => {
    setTiles((prev) => prev.map((t) => (t.id === d.id ? { ...t, x: x - d.dx, y: y - d.dy } : t)));
    setOverPanel(isOverPanel(x, y));
    setTargetId(findTarget(d.id, { x: x - d.dx, y: y - d.dy }));
  });

  const onRelease = useEffectEvent((e: PointerEvent, d: DragState) => {
    setDraggingId(null);
    setTargetId(null);
    setOverPanel(false);

    const current = tilesRef.current.find((t) => t.id === d.id);
    if (!current) return;

    if (d.fromInventory && !d.moved) {
      // A click on an inventory chip: float the element onto the open board.
      const at = spawnPoint();
      setTiles((prev) => prev.map((t) => (t.id === d.id ? { ...t, x: at.x, y: at.y } : t)));
      return;
    }
    if (e.type === "pointercancel" || isOverPanel(e.clientX, e.clientY)) {
      setTiles((prev) => prev.filter((t) => t.id !== d.id));
      return;
    }
    const at = { x: e.clientX - d.dx, y: e.clientY - d.dy };
    const targetIdNow = findTarget(d.id, at);
    const target = targetIdNow ? tilesRef.current.find((t) => t.id === targetIdNow) : undefined;
    if (target) void fuse({ ...current, ...at }, target);
  });

  useEffect(() => {
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      frame = 0;
      const d = dragRef.current;
      if (d && pending) onDragFrame(pending.x, pending.y, d);
    };

    const onMove = (e: PointerEvent) => {
      const p = pressRef.current;
      if (p && e.pointerId === p.pointerId) {
        p.lastX = e.clientX;
        p.lastY = e.clientY;
        if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8) {
          window.clearTimeout(p.timer);
          pressRef.current = null;
        }
        return;
      }
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > TAP_SLOP) d.moved = true;
      pending = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const onUp = (e: PointerEvent) => {
      const p = pressRef.current;
      if (p && e.pointerId === p.pointerId) {
        window.clearTimeout(p.timer);
        pressRef.current = null;
        if (e.type === "pointerup") onTap(p.element);
        return;
      }
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (frame) {
        cancelAnimationFrame(frame);
        flush();
      }
      dragRef.current = null;
      onRelease(e, d);
    };

    // Once a long-press drag has started on touch, stop the inventory from scrolling under it.
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const duplicateTile = useCallback((tile: BoardTile) => {
    setTiles((prev) => [
      ...prev,
      { id: uid(), name: tile.name, emoji: tile.emoji, x: tile.x + 26, y: tile.y + 26, born: Date.now() },
    ]);
  }, []);

  // Keep tiles reachable after the viewport shrinks (rotation, window resize).
  useEffect(() => {
    const onResize = () => setTiles((prev) => prev.map(clampToBoard));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- actions ----------

  const clearBoard = () => setTiles((prev) => prev.filter((t) => t.fusing));

  const logout = async () => {
    try {
      const res = await fetch("/auth/logout", { method: "POST" });
      const body = (await res.json().catch(() => null)) as { revoked?: boolean } | null;
      pushToast({
        kind: "info",
        title: state?.plan?.provider === "claude" ? "게스트를 종료했어요" : "로그아웃했어요",
        body: body?.revoked === false ? "원격 세션 해제를 확인하지 못했어요. ChatGPT 설정에서 앱 연결을 해제할 수 있어요." : undefined,
      });
    } finally {
      await loadState();
    }
  };

  const startGuest = async (turnstileToken: string | null): Promise<boolean> => {
    const res = await fetch("/auth/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turnstileToken: turnstileToken ?? undefined }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ErrorResponse | null;
      pushToast({ kind: "error", title: body?.error.message ?? "게스트로 입장하지 못했어요" });
      await loadState();
      return false;
    }
    await loadState();
    pushToast({
      kind: "info",
      title: "게스트로 입장했어요",
      body: `Claude Haiku로 ${state?.guest.dailyLimit ?? ""}회 연성할 수 있어요.${refillNote(state?.guest.refill)} 이미 발견된 조합은 횟수에 포함되지 않아요.`,
    });
    return true;
  };

  const resetProgress = async () => {
    const res = await fetch("/api/progress", { method: "DELETE" });
    if (res.ok) {
      setTiles([]);
      await loadState();
      pushToast({ kind: "info", title: "연성 기록을 초기화했어요" });
    }
  };

  const elements = useMemo(() => state?.elements ?? [], [state]);
  const ownedCount = elements.length;
  const firstCount = elements.filter((e) => e.firstDiscovery).length;
  const discoveredCount = elements.filter((e) => !e.base).length;

  // Milestone titles unlock only when the count crosses a step during play, never on page load.
  const lastCount = useRef<number | null>(null);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [pendingMilestone, setPendingMilestone] = useState<Milestone | null>(null);
  useEffect(() => {
    if (!state?.user) {
      lastCount.current = null;
      return;
    }
    const before = lastCount.current;
    lastCount.current = discoveredCount;
    if (before === null) return;
    const crossed = crossedMilestone(before, discoveredCount);
    if (crossed) setPendingMilestone(crossed);
  }, [discoveredCount, state?.user]);
  // Let a world-first banner finish before the badge takes the stage.
  useEffect(() => {
    if (pendingMilestone && !banner) {
      const t = window.setTimeout(() => {
        setMilestone(pendingMilestone);
        setPendingMilestone(null);
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [pendingMilestone, banner]);

  return (
    <MotionConfig reducedMotion="user">
    <main className="fixed inset-0 select-none overflow-hidden">
      <Sky />

      {/* Tiles share the root stacking context so a dragged tile can float above the panel. */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {tiles.map((tile) => (
            <BoardTileView
              key={tile.id}
              tile={tile}
              dragging={draggingId === tile.id}
              target={targetId === tile.id}
              registerEl={(el) => {
                if (el) tileEls.current.set(tile.id, el);
                else tileEls.current.delete(tile.id);
              }}
              onPointerDown={onTilePointerDown}
              onDoubleClick={duplicateTile}
            />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {fusions.map((f) => (
            <FusionNode key={f.id} spec={f} />
          ))}
        </AnimatePresence>
        {bursts.map((b) => (
          <Burst key={b.id} spec={b} />
        ))}
      </div>

      {tiles.length === 0 && signedIn && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center md:right-[384px]">
          <p className="font-serif text-2xl font-black tracking-tight text-white/14 md:text-3xl">
            원소를 끌어와 서로 겹쳐 보세요
          </p>
          <p className="mt-2 text-sm text-white/14">더블클릭하면 복제, 패널로 던지면 치워져요</p>
        </div>
      )}

      <TopBar
        user={state?.user ?? null}
        plan={state?.plan ?? null}
        ownedCount={ownedCount}
        firstCount={firstCount}
        worldCount={state?.worldCount ?? 0}
        onLogout={logout}
        onReset={resetProgress}
        onClearBoard={clearBoard}
        onModelChange={setModelShown}
        boardCount={tiles.length}
        siwc={siwc}
      />

      <Inventory
        ref={panelRef}
        elements={elements}
        fresh={fresh}
        dropActive={overPanel && draggingId !== null}
        lastResult={lastResult}
        onChipPointerDown={onChipPointerDown}
        disabled={!signedIn}
      />

      <AnimatePresence>
        {planOff && signedIn && <PlanOffBanner key="planoff" onClose={() => setPlanOff(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {banner && <DiscoveryBanner key={banner.key} element={banner.element} onDone={() => setBanner(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {milestone && <MilestoneBadge key={milestone.count} milestone={milestone} onDone={() => setMilestone(null)} />}
      </AnimatePresence>

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <AnimatePresence>
        {state && !signedIn && (
          <Landing key="landing" worldCount={state.worldCount} guest={state.guest} siwc={state.siwc} onGuestStart={startGuest} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWelcome && signedIn && (
          <WelcomeModal
            key="welcome"
            onClose={() => {
              safeSet(WELCOME_KEY, "1");
              setShowWelcome(false);
            }}
          />
        )}
        {usageLimited && <UsageLimitModal key="usage" onClose={() => setUsageLimited(false)} />}
      </AnimatePresence>

      {!state && (
        <div className="absolute inset-0 grid place-items-center">
          {loadError ? (
            <div className="glass rounded-2xl px-6 py-5 text-center">
              <p className="font-bold">서버 상태를 불러오지 못했어요</p>
              <p className="mt-1 text-sm text-dim">{loadError}</p>
              <button
                className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
                onClick={() => void loadState()}
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="flex gap-3 font-serif text-3xl font-black">
              {["木", "火", "土", "金", "水"].map((h, i) => (
                <span
                  key={h}
                  className="animate-pulse"
                  style={{ animationDelay: `${i * 120}ms`, color: `rgb(${tintOf(["나무", "불", "흙", "금속", "물"][i])})` }}
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
    </MotionConfig>
  );
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage may be unavailable (private mode); the game still works */
  }
}

function readBoard(): BoardTile[] {
  const raw = safeGet(BOARD_KEY);
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw) as BoardTile[];
    return saved.map((t) => ({ ...t, fusing: undefined, born: 0 }));
  } catch {
    return [];
  }
}

/** Open board area: everything left of the desktop panel, or above the mobile sheet. */
function boardBounds() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const desktop = w >= 768;
  return { right: desktop ? w - 360 - 24 : w, bottom: desktop ? h : h * 0.58 - 8 };
}

function clampToBoard<T extends { x: number; y: number }>(t: T): T {
  const { right, bottom } = boardBounds();
  return { ...t, x: Math.min(Math.max(t.x, 56), right - 56), y: Math.min(Math.max(t.y, 88), bottom - 24) };
}

function refillNote(refill: { minutes: number; amount: number } | null | undefined): string {
  return refill ? ` 쓴 횟수는 ${refill.minutes}분마다 ${refill.amount}회씩 다시 차요.` : "";
}
