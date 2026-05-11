import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  GenerationCard,
  type GenerationItem,
} from "@/components/GenerationCard";

function makeItem(overrides: Partial<GenerationItem> = {}): GenerationItem {
  return {
    id: "item-1",
    styleId: "id_photo_basic",
    styleLabel: "일반 증명사진",
    status: "idle",
    ...overrides,
  };
}

describe("GenerationCard — status branches", () => {
  it("shows a spinner and the style label when status is 'idle'", () => {
    render(<GenerationCard item={makeItem({ status: "idle" })} />);
    expect(screen.getByText("일반 증명사진")).toBeInTheDocument();
    expect(screen.getByTestId("generation-spinner")).toBeInTheDocument();
  });

  it("shows a spinner when status is 'generating'", () => {
    render(<GenerationCard item={makeItem({ status: "generating" })} />);
    expect(screen.getByTestId("generation-spinner")).toBeInTheDocument();
    // Korean status text
    expect(screen.getByText(/생성 중/)).toBeInTheDocument();
  });

  it("shows a spinner when status is 'uploading'", () => {
    render(<GenerationCard item={makeItem({ status: "uploading" })} />);
    expect(screen.getByTestId("generation-spinner")).toBeInTheDocument();
  });

  it("renders the result <img> and action buttons when status is 'completed'", () => {
    render(
      <GenerationCard
        item={makeItem({
          status: "completed",
          imageUrl: "https://example.test/r.webp",
        })}
        onDownload={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    const img = document.querySelector(
      'img[src="https://example.test/r.webp"]',
    );
    expect(img).not.toBeNull();
    expect(screen.getByTestId("generation-download")).toBeInTheDocument();
    expect(screen.getByTestId("generation-copy")).toBeInTheDocument();
    // no spinner in completed state
    expect(screen.queryByTestId("generation-spinner")).not.toBeInTheDocument();
  });

  it("renders an error message when status is 'failed'", () => {
    render(
      <GenerationCard
        item={makeItem({
          status: "failed",
          error: "Replicate 5xx",
        })}
      />,
    );
    expect(screen.getByText(/Replicate 5xx/)).toBeInTheDocument();
    expect(screen.queryByTestId("generation-spinner")).not.toBeInTheDocument();
  });
});

describe("GenerationCard — callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onDownload(item.id) when the download button is clicked", () => {
    const onDownload = vi.fn();
    const item = makeItem({
      status: "completed",
      imageUrl: "https://example.test/r.webp",
    });
    render(<GenerationCard item={item} onDownload={onDownload} />);

    fireEvent.click(screen.getByTestId("generation-download"));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledWith(item.id);
  });

  it("calls onCopy(item.id) when the copy button is clicked", () => {
    const onCopy = vi.fn();
    const item = makeItem({
      status: "completed",
      imageUrl: "https://example.test/r.webp",
    });
    render(<GenerationCard item={item} onCopy={onCopy} />);

    fireEvent.click(screen.getByTestId("generation-copy"));
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledWith(item.id);
  });
});

describe("GenerationCard — retry button visibility", () => {
  it("renders retry button when status is 'failed' AND onRetry is provided", () => {
    const onRetry = vi.fn();
    const item = makeItem({
      status: "failed",
      error: "boom",
    });
    render(<GenerationCard item={item} onRetry={onRetry} />);

    const retry = screen.getByTestId("generation-retry");
    expect(retry).toBeInTheDocument();

    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(item.id);
  });

  it("does NOT render retry button when status is 'failed' but onRetry is omitted", () => {
    render(
      <GenerationCard
        item={makeItem({ status: "failed", error: "boom" })}
      />,
    );
    expect(
      screen.queryByTestId("generation-retry"),
    ).not.toBeInTheDocument();
  });

  it("does NOT render retry button when status is not 'failed' (even if onRetry provided)", () => {
    render(
      <GenerationCard
        item={makeItem({
          status: "completed",
          imageUrl: "https://example.test/r.webp",
        })}
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("generation-retry"),
    ).not.toBeInTheDocument();
  });
});

describe("GenerationCard — action buttons only render in 'completed' state", () => {
  it("does not render download/copy buttons when generating", () => {
    render(
      <GenerationCard
        item={makeItem({ status: "generating" })}
        onDownload={vi.fn()}
        onCopy={vi.fn()}
      />,
    );
    expect(
      screen.queryByTestId("generation-download"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("generation-copy")).not.toBeInTheDocument();
  });
});

// silence act() warnings from async state
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
