// Returns true when the provided key matches the configured API_KEY.
// If API_KEY is not set, all requests are allowed (local dev mode).
export function isValidApiKey(key: string | undefined): boolean {
  const configured = process.env.API_KEY;
  if (!configured) return true;
  return !!key && key === configured;
}

export function extractApiKey(request: Request): string | undefined {
  const value = request.headers.get("x-api-key");
  return value ?? undefined;
}
