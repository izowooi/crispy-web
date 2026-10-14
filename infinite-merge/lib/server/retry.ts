import "server-only";
import { AppError } from "./errors";

export type RetryOptions = {
  /** Wait before each retry; its length is the retry count. */
  delaysMs: number[];
  /** Don't start an attempt we expect to finish after this much total time. */
  budgetMs: number;
  onRetry?: (attempt: number, waitMs: number, err: AppError) => void;
  jitter?: () => number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const RETRY_AFTER_CAP_MS = 5_000;

/**
 * Retries only `unavailable` (overload, 5xx, cut stream). Usage limits, eligibility and auth
 * errors are final: retrying them can't succeed and would only hammer the user's plan.
 */
export async function withTransientRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const jitter = opts.jitter ?? (() => 0.8 + Math.random() * 0.4);
  const started = now();

  for (let attempt = 0; ; attempt++) {
    const attemptStart = now();
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof AppError) || err.code !== "unavailable" || attempt >= opts.delaysMs.length) throw err;
      const lastAttemptMs = now() - attemptStart;
      const wait = Math.round(
        err.retryAfterMs !== undefined ? Math.min(err.retryAfterMs, RETRY_AFTER_CAP_MS) : opts.delaysMs[attempt] * jitter(),
      );
      if (now() - started + wait + lastAttemptMs > opts.budgetMs) throw err;
      opts.onRetry?.(attempt + 1, wait, err);
      await sleep(wait);
    }
  }
}
