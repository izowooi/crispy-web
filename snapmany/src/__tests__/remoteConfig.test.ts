import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// firebase 모듈 전체 모킹.
// `firebase/app`와 `firebase/remote-config`를 별도 mock.
const mockInitializeApp = vi.fn();
const mockGetApps = vi.fn(() => [] as unknown[]);
const mockGetRemoteConfig = vi.fn();
const mockFetchAndActivate = vi.fn();
const mockGetValue = vi.fn();

vi.mock("firebase/app", () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
}));

vi.mock("firebase/remote-config", () => ({
  getRemoteConfig: mockGetRemoteConfig,
  fetchAndActivate: mockFetchAndActivate,
  getValue: mockGetValue,
}));

describe("lib/remoteConfig — Firebase Remote Config wrapper", () => {
  beforeEach(() => {
    vi.resetModules();
    mockInitializeApp.mockReset();
    mockGetApps.mockReset();
    mockGetApps.mockReturnValue([]);
    mockGetRemoteConfig.mockReset();
    mockFetchAndActivate.mockReset();
    mockGetValue.mockReset();
    // Suppress console.warn noise.
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports DEFAULT_CONFIG with all 8 keys defined", async () => {
    const mod = await import("@/lib/remoteConfig");
    const cfg = mod.DEFAULT_CONFIG;
    expect(Array.isArray(cfg.enabled_styles)).toBe(true);
    expect(cfg.enabled_styles.length).toBeGreaterThan(0);
    expect(typeof cfg.default_style_count).toBe("number");
    expect(typeof cfg.max_upload_size_mb).toBe("number");
    expect(typeof cfg.maintenance_mode).toBe("boolean");
    expect(cfg.replicate_model_by_style).toBeTypeOf("object");
    expect(typeof cfg.show_beta_styles).toBe("boolean");
    expect(cfg.ui_copy).toBeTypeOf("object");
    expect(Array.isArray(cfg.style_order)).toBe(true);
  });

  it("DEFAULT_CONFIG enabled_styles and style_order match the 15 known styleIds", async () => {
    const mod = await import("@/lib/remoteConfig");
    const stylesMod = await import("@/config/styles");
    const ids = stylesMod.STYLE_IDS as readonly string[];
    expect(new Set(mod.DEFAULT_CONFIG.enabled_styles)).toEqual(new Set(ids));
    expect(new Set(mod.DEFAULT_CONFIG.style_order)).toEqual(new Set(ids));
    expect(mod.DEFAULT_CONFIG.enabled_styles.length).toBe(15);
  });

  it("returns DEFAULT_CONFIG when running on the server (no window)", async () => {
    // jsdom 환경이지만 window를 임시로 제거 (Object.defineProperty + delete-like 트릭은 jsdom에서 깨지기 쉬워서 typeof 비교 사용).
    // 대신 globalThis.window를 undefined로 패치한다.
    const originalWindow = globalThis.window;
    // @ts-expect-error - simulate SSR
    delete globalThis.window;
    try {
      const mod = await import("@/lib/remoteConfig");
      const result = await mod.loadConfig();
      expect(result).toEqual(mod.DEFAULT_CONFIG);
      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(mockFetchAndActivate).not.toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("returns DEFAULT_CONFIG when fetchAndActivate throws", async () => {
    mockGetRemoteConfig.mockReturnValue({
      defaultConfig: {},
      settings: { minimumFetchIntervalMillis: 0 },
    });
    mockFetchAndActivate.mockRejectedValueOnce(new Error("network down"));

    const mod = await import("@/lib/remoteConfig");
    const result = await mod.loadConfig();
    expect(result).toEqual(mod.DEFAULT_CONFIG);
  });

  it("returns DEFAULT_CONFIG when initializeApp throws", async () => {
    mockInitializeApp.mockImplementationOnce(() => {
      throw new Error("invalid config");
    });

    const mod = await import("@/lib/remoteConfig");
    const result = await mod.loadConfig();
    expect(result).toEqual(mod.DEFAULT_CONFIG);
  });

  it("parses RC values into AppConfig when fetch succeeds", async () => {
    mockGetRemoteConfig.mockReturnValue({
      defaultConfig: {},
      settings: { minimumFetchIntervalMillis: 0 },
    });
    mockFetchAndActivate.mockResolvedValueOnce(true);

    // getValue(rc, key) → { asString, asNumber, asBoolean } 인터페이스 모사
    const valueMap: Record<string, { s: string; n: number; b: boolean }> = {
      enabled_styles: { s: JSON.stringify(["id_photo_basic", "passport"]), n: 0, b: false },
      default_style_count: { s: "5", n: 5, b: false },
      max_upload_size_mb: { s: "8", n: 8, b: false },
      maintenance_mode: { s: "true", n: 0, b: true },
      replicate_model_by_style: { s: JSON.stringify({ passport: "stability-ai/x" }), n: 0, b: false },
      show_beta_styles: { s: "true", n: 0, b: true },
      ui_copy: { s: JSON.stringify({ title: "Override" }), n: 0, b: false },
      style_order: { s: JSON.stringify(["passport", "id_photo_basic"]), n: 0, b: false },
    };
    mockGetValue.mockImplementation((_rc: unknown, key: string) => {
      const v = valueMap[key];
      if (!v) return { asString: () => "", asNumber: () => 0, asBoolean: () => false };
      return { asString: () => v.s, asNumber: () => v.n, asBoolean: () => v.b };
    });

    const mod = await import("@/lib/remoteConfig");
    const result = await mod.loadConfig();
    expect(result.enabled_styles).toEqual(["id_photo_basic", "passport"]);
    expect(result.default_style_count).toBe(5);
    expect(result.max_upload_size_mb).toBe(8);
    expect(result.maintenance_mode).toBe(true);
    expect(result.replicate_model_by_style).toEqual({ passport: "stability-ai/x" });
    expect(result.show_beta_styles).toBe(true);
    expect(result.ui_copy).toEqual({ title: "Override" });
    expect(result.style_order).toEqual(["passport", "id_photo_basic"]);
  });

  it("falls back to defaults for individual keys when RC values are malformed JSON", async () => {
    mockGetRemoteConfig.mockReturnValue({
      defaultConfig: {},
      settings: { minimumFetchIntervalMillis: 0 },
    });
    mockFetchAndActivate.mockResolvedValueOnce(true);

    // 모든 string 키가 invalid JSON을 반환하도록
    mockGetValue.mockImplementation((_rc: unknown, key: string) => {
      // number/boolean 키는 0/false 반환 → falsy → default fallback
      if (key === "default_style_count" || key === "max_upload_size_mb") {
        return { asString: () => "", asNumber: () => 0, asBoolean: () => false };
      }
      if (key === "maintenance_mode" || key === "show_beta_styles") {
        return { asString: () => "", asNumber: () => 0, asBoolean: () => false };
      }
      return { asString: () => "{not json", asNumber: () => 0, asBoolean: () => false };
    });

    const mod = await import("@/lib/remoteConfig");
    const result = await mod.loadConfig();
    // JSON 파싱 실패 → default로 회귀
    expect(result.enabled_styles).toEqual(mod.DEFAULT_CONFIG.enabled_styles);
    expect(result.style_order).toEqual(mod.DEFAULT_CONFIG.style_order);
    expect(result.ui_copy).toEqual(mod.DEFAULT_CONFIG.ui_copy);
    expect(result.replicate_model_by_style).toEqual(mod.DEFAULT_CONFIG.replicate_model_by_style);
    // number/boolean: 0/false → falsy → default 사용
    expect(result.default_style_count).toBe(mod.DEFAULT_CONFIG.default_style_count);
    expect(result.max_upload_size_mb).toBe(mod.DEFAULT_CONFIG.max_upload_size_mb);
    expect(result.maintenance_mode).toBe(false);
    expect(result.show_beta_styles).toBe(false);
  });

  it("caches the loaded config across subsequent calls", async () => {
    mockGetRemoteConfig.mockReturnValue({
      defaultConfig: {},
      settings: { minimumFetchIntervalMillis: 0 },
    });
    mockFetchAndActivate.mockResolvedValue(true);
    mockGetValue.mockImplementation(() => ({
      asString: () => "",
      asNumber: () => 0,
      asBoolean: () => false,
    }));

    const mod = await import("@/lib/remoteConfig");
    await mod.loadConfig();
    await mod.loadConfig();
    await mod.loadConfig();
    // fetchAndActivate은 최초 1회만 호출되어야 함 (cached).
    expect(mockFetchAndActivate).toHaveBeenCalledTimes(1);
  });

  it("does not call initializeApp again when getApps reports an existing app", async () => {
    mockGetApps.mockReturnValue([{ name: "[DEFAULT]" }]);
    mockGetRemoteConfig.mockReturnValue({
      defaultConfig: {},
      settings: { minimumFetchIntervalMillis: 0 },
    });
    mockFetchAndActivate.mockResolvedValueOnce(true);
    mockGetValue.mockImplementation(() => ({
      asString: () => "",
      asNumber: () => 0,
      asBoolean: () => false,
    }));

    const mod = await import("@/lib/remoteConfig");
    await mod.loadConfig();
    expect(mockInitializeApp).not.toHaveBeenCalled();
  });
});
