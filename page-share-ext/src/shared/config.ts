import type { R2Config } from "../lib/r2-upload";

// All config is baked in at build time by webpack DefinePlugin.
// Values come from config.local.json (gitignored). No chrome.storage.sync.
declare const __API_BASE__: string;
declare const __API_KEY__: string;
declare const __R2_ENDPOINT__: string;
declare const __R2_BUCKET__: string;
declare const __R2_KEY_ID__: string;
declare const __R2_SECRET__: string;
declare const __R2_PUBLIC_URL__: string;

export function getApiBase(): string {
  return __API_BASE__;
}

export function getApiKey(): string {
  return __API_KEY__;
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
