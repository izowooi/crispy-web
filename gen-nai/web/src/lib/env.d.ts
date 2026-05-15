/**
 * Cloudflare 환경변수 + 바인딩 타입.
 * 실제 큐 DO는 별도 Worker(gennai-queue)에 있고, Pages는 service binding으로 접근.
 */

declare global {
  interface Env {
    /** gennai-queue Worker로의 service binding */
    QUEUE: Fetcher;
  }
}

export {};
