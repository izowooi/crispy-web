// Firebase Remote Config wrapper (클라이언트 전용).
// 진실의 원천은 DEFAULT_CONFIG. RC는 그 위에 덮어쓰는 오버레이.
// 모든 fetch 실패는 console.warn + DEFAULT_CONFIG 반환 — 앱은 절대 죽지 않는다.
// SSR / edge runtime: window가 없으면 즉시 DEFAULT_CONFIG 반환.

import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { getClientApp } from "@/lib/firebase";
import { STYLE_IDS } from "@/config/styles";

export type AppConfig = {
  readonly enabled_styles: readonly string[];
  readonly default_style_count: number;
  readonly max_upload_size_mb: number;
  readonly maintenance_mode: boolean;
  readonly replicate_model_by_style: Readonly<Record<string, string>>;
  readonly show_beta_styles: boolean;
  readonly ui_copy: Readonly<Record<string, string>>;
  readonly style_order: readonly string[];
};

const ALL_STYLE_IDS: readonly string[] = STYLE_IDS;

export const DEFAULT_CONFIG: AppConfig = {
  enabled_styles: ALL_STYLE_IDS,
  default_style_count: 3,
  max_upload_size_mb: 10,
  maintenance_mode: false,
  replicate_model_by_style: {},
  show_beta_styles: false,
  ui_copy: {
    title: "SnapMany",
    subtitle: "한 장의 사진으로 여러 스타일을",
    generateButton: "생성하기",
    uploadHint: "JPG·PNG·WEBP, 최대 10MB",
  },
  style_order: ALL_STYLE_IDS,
};

let cached: AppConfig | null = null;

function parseJsonArrayOfStrings(raw: string, fallback: readonly string[]): readonly string[] {
  try {
    const v: unknown = JSON.parse(raw);
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
      return v as string[];
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function parseJsonStringMap(
  raw: string,
  fallback: Readonly<Record<string, string>>
): Readonly<Record<string, string>> {
  try {
    const v: unknown = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === "string") out[k] = val;
      }
      return out;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function loadConfig(): Promise<AppConfig> {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return DEFAULT_CONFIG;

  try {
    const app = getClientApp();
    const rc = getRemoteConfig(app);
    // defaultConfig는 RC가 fetch 전에도 getValue 호출 가능하게 해줌.
    (rc as unknown as { defaultConfig: Record<string, string | number | boolean> }).defaultConfig = {
      enabled_styles: JSON.stringify(DEFAULT_CONFIG.enabled_styles),
      default_style_count: DEFAULT_CONFIG.default_style_count,
      max_upload_size_mb: DEFAULT_CONFIG.max_upload_size_mb,
      maintenance_mode: DEFAULT_CONFIG.maintenance_mode,
      replicate_model_by_style: JSON.stringify(DEFAULT_CONFIG.replicate_model_by_style),
      show_beta_styles: DEFAULT_CONFIG.show_beta_styles,
      ui_copy: JSON.stringify(DEFAULT_CONFIG.ui_copy),
      style_order: JSON.stringify(DEFAULT_CONFIG.style_order),
    };
    rc.settings.minimumFetchIntervalMillis = 60_000;
    await fetchAndActivate(rc);

    const enabledStyles = parseJsonArrayOfStrings(
      getValue(rc, "enabled_styles").asString(),
      DEFAULT_CONFIG.enabled_styles
    );
    const styleOrder = parseJsonArrayOfStrings(
      getValue(rc, "style_order").asString(),
      DEFAULT_CONFIG.style_order
    );
    const replicateModelByStyle = parseJsonStringMap(
      getValue(rc, "replicate_model_by_style").asString(),
      DEFAULT_CONFIG.replicate_model_by_style
    );
    const uiCopy = parseJsonStringMap(
      getValue(rc, "ui_copy").asString(),
      DEFAULT_CONFIG.ui_copy
    );

    const defaultStyleCount = getValue(rc, "default_style_count").asNumber();
    const maxUploadSizeMb = getValue(rc, "max_upload_size_mb").asNumber();
    const maintenanceMode = getValue(rc, "maintenance_mode").asBoolean();
    const showBetaStyles = getValue(rc, "show_beta_styles").asBoolean();

    cached = {
      enabled_styles: enabledStyles,
      default_style_count:
        defaultStyleCount && defaultStyleCount > 0
          ? defaultStyleCount
          : DEFAULT_CONFIG.default_style_count,
      max_upload_size_mb:
        maxUploadSizeMb && maxUploadSizeMb > 0
          ? maxUploadSizeMb
          : DEFAULT_CONFIG.max_upload_size_mb,
      maintenance_mode: maintenanceMode,
      replicate_model_by_style: replicateModelByStyle,
      show_beta_styles: showBetaStyles,
      ui_copy: uiCopy,
      style_order: styleOrder,
    };
    return cached;
  } catch (err) {
    console.warn("[remoteConfig] fetch failed, using DEFAULT_CONFIG", err);
    return DEFAULT_CONFIG;
  }
}

// 테스트 격리용 (프로덕션 미사용).
export function __resetRemoteConfigCacheForTests(): void {
  cached = null;
}
