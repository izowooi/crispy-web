import 'server-only';
import Replicate from 'replicate';

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('REPLICATE_API_TOKEN 환경 변수가 설정되지 않았습니다.');
}

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Next.js App Router의 fetch 캐싱 비활성화
replicate.fetch = (url, options) => {
  return fetch(url, { ...options, cache: 'no-store' });
};
