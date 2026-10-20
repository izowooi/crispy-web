import { useEffect, useState } from "react";
import { ENGINES, playerLabel, variantLabel, type Effort, type EngineId, type PlayerConfig, type StatRow } from "../../shared/types";
import { Avatar } from "../components/PlayerBar";
import { api, type Matchup } from "../lib/api";
import { formatTokens, formatUsd } from "../lib/format";
import { navigate } from "../router";

function label(p: PlayerConfig) {
  return p.kind === "ai" ? ENGINES[p.engine].name : "사람";
}

function keyToPlayer(key: string): PlayerConfig {
  if (key === "human") return { kind: "human" };
  const [engine, variant] = key.split(":") as [EngineId, string | undefined];
  return variant ? { kind: "ai", engine, effort: variant as Effort } : { kind: "ai", engine };
}

function keyLabel(key: string) {
  const p = keyToPlayer(key);
  return p.kind === "ai" ? playerLabel(p) : "사람";
}

export function Stats() {
  const [data, setData] = useState<{ rows: StatRow[]; matchups: Matchup[] } | null>(null);
  useEffect(() => {
    api.stats().then(setData, () => setData({ rows: [], matchups: [] }));
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>엔진 순위</h1>
      </header>
      {!data ? (
        <div className="skeleton" />
      ) : data.rows.length === 0 ? (
        <div className="card empty-card">
          <p>완료된 대국이 쌓이면 승률, 비용, 응답 속도를 비교해 드려요.</p>
          <button className="btn primary" onClick={() => navigate("/new/arena")}>AI vs AI 대결 시작</button>
        </div>
      ) : (
        <>
          <div className="leaderboard">
            {data.rows.map((r, i) => {
              const winRate = r.games ? (r.wins + r.draws / 2) / r.games : 0;
              return (
                <div className="lb-row" key={r.key} style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="lb-rank">{i + 1}</span>
                  <Avatar player={r.player} size={40} />
                  <div className="lb-main">
                    <strong>
                      {label(r.player)}
                      {variantLabel(r.player) && <small> {variantLabel(r.player)}</small>}
                    </strong>
                    <div className="lb-bar">
                      <i className="w" style={{ width: `${(r.wins / r.games) * 100}%` }} />
                      <i className="d" style={{ width: `${(r.draws / r.games) * 100}%` }} />
                      <i className="l" style={{ width: `${(r.losses / r.games) * 100}%` }} />
                    </div>
                    <span className="lb-sub">
                      {r.wins}승 {r.draws}무 {r.losses}패 · 평균 응답 {r.calls ? (r.thinkMs / r.calls / 1000).toFixed(2) : "—"}초
                      {r.player.kind === "ai" && ` · 대국당 ${formatUsd(r.costUsd / r.games)} · ${formatTokens(r.inputTokens + r.outputTokens)} tok`}
                      {r.fallbacks > 0 && ` · 대체 ${r.fallbacks}`}
                    </span>
                  </div>
                  <span className={`lb-score${winRate < 0.5 ? " low" : ""}`}>{Math.round(winRate * 100)}%</span>
                </div>
              );
            })}
          </div>

          {data.matchups.length > 0 && (
            <section className="list-section">
              <h2>AI 맞대결 전적</h2>
              <div className="matchups">
                {data.matchups.map((m) => (
                  <div className="matchup" key={`${m.a}|${m.b}`}>
                    <div className="mu-side">
                      <Avatar player={keyToPlayer(m.a)} size={30} />
                      <span>{keyLabel(m.a)}</span>
                    </div>
                    <div className="mu-score">
                      <strong>{m.aWins}</strong>
                      <span>{m.draws}무</span>
                      <strong>{m.bWins}</strong>
                    </div>
                    <div className="mu-side right">
                      <span>{keyLabel(m.b)}</span>
                      <Avatar player={keyToPlayer(m.b)} size={30} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
