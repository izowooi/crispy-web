import fs from "fs/promises";
import path from "path";
import type { StorageAdapter, UploadResult } from "./types";

/**
 * LocalAdapter: writes HTML files to the local filesystem.
 *
 * MVP only — not compatible with Cloudflare Pages edge runtime.
 * Replace with R2Adapter for production deployment.
 */
export class LocalAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? process.env.PS_ARCHIVES_DIR ?? "./ps_archives";
  }

  private filePath(id: string) {
    return path.join(this.baseDir, `${id}.html`);
  }

  async upload(id: string, html: string): Promise<UploadResult> {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(this.filePath(id), html, "utf-8");
    return {
      storagePath: `/api/archives/${id}/raw`,
      fileSize: Buffer.byteLength(html, "utf-8"),
    };
  }

  async read(id: string): Promise<string> {
    return fs.readFile(this.filePath(id), "utf-8");
  }

  async delete(id: string): Promise<void> {
    await fs.unlink(this.filePath(id));
  }
}
