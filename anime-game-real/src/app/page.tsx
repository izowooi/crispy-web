"use client";
import { useEffect, useRef, useState } from "react";
import {
  MODELS,
  targetSize,
  outputSize,
  type ResolutionMode,
  type ModelId,
} from "../lib/images";
import { estimateOutput } from "../lib/pricing";
import { createZip } from "../lib/zip";
type Picture = {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
};
type Result = Picture & { model: ModelId; sourceId: string };
const quips = [
  "그림 속 주인공이 실사 촬영장으로 이동 중이에요.",
  "헤어·메이크업 팀이 픽셀 하나까지 챙기고 있어요.",
  "조명 감독님, 현실감 한 스푼 더 부탁드려요.",
  "2D에서 3D로 넘어오는 문을 열고 있어요.",
  "의상팀이 갑옷의 마지막 광택을 다듬고 있어요.",
  "주인공의 첫 실사 데뷔, 조금만 기다려주세요.",
];
const modelLabel = (id: ModelId) =>
  id === "banana" ? "NanoBanana2.1" : MODELS.find((m) => m.id === id)!.label;
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
    [sources, setSources] = useState<Picture[]>([]),
    [results, setResults] = useState<Result[]>([]),
    [models, setModels] = useState<ModelId[]>(["flare", "sunburst", "banana"]);
  const [resolution, setResolution] = useState<ResolutionMode>("1k");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [left, setLeft] = useState(""),
    [right, setRight] = useState(""),
    [position, setPosition] = useState(50),
    [side, setSide] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [completed, setCompleted] = useState(0),
    [total, setTotal] = useState(0),
    [zipping, setZipping] = useState(false);
  const costRows = models.map((model) => {
    const estimates = (
      images.length ? images : [{ width: 1024, height: 1024 }]
    ).map((image) =>
      estimateOutput(image.width, image.height, model, resolution),
    );
    return {
      model,
      tokens: estimates.reduce((sum, e) => sum + e.tokens, 0),
      usd: estimates.reduce((sum, e) => sum + e.usd, 0),
    };
  });
  const input = useRef<HTMLInputElement>(null),
    comparison = useRef<HTMLElement>(null);
  const originals = [
    ...sources,
    ...images.filter((p) => !sources.some((s) => s.id === p.id)),
  ];
  const all: (Picture | Result)[] = [...originals, ...results];
  const a = all.find((p) => p.id === left),
    b = all.find((p) => p.id === right);
  const label = (p: Picture | Result) =>
    "model" in p ? modelLabel(p.model) : "원본";
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    setElapsed(0);
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [busy]);
  function choose(id: string, which: "left" | "right") {
    if (which === "left") setLeft(id);
    else setRight(id);
  }
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
    setCompleted(0);
    setTotal(images.length * models.length);
    const tasks = images.flatMap((original) =>
      models.map((model) => ({ original, model })),
    );
    let next = 0,
      first = true;
    async function run() {
      while (next < tasks.length) {
        const { original, model } = tasks[next++];
        try {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              images: [original],
              models: [model],
              resolution,
            }),
          });
          const data = (await response.json()) as {
            error?: string;
            results?: { src: string; error?: string }[];
          };
          if (!response.ok)
            throw Error(data.error || "생성 요청에 실패했습니다.");
          const item = data.results?.[0];
          if (!item || item.error)
            throw Error(item?.error || "이미지를 받지 못했습니다.");
          const size = outputSize(original.width, original.height, resolution);
          const result: Result = {
            ...original,
            ...size,
            id: crypto.randomUUID(),
            model,
            sourceId: original.id,
            src: await resize(item.src, size.width, size.height),
          };
          setSources((p) =>
            p.some((x) => x.id === original.id) ? p : [...p, original],
          );
          setResults((p) => [...p, result]);
          if (first) {
            first = false;
            setLeft(original.id);
            setRight(result.id);
          }
        } catch (e) {
          setError(
            (p) =>
              `${p}${p ? " / " : ""}${modelLabel(model)}: ${(e as Error).message}`,
          );
        } finally {
          setCompleted((p) => p + 1);
        }
      }
    }
    try {
      const health = await fetch("/api/health");
      if (!health.ok) throw Error("서비스 연결을 확인해주세요.");
      await Promise.all(
        Array.from({ length: Math.min(3, tasks.length) }, () => run()),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setZipping(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const files = results.map((r, index) => ({
        name: `${String(index + 1).padStart(2, "0")}-${modelLabel(r.model)}-${r.width}x${r.height}.png`,
        bytes: Uint8Array.from(atob(r.src.split(",")[1]), (c) =>
          c.charCodeAt(0),
        ),
      }));
      const url = URL.createObjectURL(createZip(files));
      const link = document.createElement("a");
      link.href = url;
      link.download = "anime-to-real.zip";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("ZIP을 만들지 못했습니다. 다시 시도해주세요.");
    } finally {
      setZipping(false);
    }
  }
  function card(p: Picture | Result) {
    const selectedLeft = left === p.id,
      selectedRight = right === p.id;
    return (
      <article
        key={p.id}
        className={`result-card${selectedLeft ? " selected-left" : ""}${selectedRight ? " selected-right" : ""}`}
      >
        <img src={p.src} alt={label(p)} />
        <div className="card-content">
          <strong>
            {label(p)}{" "}
            <small className="image-dimensions">
              {p.width} × {p.height}
            </small>
          </strong>
          <div className="placement">
            <button
              aria-label={`${label(p)} 왼쪽에 놓기`}
              aria-pressed={selectedLeft}
              className="place-left"
              onClick={() => choose(p.id, "left")}
            >
              ← 왼쪽
            </button>
            <button
              aria-label={`${label(p)} 오른쪽에 놓기`}
              aria-pressed={selectedRight}
              className="place-right"
              onClick={() => choose(p.id, "right")}
            >
              오른쪽 →
            </button>
          </div>
        </div>
      </article>
    );
  }
  return (
    <>
      <header>
        <h1>
          상상 속 그 장면, <em>현실이라면.</em>
        </h1>
        <button
          className="quiet"
          aria-label="라이트 다크 테마 전환"
          onClick={() => {
            const dark = document.documentElement.classList.toggle("dark");
            localStorage.setItem("theme", dark ? "dark" : "light");
          }}
        >
          ◐ 테마
        </button>
      </header>
      <main>
        <section className="workspace">
          <div className="panel">
            <div className="paneltop">
              <span>당신의 한 장</span>
              <span className="muted">{images.length} / 4</span>
            </div>
            {images.length > 0 && (
              <div className="tiles">
                {images.map((p) => (
                  <div className="tile" key={p.id}>
                    <img src={p.src} alt="업로드 이미지" />
                    <button
                      aria-label="업로드 이미지 삭제"
                      disabled={busy}
                      onClick={() =>
                        setImages((v) => v.filter((x) => x.id !== p.id))
                      }
                    >
                      ×
                    </button>
                    <small>
                      {p.width} × {p.height}
                      {outputSize(p.width, p.height, resolution).width !==
                        p.width ||
                      outputSize(p.width, p.height, resolution).height !==
                        p.height
                        ? ` → ${outputSize(p.width, p.height, resolution).width} × ${outputSize(p.width, p.height, resolution).height}`
                        : ""}
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
                <small>JPG, PNG, WebP · 최대 4장</small>
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
            <fieldset className="resolution-options" disabled={busy}>
              <legend>작은 이미지 화질 개선</legend>
              <div className="resolution-segments">
                {(
                  [
                    { id: "original", label: "원본 크기" },
                    { id: "1k", label: "최소 1K · 기본" },
                    { id: "2k", label: "최소 2K" },
                  ] as const
                ).map((mode) => (
                  <label
                    key={mode.id}
                    className={resolution === mode.id ? "active" : ""}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      value={mode.id}
                      checked={resolution === mode.id}
                      onChange={() => setResolution(mode.id)}
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
              <small>
                선택한 기준보다 작으면 비율을 유지해 개선해요. 이미 충분히 크면
                그대로 유지해요.
              </small>
            </fieldset>
            <details className="cost-estimate">
              <summary>
                {images.length ? "선택한 이미지" : "정사각형 1장 예시"} · 예상
                출력 비용 $
                {costRows.reduce((sum, row) => sum + row.usd, 0).toFixed(3)}
              </summary>
              <div className="cost-rows">
                {costRows.map((row) => (
                  <div key={row.model}>
                    <span>{modelLabel(row.model)}</span>
                    <span>
                      약 {row.tokens.toLocaleString()} 출력 토큰 · $
                      {row.usd.toFixed(5)}
                    </span>
                  </div>
                ))}
              </div>
              <p>
                일반 API 이미지 출력 비용의 추정치입니다. OpenAI는 medium 품질
                기준이며 실제 요청 크기로 계산합니다. 입력
                이미지·프롬프트·추론·재시도 비용 및 세금은 별도이며, 비율과 실제
                사용량에 따라 달라집니다. 원본 크기를 선택해도 모델의 최소 생성
                크기에 따른 비용은 발생합니다.
              </p>
              <p>
                이미지 출력 100만 토큰당 $30 · 2026-11-03 요금 기준 ·{" "}
                <a
                  href="https://developers.openai.com/api/docs/guides/image-generation"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenAI 요금 근거
                </a>{" "}
                ·{" "}
                <a
                  href="https://aistudio.google.com/docs/pricing#gemini-nano-banana-2.1"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google 요금 근거
                </a>
              </p>
            </details>
            <div className="actions">
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
                      {modelLabel(m.id)}
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
                    ? "실사 촬영 중…"
                    : `실사로 만들기${images.length ? ` · ${images.length * models.length}장` : ""}`}
                </span>
                <span>↗</span>
              </button>
            </div>
            {busy && (
              <div className="generation-status" role="status">
                <div className="status-top">
                  <span className="spinner" aria-hidden="true" />
                  <strong>
                    {quips[Math.floor(elapsed / 8) % quips.length]}
                  </strong>
                  <span>
                    {completed} / {total} · {Math.floor(elapsed / 60)}:
                    {String(elapsed % 60).padStart(2, "0")}
                  </span>
                </div>
                <progress
                  max={total}
                  value={completed}
                  aria-label="생성 진행"
                />
                <small>
                  완성되는 이미지부터 아래에 나타나요. 모델에 따라 몇 분 걸릴 수
                  있어요.
                </small>
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>
        <details className="usage">
          <summary>이미지 처리 · 개인정보 · 이용 한도</summary>
          <p>
            ‘작은 이미지 화질 개선’은 원본 크기 / 최소 1K(기본) / 최소 2K 중에서
            선택합니다. 선택한 기준보다 긴 변이 작을 때만 비율을 유지해
            개선합니다. 원본 크기를 선택하면 확대하지 않습니다. 긴 변이 2K를
            넘는 입력은 2048px로 줄이며, 원본은 비교용으로 그대로 남습니다.
            파일당 30MB까지 올릴 수 있으며 모든 요청은 배치 대기 없이 일반 API
            요금으로 즉시 처리됩니다.
          </p>
          <p>
            이미지를 앱 서버나 갤러리에 보관하지 않습니다. 생성에 필요한
            이미지가 선택한 AI 제공사로 전달되며 제공사의 보관 정책이
            적용됩니다. 이미지는 현재 탭에서만 보관하고 새로고침하면 사라집니다.
          </p>
          <p>
            브라우저당 하루 500회, 모델별 월 $50 한도로 운영합니다. 이미지 한
            장·모델 한 개를 요청할 때마다 1회로 계산합니다. 날짜와 월은 UTC
            기준입니다. 동시 요청의 초과 지출을 막기 위한 예약 비용 때문에 한도
            근처에서 미리 제한될 수 있습니다.
          </p>
        </details>
        {all.length > 1 && (
          <section className="results comparison" ref={comparison}>
            <div className="section-heading">
              <h2>두 시선을 겹쳐보세요</h2>
              <button className="quiet" onClick={() => setSide((v) => !v)}>
                {side ? "슬라이더로 비교" : "나란히 비교"}
              </button>
            </div>
            <div className="compare-controls">
              {(["left", "right"] as const).map((which) => (
                <label key={which} className={`compare-select ${which}`}>
                  <span>{which === "left" ? "왼쪽" : "오른쪽"}</span>
                  <select
                    aria-label={`${which === "left" ? "왼쪽" : "오른쪽"} 비교 이미지`}
                    value={which === "left" ? left : right}
                    onChange={(e) => choose(e.target.value, which)}
                  >
                    <option value="">이미지 선택</option>
                    {originals.map((original, index) => (
                      <optgroup label={`이미지 ${index + 1}`} key={original.id}>
                        {[
                          original,
                          ...results.filter((r) => r.sourceId === original.id),
                        ].map((p) => (
                          <option key={p.id} value={p.id}>
                            {label(p)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {a &&
              b &&
              (side ? (
                <div className="side-by-side">
                  <img src={a.src} alt={`왼쪽 ${label(a)}`} />
                  <img src={b.src} alt={`오른쪽 ${label(b)}`} />
                </div>
              ) : (
                <div
                  className="slider-stage"
                  style={{ aspectRatio: `${a.width}/${a.height}` }}
                >
                  <img src={a.src} alt={`왼쪽 ${label(a)}`} />
                  <div
                    className="overlay"
                    style={{ clipPath: `inset(0 0 0 ${position}%)` }}
                  >
                    <img src={b.src} alt={`오른쪽 ${label(b)}`} />
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
            <div className="section-heading">
              <h2>
                만들어진 장면들 <small>{results.length}장</small>
              </h2>
              <div className="gallery-actions">
                <button
                  className="quiet"
                  onClick={() =>
                    comparison.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  비교 보기 ↑
                </button>
                <button
                  className="zip-button"
                  disabled={zipping}
                  onClick={download}
                >
                  {zipping ? "ZIP 만드는 중…" : "전체 다운로드 · ZIP ↓"}
                </button>
              </div>
            </div>
            <p className="gallery-hint">
              카드에서 왼쪽과 오른쪽을 골라주세요.{" "}
              <span className="left-key">왼쪽은 테라코타</span>,{" "}
              <span className="right-key">오른쪽은 청록색</span> 테두리로
              표시돼요.
            </p>
            {originals
              .filter((p) => results.some((r) => r.sourceId === p.id))
              .map((original, index) => (
                <div className="source-group" key={original.id}>
                  <h3>이미지 {index + 1}</h3>
                  <div className="result-grid">
                    {card(original)}
                    {results
                      .filter((r) => r.sourceId === original.id)
                      .map(card)}
                  </div>
                </div>
              ))}
          </section>
        )}
        <footer>
          <span>ANIME TO REAL</span>
          <span>당신의 상상을, 다른 시선으로.</span>
        </footer>
      </main>
    </>
  );
}
