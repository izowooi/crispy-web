import type { R2Config } from "../lib/r2-upload";

// R2 credentials are baked in at build time by webpack DefinePlugin.
// Set them in config.local.json (gitignored) before running `npm run build`.
declare const __R2_ENDPOINT__: string;
declare const __R2_BUCKET__: string;
declare const __R2_KEY_ID__: string;
declare const __R2_SECRET__: string;
declare const __R2_PUBLIC_URL__: string;

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

export function getR2Config(): Partial<R2Config> {
  return {
    endpoint: __R2_ENDPOINT__,
    bucket: __R2_BUCKET__,
    keyId: __R2_KEY_ID__,
    secret: __R2_SECRET__,
    publicUrlBase: __R2_PUBLIC_URL__,
  };
}
