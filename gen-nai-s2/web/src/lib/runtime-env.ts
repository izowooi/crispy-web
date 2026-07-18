import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface RuntimeEnv {
  AUTH_PASSWORD?: string;
  SESSION_SECRET?: string;
  QUEUE_SERVICE_SECRET?: string;
  QUEUE_BASE_URL?: string;
  QUEUE?: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
}

export function runtimeEnv(): RuntimeEnv {
  try {
    return getCloudflareContext().env as unknown as RuntimeEnv;
  } catch {
    return process.env as RuntimeEnv;
  }
}
