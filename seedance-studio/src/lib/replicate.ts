import "server-only";
import Replicate from "replicate";

// 빌드 시점에 토큰을 검증하지 않고, 요청이 실제로 처리될 때 검증합니다.
// (Cloudflare Pages는 빌드 중에 환경변수를 제공하지 않습니다)
export function getReplicateClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다.");
  }
  const client = new Replicate({ auth: token });
  // Cloudflare Workers는 RequestInit.cache 필드를 지원하지 않으므로 제거한다.
  client.fetch = (url, options) => {
    const { cache: _cache, ...rest } = (options ?? {}) as RequestInit;
    return fetch(url, rest);
  };
  return client;
}
