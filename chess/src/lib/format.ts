import type { EndReason, GameSnapshot } from "../../shared/types";

export function formatClock(ms: number): string {
  const t = Math.max(0, ms);
  const totalSec = Math.floor(t / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (t < 10_000) return `${s}.${Math.floor((t % 1000) / 100)}`;
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatUsd(n: number): string {
  if (n === 0) return "$0";
  if (n < 0.01) return `$${n.toFixed(5)}`;
  return `$${n.toFixed(4)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function formatSec(ms: number): string {
  return ms >= 60_000 ? `${Math.floor(ms / 60_000)}분 ${Math.round((ms % 60_000) / 1000)}초` : `${(ms / 1000).toFixed(1)}초`;
}

export function formatTimeControl(initialMs: number, incrementMs: number): string {
  const min = initialMs / 60_000;
  return `${Number.isInteger(min) ? min : min.toFixed(1)}분${incrementMs ? ` + ${incrementMs / 1000}초` : ""}`;
}

export const REASON_TEXT: Record<EndReason, string> = {
  checkmate: "체크메이트",
  stalemate: "스테일메이트",
  threefold: "3회 동형 반복",
  "fifty-move": "50수 규칙",
  insufficient: "기물 부족",
  timeout: "시간 초과",
  "timeout-vs-insufficient": "시간 초과 · 상대 기물 부족",
  resign: "기권",
  agreement: "합의 무승부",
  aborted: "취소됨",
  expired: "참가자 없음",
};

export function remainingMs(snap: GameSnapshot, color: "w" | "b", receivedAt: number): number {
  const base = snap.clock[color];
  return snap.clock.running === color ? base - (Date.now() - receivedAt) : base;
}

export function timeAgo(ts: number): string {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "방금";
  if (d < 3600) return `${Math.floor(d / 60)}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
  return new Date(ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
