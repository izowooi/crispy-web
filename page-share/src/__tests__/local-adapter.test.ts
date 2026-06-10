import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalAdapter } from "@/lib/storage/local-adapter";
import fs from "fs/promises";
import os from "os";
import path from "path";

describe("LocalAdapter", () => {
  let tmpDir: string;
  let adapter: LocalAdapter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ps-test-"));
    adapter = new LocalAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("uploads HTML and returns correct storagePath", async () => {
    const result = await adapter.upload("test-id", "<html><body>hi</body></html>");
    expect(result.storagePath).toBe("/api/archives/test-id/raw");
    expect(result.fileSize).toBeGreaterThan(0);
  });

  it("reads back uploaded HTML", async () => {
    const html = "<html><body>hello world</body></html>";
    await adapter.upload("read-id", html);
    const read = await adapter.read("read-id");
    expect(read).toBe(html);
  });

  it("deletes the file", async () => {
    await adapter.upload("del-id", "<p>delete me</p>");
    await adapter.delete("del-id");
    await expect(adapter.read("del-id")).rejects.toThrow();
  });

  it("fileSize matches byte length of content", async () => {
    const html = "hello";
    const result = await adapter.upload("size-id", html);
    expect(result.fileSize).toBe(Buffer.byteLength(html, "utf-8"));
  });
});
