export interface UploadResult {
  storagePath: string;
  fileSize: number;
}

export interface StorageAdapter {
  upload(id: string, html: string): Promise<UploadResult>;
  read(id: string): Promise<string>;
  delete(id: string): Promise<void>;
}
