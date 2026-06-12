import type { R2Config } from "../lib/r2-upload";

export const DEFAULT_API_BASE = "http://localhost:52741";

export async function getApiBase(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE }, (items) => {
      resolve(items.apiBase as string);
    });
  });
}

export async function getApiKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ apiKey: "" }, (items) => {
      resolve(items.apiKey as string);
    });
  });
}

export async function getR2Config(): Promise<Partial<R2Config>> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        r2Endpoint: "",
        r2Bucket: "",
        r2KeyId: "",
        r2Secret: "",
        r2PublicUrl: "",
      },
      (items) => {
        resolve({
          endpoint: items.r2Endpoint as string,
          bucket: items.r2Bucket as string,
          keyId: items.r2KeyId as string,
          secret: items.r2Secret as string,
          publicUrlBase: items.r2PublicUrl as string,
        });
      },
    );
  });
}
