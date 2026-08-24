export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  uploadFile(input: { key: string; body: Uint8Array; contentType: string }): Promise<UploadResult>;
  deleteFile(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
