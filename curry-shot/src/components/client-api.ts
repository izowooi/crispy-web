export const ACCESS_CODE_STORAGE_KEY = "curry-shot-access-code";
export const VIDEO_JOB_STORAGE_KEY = "curry-shot-video-job";

export function createClientRequestId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function accessRequestHeaders(
  accessCode: string,
  requestId?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const normalizedCode = accessCode.trim();
  if (normalizedCode) headers["x-curry-shot-access-code"] = normalizedCode;
  if (requestId) headers["x-curry-shot-request-id"] = requestId;
  return headers;
}
