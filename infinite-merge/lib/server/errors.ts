import type { AppErrorCode, ErrorAction, ErrorResponse } from "@/lib/types";

const DEFAULTS: Record<AppErrorCode, { status: number; message: string; action: ErrorAction }> = {
  not_signed_in: { status: 401, message: "ChatGPT로 로그인해야 연성할 수 있어요.", action: "signin" },
  plan_not_enabled: {
    status: 403,
    message: "ChatGPT 플랜 사용이 허용되지 않았어요. 다시 로그인해 플랜 사용을 허용해 주세요.",
    action: "signin",
  },
  usage_limit: {
    status: 429,
    message: "ChatGPT 플랜 사용 한도에 도달했어요. ChatGPT 설정 → Usage에서 확인하세요.",
    action: "manage_usage",
  },
  not_eligible: {
    status: 403,
    message: "이 계정·워크스페이스·지역에서는 ChatGPT 플랜 사용을 이용할 수 없어요.",
    action: "none",
  },
  session_expired: { status: 401, message: "ChatGPT 연결이 만료됐어요. 다시 로그인해 주세요.", action: "signin" },
  unsupported: { status: 400, message: "ChatGPT 플랜 사용에서 지원하지 않는 요청이에요.", action: "none" },
  unavailable: { status: 503, message: "AI 서버가 붐벼서 연성하지 못했어요. 잠시 후 다시 시도해 주세요.", action: "retry" },
  bad_output: { status: 502, message: "연성이 불안정했어요. 한 번 더 시도해 주세요.", action: "retry" },
  bad_request: { status: 400, message: "잘못된 요청이에요.", action: "none" },
  unknown_element: { status: 400, message: "아직 발견하지 않은 원소예요.", action: "none" },
  guest_limit: {
    status: 429,
    message: "오늘의 게스트 연성 횟수를 모두 썼어요. ChatGPT로 로그인하면 계속할 수 있어요.",
    action: "signin",
  },
  guest_unavailable: {
    status: 503,
    message: "게스트 모드가 지금은 쉬고 있어요. ChatGPT로 로그인해 계속해 주세요.",
    action: "signin",
  },
  rate_limited: { status: 429, message: "요청이 너무 빨라요. 잠시 후 다시 시도해 주세요.", action: "retry" },
  forbidden: { status: 403, message: "허용되지 않은 요청이에요.", action: "none" },
  bot_check_failed: { status: 403, message: "자동 입력 방지 확인에 실패했어요. 새로고침 후 다시 시도해 주세요.", action: "none" },
  internal: { status: 500, message: "알 수 없는 오류가 발생했어요.", action: "retry" },
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly action: ErrorAction;
  readonly detail?: string;
  /** Server-provided Retry-After, for transient failures. */
  readonly retryAfterMs?: number;

  constructor(
    code: AppErrorCode,
    opts: { message?: string; detail?: string; status?: number; retryAfterMs?: number } = {},
  ) {
    const d = DEFAULTS[code];
    super(opts.message ?? d.message);
    this.code = code;
    this.status = opts.status ?? d.status;
    this.action = d.action;
    this.detail = opts.detail;
    this.retryAfterMs = opts.retryAfterMs;
  }

  toBody(): ErrorResponse {
    return { error: { code: this.code, message: this.message, action: this.action, detail: this.detail } };
  }
}

export function errorResponse(err: unknown): Response {
  const appErr = err instanceof AppError ? err : new AppError("internal", { detail: String(err) });
  if (!(err instanceof AppError)) console.error("[infinite-merge] unexpected error", err);
  return Response.json(appErr.toBody(), { status: appErr.status });
}
