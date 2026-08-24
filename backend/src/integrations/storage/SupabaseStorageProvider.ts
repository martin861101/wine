import { env } from "../../config/env";
import type { StorageProvider, UploadResult } from "./StorageProvider";

function objectPath(key: string): string {
  return key
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function configuration() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase Storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return {
    baseUrl: env.SUPABASE_URL.replace(/\/$/, ""),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: env.SUPABASE_STORAGE_BUCKET,
  };
}

async function requireSuccess(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  const detail = await response.text().catch(() => "");
  throw new Error(
    `Supabase Storage ${action} failed (${response.status})${detail ? `: ${detail}` : ""}`,
  );
}

export class SupabaseStorageProvider implements StorageProvider {
  async uploadFile(input: {
    key: string;
    body: Uint8Array;
    contentType: string;
  }): Promise<UploadResult> {
    const { baseUrl, serviceRoleKey, bucket } = configuration();
    const key = input.key.replace(/^\/+/, "");
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath(key)}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": input.contentType,
          "x-upsert": "true",
        },
        body: Buffer.from(input.body),
      },
    );
    await requireSuccess(response, "upload");
    return { url: this.getPublicUrl(key), key };
  }

  async deleteFile(key: string): Promise<void> {
    const { baseUrl, serviceRoleKey, bucket } = configuration();
    const response = await fetch(
      `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath(key)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    await requireSuccess(response, "delete");
  }

  getPublicUrl(key: string): string {
    const { baseUrl, bucket } = configuration();
    return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath(key)}`;
  }
}
