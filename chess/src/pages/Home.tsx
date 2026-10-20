import { useEffect, useState } from "react";
import type { GameSummary, QuotaInfo } from "../../shared/types";
import { IconEdit, IconRobot, IconSwords, IconUsers } from "../components/Icons";
import { PieceSvg } from "../components/Piece";
import { api, type Lobby } from "../lib/api";
import { formatTimeControl, timeAgo } from "../lib/format";
import { nickname, setNickname } from "../lib/player";
import { navigate } from "../router";
import { GameRow } from "./History";

function OpenRoom({ g, onJoin, busy }: { g: GameSummary; onJoin: () => void; busy: boolean }) {
  const host = g.white.kind === "human" && g.white.name ? g.white : g.black;
  const hostColor = host === g.white ? "백" : "흑";
  return (
    <div className="open-room">
      <PieceSvg type="k" color={host === g.white ? "w" : "b"} className="open-room-piece" />
      <div className="row-main">
        <strong>{host.kind === "human" ? host.name : ""}</strong>
        <span>
          {formatTimeControl(g.initialMs, g.incrementMs)} · 방장 {hostColor} · {timeAgo(g.createdAt)}
        </span>
      </div>
      <button className="btn primary small" disabled={busy} onClick={onJoin}>
        참가
      </button>
    </div>
  );
}

export function Home() {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [name, setName] = useState(nickname());
  const [editing, setEditing] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.lobby().then((l) => alive && setLobby(l), () => alive && setLobby({ open: [], live: [], recent: [] }));
    void load();
    api.quota().then(setQuota, () => {});
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const join = async (id: string) => {
    setJoining(id);
    setError(null);
    try {
      await api.join(id);
      navigate(`/game/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setJoining(null);
    }
  };

  const saveName = () => {
    setNickname(name);
    setName(nickname());
    setEditing(false);
  };

  const open = lobby?.open ?? [];
  const live = lobby?.live ?? [];
  const recent = lobby?.recent.slice(0, 6) ?? [];

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-pieces" aria-hidden="true">
          <PieceSvg type="n" color="b" className="hp hp1" />
          <PieceSvg type="k" color="w" className="hp hp2" />
          <PieceSvg type="q" color="b" className="hp hp3" />
          <PieceSvg type="r" color="w" className="hp hp4" />
        </div>
        <h1>체스 한 판 할래요?</h1>
        <p>가입 없이 바로 두는 무료 체스.<br />누구와도, AI와도, AI끼리도 겨뤄 보세요.</p>
        <div className="nickname">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
            >
              <input value={name} maxLength={16} autoFocus onChange={(e) => setName(e.target.value)} onBlur={saveName} aria-label="닉네임" />
            </form>
          ) : (
            <button className="nickname-chip" onClick={() => setEditing(true)}>
              <span>내 이름</span> <strong>{name}</strong> <IconEdit />
            </button>
          )}
        </div>
      </section>

      <section className="mode-cards three">
        <button className="mode-card green" onClick={() => navigate("/new/online")}>
          <span className="mode-icon"><IconUsers /></span>
          <span>
            <strong>사람과 대국</strong>
            <small>방을 만들거나 열린 방에 참가</small>
          </span>
        </button>
        <button className="mode-card blue" onClick={() => navigate("/new/human")}>
          <span className="mode-icon"><IconRobot /></span>
          <span>
            <strong>AI와 대국</strong>
            <small>Jev · Decisions · Haiku 중 골라서</small>
          </span>
        </button>
        <button className="mode-card purple" onClick={() => navigate("/new/arena")}>
          <span className="mode-icon"><IconSwords /></span>
          <span>
            <strong>AI vs AI 관전</strong>
            <small>두 AI를 붙여 실력·비용 비교</small>
          </span>
        </button>
      </section>
      {quota && (
        <p className="quota-line">
          오늘 남은 AI 대국 <strong>{quota.remaining}</strong> / {quota.limit}판 · 사람과의 대국은 무제한
        </p>
      )}

      {error && <div className="error-banner">{error}</div>}

      <section className="list-section">
        <div className="section-head">
          <h2>상대를 기다리는 방</h2>
          <button className="link" onClick={() => navigate("/new/online")}>방 만들기</button>
        </div>
        {lobby === null ? (
          <div className="skeleton" />
        ) : open.length === 0 ? (
          <p className="hint-text">지금 열린 방이 없어요. 방을 만들고 링크를 친구에게 보내 보세요!</p>
        ) : (
          <div className="game-list">
            {open.map((g) => (
              <OpenRoom key={g.id} g={g} busy={joining === g.id} onJoin={() => join(g.id)} />
            ))}
          </div>
        )}
      </section>

      {live.length > 0 && (
        <section className="list-section">
          <h2>지금 진행 중 · 관전</h2>
          <div className="game-list">{live.map((g) => <GameRow key={g.id} g={g} />)}</div>
        </section>
      )}

      <section className="list-section">
        <div className="section-head">
          <h2>최근 대국</h2>
          {recent.length > 0 && <button className="link" onClick={() => navigate("/history")}>전체 보기</button>}
        </div>
        {lobby === null ? (
          <div className="skeleton" />
        ) : recent.length === 0 ? (
          <p className="hint-text">아직 끝난 대국이 없어요. 첫 대국을 시작해 보세요!</p>
        ) : (
          <div className="game-list">{recent.map((g) => <GameRow key={g.id} g={g} />)}</div>
        )}
      </section>
    </div>
  );
}
