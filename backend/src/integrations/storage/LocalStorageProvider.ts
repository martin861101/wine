import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";
import type { StorageProvider, UploadResult } from "./StorageProvider";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir = UPLOAD_DIR) {
    this.baseDir = baseDir;
  }

  async uploadFile(input: {
    key: string;
    body: Uint8Array;
    contentType: string;
  }): Promise<UploadResult> {
    const safeKey = input.key.replace(/\.\./g, "").replace(/^\/+/, "");
    const absolute = path.join(this.baseDir, safeKey);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, Buffer.from(input.body));
    return { url: this.getPublicUrl(safeKey), key: safeKey };
  }

  async deleteFile(key: string): Promise<void> {
    const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
    await rm(path.join(this.baseDir, safeKey), { force: true });
  }

  getPublicUrl(key: string): string {
    const base = env.PUBLIC_STORAGE_URL || "/uploads";
    return `${base.replace(/\/$/, "")}/${key.replace(/^\/+/, "")}`;
  }
}
