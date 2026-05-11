import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultGallery } from "@/components/ResultGallery";
import type { GenerationItem } from "@/components/GenerationCard";

function makeItem(overrides: Partial<GenerationItem> = {}): GenerationItem {
  return {
    id: "item-1",
    styleId: "id_photo_basic",
    styleLabel: "일반 증명사진",
    status: "idle",
    ...overrides,
  };
}

describe("ResultGallery — empty state", () => {
  it("renders a placeholder message when items is empty", () => {
    render(<ResultGallery items={[]} />);
    expect(
      screen.getByText(/이미지를 업로드하고 스타일을 선택해주세요/),
    ).toBeInTheDocument();
  });

  it("does NOT render the placeholder when items is non-empty", () => {
    render(
      <ResultGallery
        items={[makeItem({ id: "x1", status: "generating" })]}
      />,
    );
    expect(
      screen.queryByText(/이미지를 업로드하고 스타일을 선택해주세요/),
    ).not.toBeInTheDocument();
  });
});

describe("ResultGallery — rendering items", () => {
  it("renders one GenerationCard per item", () => {
    const items: GenerationItem[] = [
      makeItem({ id: "a", styleId: "id_photo_basic", status: "generating" }),
      makeItem({ id: "b", styleId: "passport", status: "generating" }),
      makeItem({
        id: "c",
        styleId: "watercolor",
        status: "completed",
        imageUrl: "https://example.test/c.webp",
      }),
    ];
    render(<ResultGallery items={items} />);
    expect(screen.getByTestId("generation-card-a")).toBeInTheDocument();
    expect(screen.getByTestId("generation-card-b")).toBeInTheDocument();
    expect(screen.getByTestId("generation-card-c")).toBeInTheDocument();
  });

  it("renders a mix of completed and failed correctly", () => {
    const items: GenerationItem[] = [
      makeItem({
        id: "ok",
        status: "completed",
        imageUrl: "https://example.test/ok.webp",
      }),
      makeItem({ id: "bad", status: "failed", error: "Replicate 5xx" }),
    ];
    render(<ResultGallery items={items} />);
    // completed card has the result image
    const img = document.querySelector(
      'img[src="https://example.test/ok.webp"]',
    );
    expect(img).not.toBeNull();
    // failed card shows the error message
    expect(screen.getByText(/Replicate 5xx/)).toBeInTheDocument();
  });
});

describe("ResultGallery — callbacks pass-through", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes onDownload(id) through to the completed card", () => {
    const onDownload = vi.fn();
    const item = makeItem({
      id: "dl-1",
      status: "completed",
      imageUrl: "https://example.test/dl.webp",
    });
    render(<ResultGallery items={[item]} onDownload={onDownload} />);

    fireEvent.click(screen.getByTestId("generation-download"));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledWith("dl-1");
  });

  it("passes onCopy(id) through to the completed card", () => {
    const onCopy = vi.fn();
    const item = makeItem({
      id: "cp-1",
      status: "completed",
      imageUrl: "https://example.test/cp.webp",
    });
    render(<ResultGallery items={[item]} onCopy={onCopy} />);

    fireEvent.click(screen.getByTestId("generation-copy"));
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledWith("cp-1");
  });

  it("passes onRetry(id) through to a failed card", () => {
    const onRetry = vi.fn();
    const item = makeItem({
      id: "rt-1",
      status: "failed",
      error: "boom",
    });
    render(<ResultGallery items={[item]} onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId("generation-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith("rt-1");
  });

  it("does NOT render retry button when onRetry is omitted on a failed item", () => {
    const item = makeItem({ id: "no-retry", status: "failed", error: "x" });
    render(<ResultGallery items={[item]} />);
    expect(
      screen.queryByTestId("generation-retry"),
    ).not.toBeInTheDocument();
  });
});

describe("ResultGallery — grid layout", () => {
  it("uses a responsive grid (mobile 2-col, sm+ 3-4col) wrapper", () => {
    render(
      <ResultGallery
        items={[
          makeItem({ id: "g1", status: "generating" }),
          makeItem({ id: "g2", status: "generating" }),
        ]}
        className="custom-cls"
      />,
    );
    const grid = screen.getByTestId("result-gallery");
    // sanity: appended className respected, and there's a grid class
    expect(grid.className).toMatch(/grid/);
    expect(grid.className).toMatch(/grid-cols-2/);
    expect(grid.className).toMatch(/custom-cls/);
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
});
afterEach(() => {
  vi.restoreAllMocks();
});
