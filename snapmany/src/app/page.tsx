"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { UploadPanel } from "@/components/UploadPanel";
import { StylePicker } from "@/components/StylePicker";
import { ResultGallery } from "@/components/ResultGallery";
import type {
  GenerationItem,
  GenerationStatus,
} from "@/components/GenerationCard";
import type { ImageMeta } from "@/components/uploadProcessor";
import { STYLES } from "@/config/styles";
import { DEFAULT_CONFIG, loadConfig, type AppConfig } from "@/lib/remoteConfig";

// --- State ---

type ImageState = { dataUrl: string; meta: ImageMeta } | null;

type State = {
  image: ImageState;
  selectedIds: string[];
  items: GenerationItem[];
  config: AppConfig;
};

type Action =
  | { type: "set_image"; payload: ImageState }
  | { type: "set_selected"; payload: string[] }
  | { type: "set_config"; payload: AppConfig }
  | { type: "start_generation"; payload: { items: GenerationItem[] } }
  | {
      type: "update_item";
      payload: { id: string; patch: Partial<GenerationItem> };
    }
  | { type: "reset_items" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set_image":
      return { ...state, image: action.payload };
    case "set_selected":
      return { ...state, selectedIds: action.payload };
    case "set_config":
      return { ...state, config: action.payload };
    case "start_generation":
      return { ...state, items: action.payload.items };
    case "update_item":
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.payload.id
            ? { ...it, ...action.payload.patch }
            : it,
        ),
      };
    case "reset_items":
      return { ...state, items: [] };
    default:
      return state;
  }
}

const INITIAL_STATE: State = {
  image: null,
  selectedIds: [],
  items: [],
  config: DEFAULT_CONFIG,
};

// --- Helpers ---

// 동시 생성 요청을 1.5 s 간격으로 분산해서 Replicate burst(=1, 6 RPM at low credit) 제한과 충돌하지 않도록 한다.
// 서버 wrapper에 429 retry 안전망이 있으므로 분산은 정중한 정도면 충분.
// 단일 호출이면 지연 0 — 즉시 시작.
const STAGGER_MS = 1500;

function labelOf(styleId: string): string {
  return STYLES.find((s) => s.id === styleId)?.label ?? styleId;
}

function statusFromOk(ok: boolean): GenerationStatus {
  return ok ? "completed" : "failed";
}

// --- Page ---

export default function Home() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load RC once on mount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await loadConfig();
        if (!cancelled) dispatch({ type: "set_config", payload: cfg });
      } catch {
        // loadConfig already swallows; this is just safety.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { image, selectedIds, items, config } = state;

  // Style picker props derived from RC (spread to drop readonly).
  const enabledStyleIds = useMemo(
    () => [...config.enabled_styles],
    [config.enabled_styles],
  );
  const styleOrder = useMemo(
    () => [...config.style_order],
    [config.style_order],
  );

  const maintenance = config.maintenance_mode === true;
  const canGenerate =
    !maintenance && image !== null && selectedIds.length > 0;

  // --- Fetch logic (shared by initial run + retry) ---

  const runGeneration = useCallback(
    async (
      itemId: string,
      styleId: string,
      imageDataUrl: string,
    ): Promise<void> => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageDataUrl, styleId }),
        });
        const json = (await res.json()) as {
          ok: boolean;
          imageUrl?: string;
          error?: string;
        };
        if (json.ok) {
          dispatch({
            type: "update_item",
            payload: {
              id: itemId,
              patch: {
                status: statusFromOk(true),
                imageUrl: json.imageUrl,
                error: undefined,
              },
            },
          });
        } else {
          dispatch({
            type: "update_item",
            payload: {
              id: itemId,
              patch: {
                status: "failed",
                error: json.error ?? "생성에 실패했습니다",
              },
            },
          });
        }
      } catch {
        dispatch({
          type: "update_item",
          payload: {
            id: itemId,
            patch: { status: "failed", error: "네트워크 오류" },
          },
        });
      }
    },
    [],
  );

  // --- Handlers ---

  const handleImageReady = useCallback(
    (dataUrl: string, meta: ImageMeta) => {
      dispatch({ type: "set_image", payload: { dataUrl, meta } });
      setUploadError(null);
    },
    [],
  );

  const handleUploadError = useCallback((msg: string) => {
    setUploadError(msg);
  }, []);

  const handleSelectionChange = useCallback((next: string[]) => {
    dispatch({ type: "set_selected", payload: next });
  }, []);

  const handleGenerate = useCallback(() => {
    if (!canGenerate || !image) return;
    const fresh: GenerationItem[] = selectedIds.map((styleId) => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${styleId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      styleId,
      styleLabel: labelOf(styleId),
      status: "generating" as const,
    }));
    dispatch({ type: "start_generation", payload: { items: fresh } });

    // 각 fetch를 STAGGER_MS 간격으로 시작 (Replicate burst 제한 회피).
    // 응답은 여전히 병렬 — 시작 시점만 분산.
    void Promise.allSettled(
      fresh.map(
        (it, i) =>
          new Promise<void>((resolve) => {
            const delay = i * STAGGER_MS;
            const start = () => {
              runGeneration(it.id, it.styleId, image.dataUrl).finally(() =>
                resolve(),
              );
            };
            if (delay <= 0) start();
            else setTimeout(start, delay);
          }),
      ),
    );
  }, [canGenerate, image, selectedIds, runGeneration]);

  const handleDownload = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item?.imageUrl) return;
      try {
        const res = await fetch(item.imageUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `snapmany-${item.styleId}.webp`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        // Fallback: open in new tab so user can save manually.
        try {
          window.open(item.imageUrl, "_blank", "noopener");
        } catch {
          // ignore
        }
      }
    },
    [items],
  );

  const handleCopy = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item?.imageUrl) return;
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof (globalThis as { ClipboardItem?: unknown }).ClipboardItem !==
            "undefined"
        ) {
          const res = await fetch(item.imageUrl);
          const blob = await res.blob();
          const CI = (globalThis as unknown as {
            ClipboardItem: new (
              data: Record<string, Blob>,
            ) => unknown;
          }).ClipboardItem;
          const clipboardItem = new CI({ [blob.type]: blob }) as unknown;
          await (
            navigator.clipboard as unknown as {
              write: (items: unknown[]) => Promise<void>;
            }
          ).write([clipboardItem]);
        }
      } catch (e) {
        console.warn("[snapmany] clipboard copy failed", e);
      }
    },
    [items],
  );

  const handleRetry = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || !image) return;
      dispatch({
        type: "update_item",
        payload: {
          id,
          patch: {
            status: "generating",
            error: undefined,
            imageUrl: undefined,
          },
        },
      });
      void runGeneration(id, item.styleId, image.dataUrl);
    },
    [items, image, runGeneration],
  );

  // --- Render ---

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight">
              {config.ui_copy.title ?? "SnapMany"}
            </h1>
            <span className="hidden sm:inline text-xs text-muted">
              {config.ui_copy.subtitle ?? "한 장의 사진으로 여러 스타일을"}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {maintenance && (
        <div
          data-testid="maintenance-banner"
          role="alert"
          className="border-b border-border bg-accent/10 px-4 py-3 text-center text-sm text-foreground"
        >
          현재 서비스가 점검 중입니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

      <section className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-28 sm:pb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            1. 이미지 업로드
          </h2>
          <UploadPanel
            onImageReady={handleImageReady}
            onError={handleUploadError}
            maxSizeBytes={config.max_upload_size_mb * 1024 * 1024}
          />
          {uploadError && (
            <p
              data-testid="upload-error"
              className="text-xs text-red-500 mt-1"
            >
              {uploadError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            2. 스타일 선택
          </h2>
          <StylePicker
            selectedIds={selectedIds}
            onChange={handleSelectionChange}
            enabledStyleIds={enabledStyleIds}
            styleOrder={styleOrder}
          />
        </div>

        {/* Desktop generate button (sticky version sits at bottom of viewport on mobile) */}
        <div className="hidden sm:flex justify-end">
          <button
            type="button"
            data-testid="generate-button-desktop"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={[
              "px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors",
              canGenerate
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-card text-muted cursor-not-allowed border border-border",
            ].join(" ")}
          >
            {config.ui_copy.generateButton ?? "생성하기"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            3. 결과
          </h2>
          <ResultGallery
            items={items}
            onDownload={handleDownload}
            onCopy={handleCopy}
            onRetry={handleRetry}
          />
        </div>
      </section>

      {/* Sticky mobile generate button */}
      <div className="sm:hidden sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur px-4 py-3">
        <button
          type="button"
          data-testid="generate-button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={[
            "w-full px-4 py-3 rounded-xl font-semibold text-base transition-colors",
            canGenerate
              ? "bg-accent text-white hover:bg-accent-hover"
              : "bg-card text-muted cursor-not-allowed border border-border",
          ].join(" ")}
        >
          {canGenerate
            ? `${config.ui_copy.generateButton ?? "생성하기"} (${selectedIds.length})`
            : maintenance
              ? "점검 중입니다"
              : config.ui_copy.generateButton ?? "생성하기"}
        </button>
      </div>

      <footer className="border-t border-border bg-background mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-muted text-center">
          SnapMany · 한 장의 사진으로 여러 스타일을 한 번에
        </div>
      </footer>
    </main>
  );
}

// --- ThemeToggle (inline; ductcanvas pattern) ---

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (typeof document === "undefined") return;
    if (next) {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        /* ignore */
      }
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      className="rounded-lg border border-border p-2 text-muted hover:text-foreground hover:border-accent transition-colors text-sm"
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {dark ? "라이트" : "다크"}
    </button>
  );
}
