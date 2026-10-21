import { useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  Color,
  EmoteId,
  EngineInfo,
  GameMode,
  GameSnapshot,
  GameSummary,
  PlayerConfig,
  QuotaInfo,
  ServerMessage,
  StatRow,
} from "../../shared/types";
import type { DoubleThreeRule } from "../../shared/omok";
import { nickname, playerToken, rememberGame } from "./player";

export interface EngineWithStatus extends EngineInfo {
  available: boolean;
}

export interface Matchup {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  draws: number;
}

export interface Lobby {
  open: GameSummary[];
  live: GameSummary[];
  recent: GameSummary[];
}

export interface CreateGame {
  mode: GameMode;
  opponent?: PlayerConfig;
  white?: PlayerConfig;
  black?: PlayerConfig;
  color?: Color | "random";
  initialMs: number;
  incrementMs: number;
  listed?: boolean;
  doubleThree: DoubleThreeRule;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Player-Token": playerToken(), ...init?.headers },
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw Object.assign(new Error(data.error ?? res.statusText), { data, status: res.status });
  return data as T;
}

export const api = {
  engines: () => request<EngineWithStatus[]>("/engines"),
  quota: () => request<QuotaInfo>("/quota"),
  lobby: () => request<Lobby>("/lobby"),
  lookup: (ids: string[]) => request<GameSummary[]>("/games/lookup", { method: "POST", body: JSON.stringify({ ids }) }),
  game: (id: string) => request<GameSnapshot>(`/games/${id}`),
  stats: () => request<{ rows: StatRow[]; matchups: Matchup[] }>("/stats"),
  create: async (body: CreateGame) => {
    const snap = await request<GameSnapshot>("/games", { method: "POST", body: JSON.stringify({ ...body, name: nickname() }) });
    rememberGame(snap.id);
    return snap;
  },
  join: async (id: string) => {
    const snap = await request<GameSnapshot>(`/games/${id}/join`, { method: "POST", body: JSON.stringify({ name: nickname() }) });
    rememberGame(id);
    return snap;
  },
};

export interface LiveGame {
  snap: GameSnapshot | null;
  /** Local time at which `snap` arrived; clocks tick relative to this. */
  receivedAt: number;
  error: string | null;
  connected: boolean;
  /** Latest emote, keyed by a counter so repeats re-trigger the bubble. */
  emote: { color: Color; id: EmoteId; n: number } | null;
  /** Last error message the room sent back for one of our actions. */
  rejected: { message: string; n: number } | null;
  send: (msg: ClientMessage) => boolean;
  accept: (s: GameSnapshot) => void;
}

export function useGame(id: string): LiveGame {
  const [state, setState] = useState<{ snap: GameSnapshot | null; receivedAt: number }>({ snap: null, receivedAt: 0 });
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [emote, setEmote] = useState<LiveGame["emote"]>(null);
  const [rejected, setRejected] = useState<LiveGame["rejected"]>(null);
  const latest = useRef<GameSnapshot | null>(null);
  const socket = useRef<WebSocket | null>(null);

  const accept = (s: GameSnapshot) => {
    const prev = latest.current;
    // Socket pushes and HTTP responses can race; never step backwards.
    if (prev && prev.id === s.id && s.moves.length < prev.moves.length) return;
    latest.current = s;
    setState({ snap: s, receivedAt: Date.now() });
  };

  useEffect(() => {
    latest.current = null;
    setState({ snap: null, receivedAt: 0 });
    setError(null);
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let counter = 0;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/api/games/${id}/ws`);
      socket.current = ws;
      ws.onopen = () => {
        retry = 0;
        setConnected(true);
        ws.send(JSON.stringify({ t: "hello", token: playerToken() } satisfies ClientMessage));
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data) as ServerMessage;
        if (msg.t === "snap") accept(msg.snap);
        else if (msg.t === "emote") setEmote({ color: msg.color, id: msg.id, n: ++counter });
        else if (msg.t === "error") setRejected({ message: msg.message, n: ++counter });
      };
      ws.onclose = () => {
        setConnected(false);
        if (socket.current === ws) socket.current = null;
        if (closed) return;
        // Finished games no longer change, so stop reconnecting once we have the final state.
        if (latest.current?.status === "ended" && retry > 0) return;
        timer = setTimeout(connect, Math.min(8000, 600 * 2 ** retry++));
      };
    };

    api.game(id).then(accept, (err) => setError(err.message));
    connect();
    return () => {
      closed = true;
      clearTimeout(timer);
      socket.current?.close();
      socket.current = null;
    };
  }, [id]);

  const send = (msg: ClientMessage) => {
    const ws = socket.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  };

  return { ...state, error, connected, emote, rejected, send, accept };
}

/** Re-renders on an interval while `active`, for ticking clocks. */
export function useTicker(active: boolean, ms = 100) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [active, ms]);
}
