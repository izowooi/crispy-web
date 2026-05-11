import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the processor so component tests don't depend on jsdom canvas/Image.
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

import { UploadPanel } from "@/components/UploadPanel";
import { processImage } from "@/components/uploadProcessor";

const MOCK_PROCESS = processImage as unknown as ReturnType<typeof vi.fn>;

function makeFile(opts: { type: string; size: number; name?: string }): File {
  const f = new File(["x"], opts.name ?? "img.jpg", { type: opts.type });
  Object.defineProperty(f, "size", { value: opts.size, configurable: true });
  return f;
}

describe("UploadPanel — rendering", () => {
  beforeEach(() => {
    MOCK_PROCESS.mockClear();
  });

  it("renders a drop zone with hint text", () => {
    render(<UploadPanel onImageReady={() => {}} />);
    // Either hint text or accessible upload control should be visible.
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    expect(fileInput?.accept).toMatch(/image/);
  });

  it("renders the file input with allowed mime types in accept", () => {
    render(<UploadPanel onImageReady={() => {}} />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.accept).toContain("image/jpeg");
    expect(input.accept).toContain("image/png");
    expect(input.accept).toContain("image/webp");
  });
});

describe("UploadPanel — validation via file input", () => {
  beforeEach(() => {
    MOCK_PROCESS.mockClear();
  });

  it("calls onError and NOT onImageReady when a disallowed mime is chosen", async () => {
    const onImageReady = vi.fn();
    const onError = vi.fn();
    render(
      <UploadPanel onImageReady={onImageReady} onError={onError} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile({ type: "image/gif", size: 1024, name: "x.gif" });

    await fireFileChange(input, file);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      "지원하지 않는 파일 형식입니다. JPG/PNG/WEBP만 업로드 가능합니다.",
    );
    expect(onImageReady).not.toHaveBeenCalled();
    expect(MOCK_PROCESS).not.toHaveBeenCalled();
  });

  it("calls onError when file exceeds maxSizeBytes (default 10MB)", async () => {
    const onImageReady = vi.fn();
    const onError = vi.fn();
    render(
      <UploadPanel onImageReady={onImageReady} onError={onError} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile({
      type: "image/jpeg",
      size: 11 * 1024 * 1024,
      name: "big.jpg",
    });

    await fireFileChange(input, file);

    expect(onError).toHaveBeenCalledWith(
      "파일이 너무 큽니다. 10MB 이하의 이미지를 사용해주세요.",
    );
    expect(onImageReady).not.toHaveBeenCalled();
  });

  it("respects a custom maxSizeBytes prop", async () => {
    const onImageReady = vi.fn();
    const onError = vi.fn();
    render(
      <UploadPanel
        onImageReady={onImageReady}
        onError={onError}
        maxSizeBytes={2048}
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile({ type: "image/png", size: 4096, name: "x.png" });

    await fireFileChange(input, file);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onImageReady).not.toHaveBeenCalled();
  });

  it("does not throw when onError is omitted (optional prop)", async () => {
    const onImageReady = vi.fn();
    render(<UploadPanel onImageReady={onImageReady} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile({ type: "image/gif", size: 1024 });

    await expect(fireFileChange(input, file)).resolves.not.toThrow();
    expect(onImageReady).not.toHaveBeenCalled();
  });
});

describe("UploadPanel — happy path", () => {
  beforeEach(() => {
    MOCK_PROCESS.mockClear();
  });

  it("calls onImageReady with processed dataUrl + meta on valid file", async () => {
    const onImageReady = vi.fn();
    const onError = vi.fn();
    render(
      <UploadPanel onImageReady={onImageReady} onError={onError} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile({ type: "image/jpeg", size: 1024 * 100 });

    await fireFileChange(input, file);

    await waitFor(() => expect(MOCK_PROCESS).toHaveBeenCalledTimes(1));
    expect(MOCK_PROCESS).toHaveBeenCalledWith(file);

    await waitFor(() => expect(onImageReady).toHaveBeenCalledTimes(1));
    expect(onImageReady).toHaveBeenCalledWith(
      "data:image/webp;base64,AAAA",
      {
        width: 800,
        height: 600,
        sizeBytes: 12345,
        type: "image/webp",
      },
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it("renders a preview <img> after a successful upload", async () => {
    render(<UploadPanel onImageReady={() => {}} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile({ type: "image/jpeg", size: 1024 });

    await fireFileChange(input, file);

    await waitFor(() => {
      const preview = document.querySelector(
        'img[src^="data:image/webp"]',
      ) as HTMLImageElement | null;
      expect(preview).not.toBeNull();
    });
  });

  it("propagates processor rejection to onError", async () => {
    const onImageReady = vi.fn();
    const onError = vi.fn();
    MOCK_PROCESS.mockRejectedValueOnce(new Error("boom"));

    render(
      <UploadPanel onImageReady={onImageReady} onError={onError} />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = makeFile({ type: "image/png", size: 1024 });

    await fireFileChange(input, file);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0]).toMatch(/boom|이미지/);
    expect(onImageReady).not.toHaveBeenCalled();
  });
});

describe("UploadPanel — drag and drop", () => {
  beforeEach(() => {
    MOCK_PROCESS.mockClear();
  });

  it("processes a file dropped on the drop zone", async () => {
    const onImageReady = vi.fn();
    render(<UploadPanel onImageReady={onImageReady} />);

    const dropZone = screen.getByTestId("upload-dropzone");
    const file = makeFile({ type: "image/png", size: 4096, name: "drop.png" });

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [file], types: ["Files"] },
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file], types: ["Files"] },
    });

    await waitFor(() => expect(MOCK_PROCESS).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onImageReady).toHaveBeenCalledTimes(1));
  });

  it("validates dropped files identically (rejects gif drop)", async () => {
    const onImageReady = vi.fn();
    const onError = vi.fn();
    render(
      <UploadPanel onImageReady={onImageReady} onError={onError} />,
    );

    const dropZone = screen.getByTestId("upload-dropzone");
    const file = makeFile({ type: "image/gif", size: 1024, name: "x.gif" });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file], types: ["Files"] },
    });

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        "지원하지 않는 파일 형식입니다. JPG/PNG/WEBP만 업로드 가능합니다.",
      ),
    );
    expect(onImageReady).not.toHaveBeenCalled();
  });
});

// ---------- helpers ----------

/**
 * Simulate a user choosing a file via the hidden <input type="file">.
 * jsdom doesn't allow direct assignment to input.files; we use Object.defineProperty
 * which is the documented workaround for RTL.
 */
async function fireFileChange(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
  });
  fireEvent.change(input);
  // give the async processor microtask + state update a chance to run
  await Promise.resolve();
  await Promise.resolve();
}

// Quiet React act() warnings caused by async state inside event handlers in jsdom.
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
