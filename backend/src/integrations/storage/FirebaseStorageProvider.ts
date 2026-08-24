import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";
import { env } from "../../config/env";
import type { StorageProvider, UploadResult } from "./StorageProvider";

/**
 * Firebase Storage provider backed by Google Cloud Storage.
 *
 * Runs on Application Default Credentials (automatic inside Firebase
 * Functions). Initialized lazily with FIREBASE_STORAGE_BUCKET. The returned
 * public media URLs require the bucket's Firebase Storage rules to allow
 * public read for the `events/*` paths, matching the previous public object
 * URLs from S3-compatible storage.
 */
let bucketInstance: Bucket | null = null;

function getBucket(): Bucket {
  if (!bucketInstance) {
    if (!env.FIREBASE_STORAGE_BUCKET) {
      throw new Error(
        "Firebase storage provider requires FIREBASE_STORAGE_BUCKET (the Firebase Storage bucket name).",
      );
    }
    const app = getApps().length
      ? getApp()
      : initializeApp({ storageBucket: env.FIREBASE_STORAGE_BUCKET });
    bucketInstance = getStorage(app).bucket();
  }
  return bucketInstance;
}

export class FirebaseStorageProvider implements StorageProvider {
  uploadFile(input: { key: string; body: Uint8Array; contentType: string }): Promise<UploadResult> {
    const key = input.key.replace(/^\/+/, "");
    const file = getBucket().file(key);
    return file
      .save(Buffer.from(input.body), {
        contentType: input.contentType,
        resumable: false,
        metadata: { contentType: input.contentType },
      })
      .then(() => ({ url: this.getPublicUrl(key), key }));
  }

  async deleteFile(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, "");
    await getBucket().file(cleanKey).delete({ ignoreNotFound: true });
  }

  getPublicUrl(key: string): string {
    const bucket = env.FIREBASE_STORAGE_BUCKET;
    const encoded = encodeURIComponent(key.replace(/^\/+/, ""));
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
  }
}
