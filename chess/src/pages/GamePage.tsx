import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EMOTES, ENGINES, playerLabel, type Color, type EmoteId, type GameSnapshot } from "../../shared/types";
import { Board } from "../components/Board";
import { EmotePicker } from "../components/EmotePicker";
import {
  IconBack,
  IconFirst,
  IconFlag,
  IconFlip,
  IconHandshake,
  IconLast,
  IconMute,
  IconNext,
  IconPrev,
  IconSound,
  IconStop,
} from "../components/Icons";
import { MoveList } from "../components/MoveList";
import { Avatar, PlayerBar } from "../components/PlayerBar";
import { ResultSheet } from "../components/ResultSheet";
import { WaitingCard } from "../components/WaitingCard";
import { api, useGame, useTicker } from "../lib/api";
import { formatTimeControl, formatTokens, formatUsd, REASON_TEXT, remainingMs } from "../lib/format";
import { myGameIds, playerToken, rememberGame } from "../lib/player";
import { isMuted, setMuted, sounds } from "../lib/sound";
import { navigate } from "../router";

const START_FEN = new Chess().fen();
const EMOTE_MS = 3200;

function toPgn(snap: GameSnapshot) {
  const chess = new Chess();
  for (const m of snap.moves) chess.move(m.san);
  chess.setHeader("Event", "chess.zowoo.uk");
  chess.setHeader("Site", `https://chess.zowoo.uk/#/game/${snap.id}`);
  chess.setHeader("Date", new Date(snap.createdAt).toISOString().slice(0, 10).replaceAll("-", "."));
  chess.setHeader("White", playerLabel(snap.white));
  chess.setHeader("Black", playerLabel(snap.black));
  chess.setHeader("Result", snap.result ?? "*");
  chess.setHeader("TimeControl", `${snap.initialMs / 1000}+${snap.incrementMs / 1000}`);
  return chess.pgn();
}

export function GamePage({ id }: { id: string }) {
  const { snap, receivedAt, error, connected, emote, rejected, send, accept } = useGame(id);
  const [flipped, setFlipped] = useState(false);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [pending, setPending] = useState<{ fen: string; from: string; to: string; ply: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [emotesMuted, setEmotesMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [jump, setJump] = useState(false);
  const [bubbles, setBubbles] = useState<Partial<Record<Color, { id: EmoteId; n: number }>>>({});
  const [joining, setJoining] = useState(false);
  const prev = useRef<{ id: string; moves: number; status: string; drawOffer?: Color | null; rematchBy?: Color | null } | null>(null);

  const you = snap?.you ?? null;
  const playing = snap?.status === "playing";
  const pvp = snap?.mode === "pvp";
  const createdHere = useMemo(() => myGameIds().includes(id), [id]);
  useTicker(Boolean(playing && snap?.clock.running));

  // Sounds, notices and the result sheet on live transitions only (not when opening a finished game).
  useEffect(() => {
    if (!snap) return;
    const p = prev.current;
    prev.current = { id: snap.id, moves: snap.moves.length, status: snap.status, drawOffer: snap.drawOffer, rematchBy: snap.rematch?.offeredBy };
    if (!p || p.id !== snap.id) return;
    if (snap.moves.length > p.moves) {
      const san = snap.moves[snap.moves.length - 1].san;
      if (san.includes("+") || san.includes("#")) sounds.check();
      else if (san.includes("x")) sounds.capture();
      else sounds.move();
    }
    if (p.status === "waiting" && snap.status === "playing") {
      sounds.notify();
      setToast("상대가 들어왔어요. 대국 시작!");
    }
    if (you && snap.drawOffer && snap.drawOffer !== you && p.drawOffer !== snap.drawOffer) sounds.notify();
    if (you && snap.rematch?.offeredBy && snap.rematch.offeredBy !== you && p.rematchBy !== snap.rematch.offeredBy) sounds.notify();
    if (p.status !== "ended" && snap.status === "ended") {
      setViewPly(null);
      if (snap.reason !== "expired") setTimeout(() => setShowResult(true), 450);
      const winner = snap.result === "1-0" ? "w" : snap.result === "0-1" ? "b" : null;
      if (!winner) sounds.draw();
      else if (!you || winner === you) sounds.win();
      else sounds.lose();
    }
  }, [snap, you]);

  // Both players land in the rematch automatically, but only when it starts while this page is open,
  // so finished games stay viewable from the history.
  const nextId = snap?.rematch?.nextId;
  const initialNextId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!snap) return;
    if (initialNextId.current === undefined) initialNextId.current = nextId ?? null;
    if (!nextId || !you || initialNextId.current === nextId) return;
    rememberGame(nextId);
    navigate(`/game/${nextId}`);
  }, [snap, nextId, you]);

  useEffect(() => {
    if (pending && snap && snap.moves.length > pending.ply) setPending(null);
  }, [snap, pending]);

  useEffect(() => {
    if (!rejected) return;
    setPending(null);
    setToast(rejected.message);
  }, [rejected]);

  useEffect(() => {
    if (!emote || (emotesMuted && emote.color !== you)) return;
    sounds.emote();
    setBubbles((b) => ({ ...b, [emote.color]: { id: emote.id, n: emote.n } }));
    const t = setTimeout(() => setBubbles((b) => (b[emote.color]?.n === emote.n ? { ...b, [emote.color]: undefined } : b)), EMOTE_MS);
    return () => clearTimeout(t);
  }, [emote, emotesMuted, you]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const moves = snap?.moves ?? [];
  const liveIdx = moves.length - 1;
  const shownIdx = viewPly ?? liveIdx;
  const viewing = viewPly !== null && viewPly !== liveIdx;

  const goTo = useCallback(
    (ply: number) => {
      const clamped = Math.max(-1, Math.min(liveIdx, ply));
      setJump(Math.abs(clamped - shownIdx) > 1);
      setViewPly(clamped === liveIdx ? null : clamped);
    },
    [liveIdx, shownIdx],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") goTo(shownIdx - 1);
      else if (e.key === "ArrowRight") goTo(shownIdx + 1);
      else if (e.key === "ArrowUp" || e.key === "Home") goTo(-1);
      else if (e.key === "ArrowDown" || e.key === "End") goTo(liveIdx);
      else if (e.key === "f") setFlipped((f) => !f);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, shownIdx, liveIdx]);

  const baseColor: Color = you ?? "w";
  const bottomColor: Color = flipped ? (baseColor === "w" ? "b" : "w") : baseColor;
  const topColor: Color = bottomColor === "w" ? "b" : "w";

  const boardFen = viewing ? (shownIdx >= 0 ? moves[shownIdx].fen : START_FEN) : (pending?.fen ?? snap?.fen ?? START_FEN);
  const lastMove = viewing ? (shownIdx >= 0 ? moves[shownIdx] : null) : (pending ?? (liveIdx >= 0 ? moves[liveIdx] : null));

  const turn = snap ? (new Chess(snap.fen).turn() as Color) : "w";
  const movable = snap && playing && !viewing && !pending && you === turn ? you : null;

  const act = (msg: Parameters<typeof send>[0]) => {
    if (!send(msg)) setToast("연결이 끊겼어요. 다시 연결하는 중…");
  };

  const onMove = (from: string, to: string, promotion?: string) => {
    if (!snap) return;
    const local = new Chess(snap.fen);
    try {
      local.move({ from, to, promotion });
    } catch {
      return;
    }
    setJump(false);
    if (!send({ t: "move", from, to, promotion })) {
      setToast("연결이 끊겼어요. 다시 연결하는 중…");
      return;
    }
    setPending({ fen: local.fen(), from, to, ply: snap.moves.length });
  };

  const join = async () => {
    setJoining(true);
    try {
      accept(await api.join(id));
      // Re-identify on the socket so the room knows this connection now holds a seat.
      send({ t: "hello", token: playerToken() });
    } catch (err) {
      setToast((err as Error).message);
    }
    setJoining(false);
  };

  const rematch = async () => {
    if (!snap) return;
    if (snap.mode === "pvp") {
      act({ t: "rematch", action: snap.rematch?.offeredBy && snap.rematch.offeredBy !== you ? "accept" : "offer" });
      return;
    }
    try {
      const aiColor: Color = snap.white.kind === "ai" ? "w" : "b";
      const g =
        snap.mode === "ai"
          ? await api.create({
              mode: "ai",
              opponent: aiColor === "w" ? snap.white : snap.black,
              color: aiColor,
              initialMs: snap.initialMs,
              incrementMs: snap.incrementMs,
            })
          : await api.create({ mode: "arena", white: snap.white, black: snap.black, initialMs: snap.initialMs, incrementMs: snap.incrementMs });
      setShowResult(false);
      navigate(`/game/${g.id}`);
    } catch (err) {
      setToast((err as Error).message);
    }
  };

  const copyPgn = async () => {
    if (!snap) return;
    try {
      await navigator.clipboard.writeText(toPgn(snap));
      setToast("PGN을 복사했어요");
    } catch {
      setToast("클립보드에 접근할 수 없어요");
    }
  };

  const bubbleFor = (color: Color): { text: string; tone: "comment" | "error" | "emote"; key: string } | null => {
    if (!snap) return null;
    const em = bubbles[color];
    if (em) {
      const e = EMOTES.find((x) => x.id === em.id)!;
      return { text: `${e.emoji} ${e.text}`, tone: "emote", key: `e${em.n}` };
    }
    const err = snap.lastError;
    if (playing && err && err.color === color && Date.now() - err.at < 6000) return { text: "API 오류 · 재시도 중", tone: "error", key: `x${err.at}` };
    if (viewing) {
      const m = moves[shownIdx];
      return m && m.color === color && m.comment ? { text: m.comment, tone: "comment", key: `c${shownIdx}` } : null;
    }
    const last = moves[liveIdx];
    if (last && last.color === color && last.comment && snap.thinking !== color) return { text: last.comment, tone: "comment", key: `c${liveIdx}` };
    return null;
  };

  if (error) {
    return (
      <div className="empty-state">
        <p>대국을 찾을 수 없어요.</p>
        <button className="btn primary" onClick={() => navigate("/")}>홈으로</button>
      </div>
    );
  }
  if (!snap) return <div className="loading">불러오는 중…</div>;

  const bar = (color: Color, position: "top" | "bottom") => {
    const b = bubbleFor(color);
    const player = color === "w" ? snap.white : snap.black;
    const open = snap.status === "waiting" && snap.openSeat === color;
    return (
      <PlayerBar
        player={player}
        color={color}
        fen={boardFen}
        clockMs={remainingMs(snap, color, receivedAt)}
        running={snap.clock.running === color}
        thinking={snap.thinking === color}
        usage={snap.usage[color]}
        bubble={b?.text}
        bubbleKey={b?.key}
        bubbleTone={b?.tone}
        position={position}
        label={open ? "상대를 기다리는 중…" : undefined}
        you={you === color}
        offline={pvp && snap.status === "playing" && snap.online ? !snap.online[color] : false}
      />
    );
  };

  const total = snap.usage.w.costUsd + snap.usage.b.costUsd;
  const anyAi = snap.mode !== "pvp";
  const canAbort = playing && ((you !== null && moves.length < 2) || (snap.mode === "arena" && createdHere));
  const incomingDraw = pvp && playing && you && snap.drawOffer && snap.drawOffer !== you;
  const outgoingDraw = pvp && playing && you && snap.drawOffer === you;
  const incomingRematch = pvp && you && snap.rematch?.offeredBy && snap.rematch.offeredBy !== you;
  const outgoingRematch = pvp && you && snap.rematch?.offeredBy === you;

  const nav = (
    <div className="nav-buttons">
      <button className="icon-btn" onClick={() => goTo(-1)} aria-label="처음"><IconFirst /></button>
      <button className="icon-btn" onClick={() => goTo(shownIdx - 1)} aria-label="이전"><IconPrev /></button>
      <button className="icon-btn" onClick={() => goTo(shownIdx + 1)} aria-label="다음"><IconNext /></button>
      <button className="icon-btn" onClick={() => goTo(liveIdx)} aria-label="마지막"><IconLast /></button>
    </div>
  );

  const actions = (
    <div className="game-actions">
      {canAbort && (
        <button className="btn small" onClick={() => act({ t: "abort" })}>
          <IconStop /> 취소
        </button>
      )}
      {playing && you && pvp && !canAbort && !incomingDraw && (
        <button className="btn small" disabled={Boolean(outgoingDraw)} onClick={() => act({ t: "draw", action: "offer" })}>
          <IconHandshake /> {outgoingDraw ? "제안함" : "무승부"}
        </button>
      )}
      {playing && you && !canAbort && (
        <button className="btn danger small" onClick={() => act({ t: "resign" })}>
          <IconFlag /> 기권
        </button>
      )}
      {snap.status === "ended" && (
        <>
          {snap.reason !== "expired" && <button className="btn primary small" onClick={() => setShowResult(true)}>결과 보기</button>}
          {(!pvp || you) && snap.reason !== "expired" && (
            <button className="btn small" disabled={Boolean(outgoingRematch)} onClick={rematch}>
              {outgoingRematch ? "재대결 신청함" : incomingRematch ? "재대결 수락" : "다시 하기"}
            </button>
          )}
        </>
      )}
    </div>
  );

  const offerBanner = incomingDraw ? (
    <div className="offer-banner">
      <span>🤝 상대가 무승부를 제안했어요</span>
      <button className="btn primary small" onClick={() => act({ t: "draw", action: "accept" })}>수락</button>
      <button className="btn small" onClick={() => act({ t: "draw", action: "decline" })}>거절</button>
    </div>
  ) : incomingRematch && !showResult ? (
    <div className="offer-banner">
      <span>🔁 상대가 재대결을 원해요</span>
      <button className="btn primary small" onClick={() => act({ t: "rematch", action: "accept" })}>수락</button>
      <button className="btn small" onClick={() => act({ t: "rematch", action: "decline" })}>거절</button>
    </div>
  ) : null;

  const emoteControls =
    pvp && you && snap.status !== "waiting" ? (
      <EmotePicker
        onPick={(e) => act({ t: "emote", id: e })}
        muted={emotesMuted}
        onToggleMute={() => setEmotesMuted((m) => !m)}
      />
    ) : null;

  return (
    <div className="game-page">
      <header className="game-header">
        <button className="icon-btn" onClick={() => navigate("/")} aria-label="뒤로"><IconBack /></button>
        <div className="game-title">
          <strong>
            {playerLabel(snap.white)} vs {snap.status === "waiting" && snap.openSeat === "b" ? "?" : playerLabel(snap.black)}
          </strong>
          <span>
            {formatTimeControl(snap.initialMs, snap.incrementMs)}
            {snap.status === "ended" && snap.reason && ` · ${snap.result === "*" ? "" : `${snap.result} `}${REASON_TEXT[snap.reason]}`}
            {snap.status === "playing" && !you && " · 관전 중"}
            {!connected && " · 연결 중…"}
          </span>
        </div>
        <button
          className="icon-btn"
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
          aria-label="소리"
        >
          {muted ? <IconMute /> : <IconSound />}
        </button>
        <button className="icon-btn" onClick={() => setFlipped((f) => !f)} aria-label="보드 뒤집기"><IconFlip /></button>
      </header>

      <main className="game-main">
        <section className="board-col">
          {bar(topColor, "top")}
          <div className="board-wrap">
            <Board fen={boardFen} orientation={bottomColor} lastMove={lastMove} movable={movable} onMove={onMove} animate={!jump} />
            {viewing && (
              <button className="back-to-live" onClick={() => goTo(liveIdx)}>
                {playing ? "실시간으로 돌아가기" : "마지막 수로"} <IconLast />
              </button>
            )}
            {snap.status === "waiting" && (
              <WaitingCard snap={snap} you={you} joining={joining} onJoin={join} onCancel={() => act({ t: "abort" })} />
            )}
            {snap.status === "ended" && snap.reason === "expired" && (
              <div className="board-overlay">
                <div className="waiting-card">
                  <strong>아무도 오지 않아 방이 닫혔어요</strong>
                  <button className="btn primary" onClick={() => navigate("/new/online")}>새 방 만들기</button>
                </div>
              </div>
            )}
          </div>
          {bar(bottomColor, "bottom")}
        </section>

        <section className="mobile-panel">
          {offerBanner}
          <MoveList moves={moves} current={shownIdx} onSelect={goTo} layout="strip" />
          <div className="mobile-controls">
            {nav}
            {emoteControls}
            {actions}
          </div>
          {anyAi && (
            <div className="live-usage compact">
              <span>토큰 {formatTokens(snap.usage.w.inputTokens + snap.usage.w.outputTokens + snap.usage.b.inputTokens + snap.usage.b.outputTokens)}</span>
              <strong>{formatUsd(total)}</strong>
            </div>
          )}
        </section>

        <aside className="side-col">
          {offerBanner}
          <div className="side-card">
            <MoveList moves={moves} current={shownIdx} onSelect={goTo} layout="table" />
            {nav}
          </div>
          {anyAi && (
            <div className="side-card usage-card">
              <div className="usage-title">실시간 API 사용량</div>
              {(["w", "b"] as const).map((c) => {
                const p = c === "w" ? snap.white : snap.black;
                const u = snap.usage[c];
                return (
                  <div className="usage-line" key={c}>
                    <Avatar player={p} size={28} />
                    <span className="usage-name">{p.kind === "ai" ? ENGINES[p.engine].name : playerLabel(p)}</span>
                    <span className="usage-num">{p.kind === "ai" ? `${u.calls}회 · ${formatTokens(u.inputTokens + u.outputTokens)} tok` : "—"}</span>
                    <strong>{p.kind === "ai" ? formatUsd(u.costUsd) : ""}</strong>
                  </div>
                );
              })}
              <div className="usage-total">
                <span>합계</span>
                <strong>{formatUsd(total)}</strong>
              </div>
            </div>
          )}
          <div className="side-actions">
            {emoteControls}
            {actions}
          </div>
        </aside>
      </main>

      {toast && <div className="toast">{toast}</div>}
      {showResult && snap.status === "ended" && (
        <ResultSheet
          snap={snap}
          humanColor={you}
          rematchLabel={pvp ? (outgoingRematch ? "재대결 신청함" : incomingRematch ? "재대결 수락" : "재대결 신청") : "다시 하기"}
          rematchDisabled={Boolean(outgoingRematch) || (pvp && !you)}
          onClose={() => setShowResult(false)}
          onRematch={rematch}
          onNew={() => navigate(snap.mode === "pvp" ? "/new/online" : snap.mode === "ai" ? "/new/human" : "/new/arena")}
          onCopyPgn={copyPgn}
        />
      )}
    </div>
  );
}
