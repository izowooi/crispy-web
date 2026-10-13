import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type AppEnv = {
  DB: D1Database;
  IMAGES: R2Bucket;
  CLAUDE_API_KEY?: string;
  CLAUDE_MODEL?: string;
};

export async function getEnv(): Promise<AppEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as AppEnv;
}

export function claudeConfig(env: AppEnv): { apiKey: string; model: string } {
  // 로컬 dev는 .env.local(process.env), 배포는 wrangler secret(바인딩)에서 읽는다.
  const apiKey = env.CLAUDE_API_KEY ?? process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY가 설정되지 않았습니다.");
  return { apiKey, model: env.CLAUDE_MODEL ?? process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5" };
}
