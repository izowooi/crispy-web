import { runtimeEnv } from "./runtime-env";

export async function queueFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const env = runtimeEnv();
  const headers = new Headers(init.headers);
  headers.set("x-queue-secret", env.QUEUE_SERVICE_SECRET ?? "");
  const request = new Request(`https://gen-nai-s2-queue.internal${path}`, { ...init, headers });
  if (env.QUEUE_BASE_URL) return fetch(`${env.QUEUE_BASE_URL.replace(/\/$/, "")}${path}`, { ...init, headers });
  if (env.QUEUE) return env.QUEUE.fetch(request);
  return fetch(`http://127.0.0.1:8787${path}`, { ...init, headers });
}
