import { useEffect, useState } from "react";
import { EFFORT_TEXT, ENGINES, LIMITS, type Effort, type EngineId, type GameMode, type PlayerConfig, type QuotaInfo } from "../../shared/types";
import { IconBack } from "../components/Icons";
import { PieceSvg } from "../components/Piece";
import { Avatar } from "../components/PlayerBar";
import { api, type CreateGame, type EngineWithStatus } from "../lib/api";
import { navigate } from "../router";

const TIMES = [1, 3, 5, 10, 15, 30];
const INCREMENTS = [0, 2, 5, 10];
type AiPick = { engine: EngineId; effort: Effort };

function toPlayer(pick: AiPick): PlayerConfig {
  return ENGINES[pick.engine].efforts ? { kind: "ai", ...pick } : { kind: "ai", engine: pick.engine };
}

function EnginePicker({ value, onChange, engines, label }: { value: AiPick; onChange: (v: AiPick) => void; engines: EngineWithStatus[]; label?: string }) {
  const e = ENGINES[value.engine];
  return (
    <div className="picker">
      {label && <div className="field-label">{label}</div>}
      <div className="engine-grid">
        {engines.map((eng) => (
          <button
            key={eng.id}
            className={`engine-card${value.engine === eng.id ? " active" : ""}`}
            style={{ ["--accent" as string]: eng.color }}
            disabled={!eng.available}
            onClick={() => onChange({ ...value, engine: eng.id })}
          >
            <Avatar player={{ kind: "ai", engine: eng.id }} size={40} />
            <strong>{eng.name}</strong>
            <span>{eng.vendor}</span>
            {!eng.available && <em>API 키 없음</em>}
          </button>
        ))}
      </div>
      {e.efforts && (
        <>
          <div className="segmented">
            {e.efforts.map((eff) => (
              <button key={eff} className={value.effort === eff ? "active" : ""} onClick={() => onChange({ ...value, effort: eff })}>
                {EFFORT_TEXT[eff].label} effort
              </button>
            ))}
          </div>
          <p className="hint-text">{EFFORT_TEXT[value.effort].description}</p>
        </>
      )}
      <p className="hint-text">{e.description}</p>
      <p className="hint-text faint">{e.model} · {e.pricing}</p>
    </div>
  );
}

const TITLE: Record<GameMode, string> = { pvp: "사람과 대국", ai: "AI와 대국", arena: "AI vs AI 대결" };

export function NewGame({ mode }: { mode: GameMode }) {
  const [engines, setEngines] = useState<EngineWithStatus[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [listed, setListed] = useState(true);
  const [opponent, setOpponent] = useState<AiPick>({ engine: "haiku", effort: "medium" });
  const [white, setWhite] = useState<AiPick>({ engine: "jev", effort: "medium" });
  const [black, setBlack] = useState<AiPick>({ engine: "luna", effort: "medium" });
  const [side, setSide] = useState<"w" | "random" | "b">("w");
  const [minutes, setMinutes] = useState(10);
  const [increment, setIncrement] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limits = mode === "pvp" ? LIMITS.pvp : LIMITS.ai;
  const outOfQuota = mode !== "pvp" && quota !== null && quota.remaining <= 0;

  useEffect(() => {
    if (mode === "pvp") return;
    api.engines().then(setEngines, (e) => setError(e.message));
    api.quota().then(setQuota, () => {});
  }, [mode]);

  const start = async () => {
    setBusy(true);
    setError(null);
    const time = { initialMs: minutes * 60_000, incrementMs: increment * 1000 };
    let body: CreateGame;
    if (mode === "pvp") body = { mode, color: side, listed, ...time };
    else if (mode === "ai") body = { mode, color: side, opponent: toPlayer(opponent), ...time };
    else body = { mode, white: toPlayer(white), black: toPlayer(black), ...time };
    try {
      const g = await api.create(body);
      navigate(`/game/${g.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="page new-game">
      <header className="page-header">
        <button className="icon-btn" onClick={() => navigate("/")} aria-label="뒤로"><IconBack /></button>
        <h1>{TITLE[mode]}</h1>
      </header>

      {mode !== "arena" ? (
        <section className="card">
          {mode === "ai" && <EnginePicker value={opponent} onChange={setOpponent} engines={engines} label="상대 AI" />}
          <div className="field-label">내 기물</div>
          <div className="side-pick">
            {(["w", "random", "b"] as const).map((s) => (
              <button key={s} className={`side-option${side === s ? " active" : ""}`} onClick={() => setSide(s)}>
                {s === "random" ? (
                  <span className="random-piece">
                    <PieceSvg type="k" color="w" />
                    <PieceSvg type="k" color="b" />
                  </span>
                ) : (
                  <PieceSvg type="k" color={s} />
                )}
                <span>{s === "w" ? "백" : s === "b" ? "흑" : "랜덤"}</span>
              </button>
            ))}
          </div>
          {mode === "pvp" && (
            <>
              <div className="field-label">공개 설정</div>
              <div className="segmented">
                <button className={listed ? "active" : ""} onClick={() => setListed(true)}>로비에 공개</button>
                <button className={!listed ? "active" : ""} onClick={() => setListed(false)}>링크로만 초대</button>
              </div>
              <p className="hint-text">
                {listed ? "홈의 ‘상대를 기다리는 방’에 보여서 누구나 참가할 수 있어요." : "방을 만든 뒤 링크를 보낸 사람만 참가할 수 있어요."} 30분 동안 아무도 오지 않으면 방이 닫혀요.
              </p>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="card">
            <EnginePicker value={white} onChange={setWhite} engines={engines} label="백 (White)" />
          </section>
          <div className="vs-badge">VS</div>
          <section className="card">
            <EnginePicker value={black} onChange={setBlack} engines={engines} label="흑 (Black)" />
          </section>
        </>
      )}

      <section className="card">
        <div className="field-label">
          시간 제한 <strong>{minutes}분</strong>
          {increment > 0 && <strong> + {increment}초</strong>}
        </div>
        <div className="chips">
          {TIMES.filter((t) => t <= limits.maxMinutes).map((t) => (
            <button key={t} className={`chip${minutes === t ? " active" : ""}`} onClick={() => setMinutes(t)}>
              {t}분
            </button>
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={limits.maxMinutes}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="분 단위 시간 조절"
        />
        <div className="field-label">수당 추가 시간</div>
        <div className="chips">
          {INCREMENTS.map((t) => (
            <button key={t} className={`chip${increment === t ? " active" : ""}`} onClick={() => setIncrement(t)}>
              {t === 0 ? "없음" : `+${t}초`}
            </button>
          ))}
        </div>
        <p className="hint-text faint">
          {mode === "pvp"
            ? "상대가 들어오면 백의 시계부터 흐릅니다. 먼저 시간이 다 되면 패배합니다."
            : "AI가 API 응답을 기다리는 시간도 시계에서 차감됩니다. 먼저 시간이 다 되면 패배합니다."}
        </p>
      </section>

      {mode !== "pvp" && quota && (
        <p className="quota-line">
          오늘 남은 AI 대국 <strong>{quota.remaining}</strong> / {quota.limit}판 · 매일 자정(한국 시간)에 다시 채워져요
        </p>
      )}
      {error && <div className="error-banner">{error}</div>}
      <div className="sticky-cta">
        <button className="btn primary big" disabled={busy || outOfQuota || (mode !== "pvp" && engines.length === 0)} onClick={start}>
          {busy ? "준비 중…" : outOfQuota ? "오늘의 AI 대국을 모두 썼어요" : mode === "pvp" ? "방 만들기" : "대국 시작"}
        </button>
      </div>
    </div>
  );
}
