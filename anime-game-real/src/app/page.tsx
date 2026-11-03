"use client";
import { useRef, useState } from "react";
import { MODELS, targetSize, type ModelId } from "../lib/images";
type Picture = {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
};
type GenerationResponse = {
  cleanup?: string;
  error?: string;
  jobs?: string;
  results?: { index: number; model: string; error?: string; src: string }[];
};
type Result = Picture & { model: string; sourceId: string };
async function resize(src: string, width: number, height: number) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}
export default function Home() {
  const [images, setImages] = useState<Picture[]>([]),
    [results, setResults] = useState<Result[]>([]),
    [models, setModels] = useState<ModelId[]>(["flare", "sunburst", "banana"]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [left, setLeft] = useState(""),
    [right, setRight] = useState(""),
    [position, setPosition] = useState(50),
    [side, setSide] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<Picture[]>([]);
  const all = [
    ...images,
    ...sources.filter((p) => !images.some((i) => i.id === p.id)),
    ...results,
  ];
  const a = all.find((p) => p.id === left),
    b = all.find((p) => p.id === right);
  async function add(files: FileList | null) {
    if (!files) return;
    setError("");
    const next: Picture[] = [];
    for (const file of Array.from(files).slice(0, 4 - images.length))
      try {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw Error("PNG, JPG, WebP 이미지를 선택해주세요.");
        if (file.size > 30 * 1024 * 1024)
          throw Error("파일당 최대 30MB까지 가능합니다.");
        const src = URL.createObjectURL(file);
        try {
          const img = new Image();
          img.src = src;
          await img.decode();
          const size = targetSize(img.naturalWidth, img.naturalHeight);
          next.push({
            id: crypto.randomUUID(),
            name: file.name,
            src: await resize(src, size.width, size.height),
            ...size,
          });
        } finally {
          URL.revokeObjectURL(src);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    setImages((p) => [...p, ...next].slice(0, 4));
    const combined = [...images, ...next];
    if (!left && combined[0]) setLeft(combined[0].id);
    if (!right && combined[1]) setRight(combined[1].id);
    if (input.current) input.current.value = "";
  }
  async function generate() {
    setBusy(true);
    setError("");
    setMessage(
      images.length > 1
        ? "배치 작업을 접수하고 있어요…"
        : "새로운 현실을 만들고 있어요…",
    );
    async function accept(data: GenerationResponse) {
      for (const item of data.results || []) {
        if (item.error) {
          setError((p) => `${p} ${item.model}: ${item.error}`);
          continue;
        }
        const original = images[item.index];
        const result = {
          ...original,
          id: crypto.randomUUID(),
          name: `${original.name} · ${item.model}`,
          model: item.model,
          sourceId: original.id,
          src: await resize(item.src, original.width, original.height),
        };
        setSources((p) =>
          p.some((i) => i.id === original.id) ? p : [...p, original],
        );
        setResults((p) => [...p, result]);
        setLeft(original.id);
        setRight(result.id);
      }
      if (data.cleanup)
        await fetch("/api/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.cleanup }),
        }).catch(() => undefined);
    }
    try {
      let response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, models }),
      });
      let data = (await response.json()) as GenerationResponse;
      if (!response.ok) throw Error(data.error || "생성 요청에 실패했습니다.");
      await accept(data);
      while (data.jobs) {
        setMessage(
          "배치 처리 중 · 이 탭을 열어두세요. 최대 24시간 걸릴 수 있습니다.",
        );
        await new Promise((resolve) => setTimeout(resolve, 15000));
        let next: GenerationResponse;
        try {
          response = await fetch("/api/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: data.jobs }),
          });
          next = (await response.json()) as GenerationResponse;
        } catch {
          setMessage(
            "연결을 다시 확인하고 있어요. 기존 배치 작업은 계속 진행됩니다.",
          );
          continue;
        }
        if (!response.ok) {
          if (response.status >= 500 || response.status === 429) {
            setMessage("잠시 후 같은 배치 작업을 다시 확인합니다.");
            continue;
          }
          throw Error(next.error || "배치 상태 조회에 실패했습니다.");
        }
        await accept(next);
        data = next;
      }
      setMessage("");
    } catch (e) {
      setError((e as Error).message);
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <div className="brand">
          <span>↗</span>another take
          <span
            style={{
              background: "transparent",
              color: "var(--muted)",
              fontSize: 10,
              width: "auto",
              marginLeft: 12,
              letterSpacing: 1,
            }}
          >
            A2R
          </span>
        </div>
        <button
          className="quiet"
          aria-label="라이트 다크 테마 전환"
          onClick={() => {
            const dark = document.documentElement.classList.toggle("dark");
            localStorage.setItem("theme", dark ? "dark" : "light");
          }}
        >
          ◐ <span>테마</span>
        </button>
      </header>
      <main>
        <div className="eyebrow">FROM IMAGINATION TO REALITY</div>
        <h1>
          상상 속 그 장면,
          <br />
          <em>현실이라면.</em>
        </h1>
        <p className="intro">
          애니메이션과 게임 속 한 장을 실사로.
          <br />세 가지 AI의 시선을 나란히 놓고, 직접 비교해보세요.
        </p>
        <section className="workspace">
          <div className="panel">
            <div className="paneltop">
              <span>01 &nbsp; 당신의 한 장</span>
              <span className="muted">{images.length} / 4</span>
            </div>
            {images.length > 0 && (
              <div className="tiles">
                {images.map((p) => (
                  <div className="tile" key={p.id}>
                    <img src={p.src} alt={p.name} />
                    <button
                      aria-label={`${p.name} 삭제`}
                      disabled={busy}
                      onClick={() =>
                        setImages((v) => v.filter((x) => x.id !== p.id))
                      }
                    >
                      ×
                    </button>
                    <small>
                      {p.width} × {p.height}
                    </small>
                  </div>
                ))}
              </div>
            )}
            {images.length < 4 && (
              <label
                className="drop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy) void add(e.dataTransfer.files);
                }}
              >
                <span className="plus">＋</span>
                <strong>이미지를 놓거나 클릭하세요</strong>
                <small>JPG, PNG, WebP · 최대 4장 · 파일당 30MB</small>
                <input
                  ref={input}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  hidden
                  disabled={busy}
                  onChange={(e) => void add(e.target.files)}
                />
              </label>
            )}
            <details>
              <summary>모델 선택 · {models.length}개 사용</summary>
              <div className="choices">
                {MODELS.map((m) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      checked={models.includes(m.id)}
                      disabled={busy}
                      onChange={() =>
                        setModels((p) =>
                          p.includes(m.id)
                            ? p.filter((x) => x !== m.id)
                            : [...p, m.id],
                        )
                      }
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </details>
            <button
              className="generate"
              disabled={!images.length || !models.length || busy}
              onClick={generate}
            >
              <span>
                {busy
                  ? "만드는 중…"
                  : `실사로 만들기${images.length ? ` · ${images.length * models.length}장` : ""}`}
              </span>
              <span>↗</span>
            </button>
            <div className="note">
              원본 크기를 유지합니다. 긴 변이 2K를 넘으면 2048px로 줄여요.
              <br />
              {images.length > 1
                ? "2장 이상은 비용을 아끼는 Batch API로 처리합니다. 최대 24시간 걸릴 수 있어요."
                : "한 장이면 바로 생성합니다. 모델별로 완료 시간이 달라요."}
            </div>
            {message && (
              <p role="status" className="note">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </div>
          <aside className="panel aside">
            <div>
              <div className="eyebrow">ONE SCENE. THREE TAKES.</div>
              <h2>
                A different lens.
                <br />
                The same imagination.
              </h2>
              <div className="model-row">
                {MODELS.map((m) => (
                  <span className="chip" key={m.id}>
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="graphic" aria-hidden="true">
              <span>✧</span>
              <span>↗</span>
            </div>
            <p>
              한 장을 넣고 시작하세요.
              <br />
              결과가 나오면 경계선을 움직여 원본과 비교할 수 있어요.
            </p>
          </aside>
        </section>
        <div className="privacy">
          <span>⌑</span>
          <span>
            이미지를 앱 서버나 갤러리에 보관하지 않습니다. 생성에 필요한
            이미지가 선택한 AI 제공사로 전달됩니다.{" "}
            <details>
              <summary>개인정보와 이용 한도</summary>
              <p>
                이미지는 현재 탭에서만 보관하며 새로고침하면 사라집니다. 배치
                요청은 AI 제공사에 처리 완료까지 보관될 수 있습니다. 제공사의
                보관 정책이 적용됩니다. 브라우저당 하루 500회, 모델별 월 $50
                한도로 운영됩니다.
              </p>
            </details>
          </span>
        </div>
        {all.length > 1 && (
          <section className="results">
            <h2>02 &nbsp; 두 시선을 겹쳐보세요</h2>
            <div className="compare-controls">
              <select
                aria-label="왼쪽 비교 이미지"
                value={left}
                onChange={(e) => setLeft(e.target.value)}
              >
                <option value="">왼쪽 이미지</option>
                {all.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span>↔</span>
              <select
                aria-label="오른쪽 비교 이미지"
                value={right}
                onChange={(e) => setRight(e.target.value)}
              >
                <option value="">오른쪽 이미지</option>
                {all.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button className="quiet" onClick={() => setSide((v) => !v)}>
                {side ? "슬라이더로 비교" : "나란히 비교"}
              </button>
            </div>
            {a &&
              b &&
              (side ? (
                <div className="side-by-side">
                  <img src={a.src} alt={a.name} />
                  <img src={b.src} alt={b.name} />
                </div>
              ) : (
                <div
                  className="slider-stage"
                  style={{ aspectRatio: `${a.width}/${a.height}` }}
                >
                  <img src={a.src} alt={a.name} />
                  <div
                    className="overlay"
                    style={{ clipPath: `inset(0 0 0 ${position}%)` }}
                  >
                    <img src={b.src} alt={b.name} />
                  </div>
                  <div className="divider" style={{ left: `${position}%` }}>
                    <span>↔</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={position}
                    aria-label="이미지 비교 경계선"
                    onChange={(e) => setPosition(Number(e.target.value))}
                  />
                </div>
              ))}
          </section>
        )}
        {results.length > 0 && (
          <section className="results">
            <h2>만들어진 장면들</h2>
            <div className="result-grid">
              {results.map((p) => (
                <article className="result-card" key={p.id}>
                  <img src={p.src} alt={p.name} />
                  <div>
                    <button
                      className="quiet"
                      onClick={() => {
                        setLeft(p.sourceId);
                        setRight(p.id);
                      }}
                    >
                      {p.model} · 비교
                    </button>
                    <a
                      href={p.src}
                      download={`a2r-${p.model}-${p.width}x${p.height}.png`}
                    >
                      다운로드 ↓
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <footer>
          <span>ANOTHER TAKE / ANIME TO REAL</span>
          <span>당신의 상상을, 다른 시선으로.</span>
        </footer>
      </main>
    </>
  );
}
