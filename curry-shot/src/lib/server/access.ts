/** Cost-bearing API access, replay, and best-effort per-client budget guards. */

export const ACCESS_CODE_HEADER = "x-curry-shot-access-code";
export const REQUEST_ID_HEADER = "x-curry-shot-request-id";

const ACCESS_CODE_MIN_LENGTH = 12;
const IMAGE_WINDOW_MS = 10 * 60 * 1_000;
const IMAGE_UNITS_PER_WINDOW = 8;
const VIDEO_LOCK_MS = 60 * 60 * 1_000;
const REQUEST_REPLAY_MS = 15 * 60 * 1_000;

type RuntimeEnv = Record<string, string | undefined>;

export class AccessControlError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly safeMessage: string,
  ) {
    super(safeMessage);
    this.name = "AccessControlError";
  }
}

export type AccessState = {
  readonly required: boolean;
  readonly misconfigured: boolean;
};

type ImageBudget = { units: number; resetAt: number };
type VideoLock = {
  state: "creating" | "active" | "succeeded";
  expiresAt: number;
  predictionId?: string;
};

const imageBudgets = new Map<string, ImageBudget>();
const requestIds = new Map<string, number>();
const videoLocks = new Map<string, VideoLock>();
const predictionOwners = new Map<string, string>();

function isProductionRuntime(env: RuntimeEnv): boolean {
  return env.NODE_ENV === "production" || env.CF_PAGES === "1";
}

function configuredAccessCode(env: RuntimeEnv): string | null {
  const code = env.CURRY_SHOT_ACCESS_CODE?.trim() ?? "";
  return code.length >= ACCESS_CODE_MIN_LENGTH ? code : null;
}

export function getAccessState(env: RuntimeEnv = process.env): AccessState {
  const configured = configuredAccessCode(env) !== null;
  const production = isProductionRuntime(env);
  return {
    required: configured || production,
    misconfigured: production && !configured,
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function clientKey(request: Request): string {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  return /^[0-9a-f:.]{3,64}$/i.test(cloudflareIp) ? cloudflareIp : "local-client";
}

function verifySameOrigin(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new AccessControlError(403, "CROSS_SITE_FORBIDDEN", "다른 사이트에서 보낸 생성 요청은 허용하지 않습니다.");
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new AccessControlError(403, "ORIGIN_FORBIDDEN", "요청 출처를 확인할 수 없습니다.");
  }
}

export function authorizeApiRequest(
  request: Request,
  env: RuntimeEnv = process.env,
): { clientKey: string } {
  verifySameOrigin(request);
  const state = getAccessState(env);
  if (state.misconfigured) {
    throw new AccessControlError(
      503,
      "ACCESS_CODE_NOT_CONFIGURED",
      "운영 환경의 유료 API 보호 설정이 준비되지 않았습니다.",
    );
  }

  const expected = configuredAccessCode(env);
  if (expected) {
    const supplied = request.headers.get(ACCESS_CODE_HEADER) ?? "";
    if (!constantTimeEqual(supplied, expected)) {
      throw new AccessControlError(401, "ACCESS_CODE_REQUIRED", "개인 작업실 접근 코드를 확인해주세요.");
    }
  }

  return { clientKey: clientKey(request) };
}

function consumeRequestId(request: Request, now: number): void {
  const id = request.headers.get(REQUEST_ID_HEADER) ?? "";
  if (!/^[A-Za-z0-9._:-]{12,128}$/.test(id)) {
    throw new AccessControlError(400, "REQUEST_ID_REQUIRED", "안전한 생성 요청 ID가 필요합니다.");
  }

  for (const [knownId, expiresAt] of requestIds) {
    if (expiresAt <= now) requestIds.delete(knownId);
  }
  if (requestIds.has(id)) {
    throw new AccessControlError(409, "DUPLICATE_REQUEST", "이미 처리 중이거나 완료된 중복 요청입니다.");
  }
  requestIds.set(id, now + REQUEST_REPLAY_MS);
}

export function consumeImageBudget(
  request: Request,
  key: string,
  units: number,
  now = Date.now(),
): void {
  consumeRequestId(request, now);
  const current = imageBudgets.get(key);
  const budget = !current || current.resetAt <= now
    ? { units: 0, resetAt: now + IMAGE_WINDOW_MS }
    : current;
  if (budget.units + units > IMAGE_UNITS_PER_WINDOW) {
    throw new AccessControlError(
      429,
      "IMAGE_BUDGET_EXCEEDED",
      "10분 이미지 생성 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
  budget.units += units;
  imageBudgets.set(key, budget);
}

export function reserveVideoBudget(
  request: Request,
  key: string,
  now = Date.now(),
): { clientKey: string } {
  consumeRequestId(request, now);
  const current = videoLocks.get(key);
  if (current && current.expiresAt > now) {
    throw new AccessControlError(
      429,
      "VIDEO_ALREADY_CREATED",
      current.state === "succeeded"
        ? "이 작업실에서는 최근 한 시간 동안 영상 한 개를 이미 완성했습니다."
        : "이 작업실에서 영상 한 개가 이미 생성 중입니다.",
    );
  }
  if (current?.predictionId) predictionOwners.delete(current.predictionId);
  videoLocks.set(key, { state: "creating", expiresAt: now + VIDEO_LOCK_MS });
  return { clientKey: key };
}

export function bindVideoPrediction(client: string, predictionId: string, now = Date.now()): void {
  const previous = videoLocks.get(client)?.predictionId;
  if (previous && previous !== predictionId) predictionOwners.delete(previous);
  videoLocks.set(client, {
    state: "active",
    predictionId,
    expiresAt: now + VIDEO_LOCK_MS,
  });
  predictionOwners.set(predictionId, client);
}

export function releaseVideoReservation(client: string): void {
  const lock = videoLocks.get(client);
  if (lock?.predictionId) predictionOwners.delete(lock.predictionId);
  videoLocks.delete(client);
}

export function recordVideoPredictionStatus(
  predictionId: string,
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled" | "aborted",
  now = Date.now(),
): void {
  const owner = predictionOwners.get(predictionId);
  if (!owner) return;
  const current = videoLocks.get(owner);
  if (status === "failed" || status === "canceled" || status === "aborted") {
    predictionOwners.delete(predictionId);
    if (current?.predictionId === predictionId) videoLocks.delete(owner);
    return;
  }
  if (status === "succeeded" && current?.predictionId === predictionId) {
    videoLocks.set(owner, {
      state: "succeeded",
      predictionId,
      expiresAt: now + VIDEO_LOCK_MS,
    });
  }
}
