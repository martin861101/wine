import { env } from "../../config/env";
import type { StorageProvider } from "./StorageProvider";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { FirebaseStorageProvider } from "./FirebaseStorageProvider";
import { SupabaseStorageProvider } from "./SupabaseStorageProvider";

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    if (env.STORAGE_PROVIDER === "supabase") instance = new SupabaseStorageProvider();
    else if (env.STORAGE_PROVIDER === "firebase") instance = new FirebaseStorageProvider();
    else instance = new LocalStorageProvider();
  }
  return instance;
}
