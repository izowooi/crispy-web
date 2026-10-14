import "server-only";

export type HostInfo = { hostname: string; port: string };

export function hostInfo(request: Request): HostInfo {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const match = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/.exec(host);
  const url = new URL(request.url);
  return {
    hostname: (match?.[1] ?? url.hostname).toLowerCase(),
    port: match?.[2] ?? url.port ?? "",
  };
}

/** SIWC only accepts http://127.0.0.1 loopback callbacks, and cookies are per-host, so the app must live there. */
export function loopbackOrigin(port: string): string {
  return `http://127.0.0.1${port ? `:${port}` : ""}`;
}

export function isLocalAlias(hostname: string): boolean {
  return hostname === "localhost" || hostname === "[::1]";
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Mutable-header redirect so cookies set via cookies() can be merged in (Response.redirect headers are immutable). */
export function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });
}
