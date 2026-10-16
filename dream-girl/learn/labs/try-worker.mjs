// 실습: 로컬에서 Worker를 가짜 바인딩으로 호출해 보기
// 실행: node learn/labs/try-worker.mjs
import worker from "../../worker/index.js";

const db = {
  prepare: () => ({ first: async () => ({ cnt: 64 }), all: async () => ({ results: [] }) }),
};
const res = await worker.fetch(new Request("https://example.test/api/health"), { DB: db, IMAGES: {} });
console.log(res.status, await res.json());
