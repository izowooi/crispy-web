import { describe, expect, it } from "vitest";
import {
  formatBytes,
  MAX_IMAGE_BYTES,
  safeDownloadName,
  validateImageFile,
} from "@/components/image-client";

describe("client image helpers", () => {
  it("accepts supported image types within the app limit", () => {
    const file = new File([new Uint8Array(128)], "scene.webp", { type: "image/webp" });
    expect(validateImageFile(file)).toBeNull();
  });

  it("rejects unsupported types and files larger than 10MB", () => {
    const gif = new File([new Uint8Array(4)], "scene.gif", { type: "image/gif" });
    const large = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "scene.png", {
      type: "image/png",
    });

    expect(validateImageFile(gif)).toContain("JPG");
    expect(validateImageFile(large)).toContain("10MB");
  });

  it("creates safe Korean download names without duplicate extensions", () => {
    expect(safeDownloadName("포가튼 사가 ending.jpg", "live-action-2")).toBe(
      "포가튼-사가-ending-live-action-2.webp",
    );
  });

  it("formats bytes for upload metadata", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1_024)).toBe("1 KB");
    expect(formatBytes(1_572_864)).toBe("1.5 MB");
  });
});
