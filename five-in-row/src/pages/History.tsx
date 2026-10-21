import { useEffect, useState } from "react";
import { playerLabel, type GameSummary } from "../../shared/types";
import { Avatar } from "../components/PlayerBar";
import { api } from "../lib/api";
import { formatTimeControl, formatUsd, REASON_TEXT, timeAgo } from "../lib/format";
import { myGameIds } from "../lib/player";
import { navigate } from "../router";

function resultBadge(g: GameSummary) {
  if (g.status === "waiting") return <span className="badge d">대기</span>;
  if (g.status === "playing") return <span className="badge live">LIVE</span>;
  if (g.result === "b") return <span className="badge b">흑 승</span>;
  if (g.result === "w") return <span className="badge w">백 승</span>;
  if (g.result === "draw") return <span className="badge d">무승부</span>;
  return <span className="badge x">중단</span>;
}

const MODE_TEXT = { pvp: "사람 대 사람", ai: "사람 대 AI", arena: "AI 대 AI" } as const;

export function GameRow({ g }: { g: GameSummary }) {
  const black = g.status === "waiting" && g.black.kind === "human" && !g.black.name ? "대기 중" : playerLabel(g.black);
  const white = g.status === "waiting" && g.white.kind === "human" && !g.white.name ? "대기 중" : playerLabel(g.white);
  return (
    <div className="game-row" role="button" tabIndex={0} onClick={() => navigate(`/game/${g.id}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/game/${g.id}`)}>
      <div className="row-avatars">
        <Avatar player={g.black} size={34} />
        <Avatar player={g.white} size={34} />
      </div>
      <div className="row-main">
        <strong>
          {black} <span className="vs">vs</span> {white}
        </strong>
        <span>
          {MODE_TEXT[g.mode]} · {formatTimeControl(g.initialMs, g.incrementMs)}
          {g.status === "ended" && ` · ${g.moveCount}수`}
          {g.reason ? ` · ${REASON_TEXT[g.reason]}` : ""} · {timeAgo(g.createdAt)}
        </span>
      </div>
      <div className="row-side">
        {resultBadge(g)}
        {g.mode !== "pvp" && <span className="row-cost">{formatUsd(g.costUsd)}</span>}
      </div>
    </div>
  );
}

export function History() {
  const [tab, setTab] = useState<"mine" | "recent">("mine");
  const [mine, setMine] = useState<GameSummary[] | null>(null);
  const [recent, setRecent] = useState<GameSummary[] | null>(null);

  useEffect(() => {
    api.lookup(myGameIds()).then(setMine, () => setMine([]));
    api.lobby().then((l) => setRecent(l.recent), () => setRecent([]));
  }, []);

  const games = tab === "mine" ? mine : recent;
  return (
    <div className="page">
      <header className="page-header">
        <h1>대국 기록</h1>
      </header>
      <div className="segmented">
        <button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>내 대국</button>
        <button className={tab === "recent" ? "active" : ""} onClick={() => setTab("recent")}>모두의 최근 대국</button>
      </div>
      {games === null ? (
        <div className="skeleton" />
      ) : games.length === 0 ? (
        <p className="hint-text">{tab === "mine" ? "이 기기에서 둔 대국이 아직 없어요." : "아직 끝난 대국이 없어요."}</p>
      ) : (
        <div className="game-list">
          {games.map((g) => (
            <GameRow key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}
