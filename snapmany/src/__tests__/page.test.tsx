import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// --------- Mocks (must come BEFORE importing Page) ---------

// Hoisted shared values so the vi.mock factory can reference them.
const { DEFAULT_TEST_CONFIG, mockLoadConfig } = vi.hoisted(() => {
  const cfg = {
    enabled_styles: [
      "id_photo_basic",
      "passport",
      "business_profile",
      "watercolor",
      "oil_painting",
      "3d_character",
      "chibi_sticker",
      "anime_pastel",
      "manga_inking",
      "bw_studio",
      "marble_bust",
      "kbeauty_glow",
      "editorial_glam",
      "pixel_8bit",
      "lowpoly_geo",
    ],
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
    style_order: [
      "id_photo_basic",
      "passport",
      "business_profile",
      "watercolor",
      "oil_painting",
      "3d_character",
      "chibi_sticker",
      "anime_pastel",
      "manga_inking",
      "bw_studio",
      "marble_bust",
      "kbeauty_glow",
      "editorial_glam",
      "pixel_8bit",
      "lowpoly_geo",
    ],
  };
  return {
    DEFAULT_TEST_CONFIG: cfg,
    mockLoadConfig: vi.fn(async () => cfg),
  };
});

vi.mock("@/lib/remoteConfig", () => ({
  DEFAULT_CONFIG: DEFAULT_TEST_CONFIG,
  loadConfig: () => mockLoadConfig(),
}));

// Stub processImage so jsdom doesn't try canvas/Image work.
vi.mock("@/components/uploadProcessor", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/uploadProcessor")
  >("@/components/uploadProcessor");
  return {
    ...actual,
    processImage: vi.fn(async () => ({
      dataUrl: "data:image/webp;base64,AAAA",
      meta: {
        width: 800,
        height: 600,
        sizeBytes: 12345,
        type: "image/webp",
      },
    })),
  };
});

import Home from "@/app/page";

// --------- Helpers ---------

function makeFile(opts: { type: string; size: number; name?: string }): File {
  const f = new File(["x"], opts.name ?? "img.jpg", { type: opts.type });
  Object.defineProperty(f, "size", { value: opts.size, configurable: true });
  return f;
}

async function fireFileChange(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
  });
  fireEvent.change(input);
  await Promise.resolve();
  await Promise.resolve();
}

function installFetchMock(
  perStyleResponse?: (
    styleId: string,
  ) => { ok: boolean; status?: number; body: Record<string, unknown> },
) {
  global.fetch = vi.fn(async (_url: string, options?: RequestInit) => {
    const body = JSON.parse(String(options?.body ?? "{}")) as {
      styleId: string;
    };
    const out =
      perStyleResponse?.(body.styleId) ?? {
        ok: true,
        body: {
          ok: true,
          styleId: body.styleId,
          imageUrl: `https://replicate.delivery/${body.styleId}.webp`,
        },
      };
    return {
      ok: out.ok,
      status: out.status ?? (out.ok ? 200 : 502),
      json: async () => out.body,
    } as Response;
  }) as unknown as typeof fetch;
}

// --------- Tests ---------

describe("page — initial render", () => {
  beforeEach(() => {
    mockLoadConfig.mockReset();
    mockLoadConfig.mockResolvedValue(DEFAULT_TEST_CONFIG);
    installFetchMock();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the SnapMany title in the header", async () => {
    render(<Home />);
    expect(screen.getAllByText(/SnapMany/i).length).toBeGreaterThan(0);
  });

  it("shows the empty-state placeholder before any generation", async () => {
    render(<Home />);
    expect(
      screen.getByText(/이미지를 업로드하고 스타일을 선택해주세요/),
    ).toBeInTheDocument();
  });

  it("disables the '생성하기' button when no image and no styles are selected", async () => {
    render(<Home />);
    const btn = screen.getByTestId("generate-button") as HTMLButtonElement;
    expect(btn).toBeDisabled();
  });
});

describe("page — generation flow", () => {
  beforeEach(() => {
    mockLoadConfig.mockReset();
    mockLoadConfig.mockResolvedValue(DEFAULT_TEST_CONFIG);
    installFetchMock();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enables the button after image upload + style selection, fires fetch per styleId, completes cards", async () => {
    render(<Home />);

    // Upload an image
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await fireFileChange(input, makeFile({ type: "image/jpeg", size: 1024 }));

    // Wait for preview to appear (state set after async processImage)
    await waitFor(() => {
      const preview = document.querySelector('img[src^="data:image/webp"]');
      expect(preview).not.toBeNull();
    });

    // Select two styles in the first tab
    const styleA = screen.getByTestId("style-card-id_photo_basic");
    const styleB = screen.getByTestId("style-card-passport");
    fireEvent.click(styleA);
    fireEvent.click(styleB);

    // The button should now be enabled
    const btn = screen.getByTestId("generate-button") as HTMLButtonElement;
    expect(btn).not.toBeDisabled();

    // Click generate
    fireEvent.click(btn);

    // Two fetch calls (one per styleId)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const calls = fetchMock.mock.calls.map(
      (c) => JSON.parse(String((c[1] as RequestInit).body)) as { styleId: string },
    );
    const calledIds = calls.map((c) => c.styleId).sort();
    expect(calledIds).toEqual(["id_photo_basic", "passport"]);

    // Both cards complete with an <img>
    await waitFor(() => {
      const imgs = document.querySelectorAll(
        'img[src^="https://replicate.delivery/"]',
      );
      expect(imgs.length).toBe(2);
    });
  });

  it("partial failure: one styleId returns ok:false → that card is failed, the other is completed", async () => {
    installFetchMock((styleId) => {
      if (styleId === "passport") {
        return {
          ok: false,
          status: 502,
          body: {
            ok: false,
            styleId,
            error: "생성에 실패했습니다",
          },
        };
      }
      return {
        ok: true,
        body: {
          ok: true,
          styleId,
          imageUrl: `https://replicate.delivery/${styleId}.webp`,
        },
      };
    });

    render(<Home />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await fireFileChange(input, makeFile({ type: "image/jpeg", size: 1024 }));
    await waitFor(() => {
      const preview = document.querySelector('img[src^="data:image/webp"]');
      expect(preview).not.toBeNull();
    });

    fireEvent.click(screen.getByTestId("style-card-id_photo_basic"));
    fireEvent.click(screen.getByTestId("style-card-passport"));

    fireEvent.click(screen.getByTestId("generate-button"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // One card succeeded
    await waitFor(() => {
      expect(
        document.querySelector(
          'img[src="https://replicate.delivery/id_photo_basic.webp"]',
        ),
      ).not.toBeNull();
    });

    // One card failed with the error message
    await waitFor(() => {
      expect(screen.getByText(/생성에 실패했습니다/)).toBeInTheDocument();
    });
  });
});

describe("page — maintenance mode", () => {
  beforeEach(() => {
    mockLoadConfig.mockReset();
    mockLoadConfig.mockResolvedValue({
      ...DEFAULT_TEST_CONFIG,
      maintenance_mode: true,
    });
    installFetchMock();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a maintenance banner and disables generation when maintenance_mode is true", async () => {
    render(<Home />);

    // wait for the RC effect to land
    await waitFor(() => expect(mockLoadConfig).toHaveBeenCalled());

    // banner shows
    await waitFor(() => {
      expect(screen.getByTestId("maintenance-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("maintenance-banner").textContent ?? "").toMatch(
      /점검 중/,
    );

    // Even with a fake selection, the button should be disabled.
    const btn = screen.getByTestId("generate-button") as HTMLButtonElement;
    expect(btn).toBeDisabled();
  });
});

// silence act() warnings
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation((msg, ...rest) => {
    if (
      typeof msg === "string" &&
      (msg.includes("act(") || msg.includes("not wrapped in act"))
    ) {
      return;
    }
    console.warn(msg, ...rest);
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});
