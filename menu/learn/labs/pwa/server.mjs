// 서비스 워커 캐시 전략을 눈으로 확인하는 미니 서버. 의존성 없음.
//   node learn/labs/pwa/server.mjs   →   http://localhost:5173
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const files = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/sw.js": ["sw.js", "text/javascript; charset=utf-8"],
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/time") {
    // "오늘 식단" 대신 서버 시간을 돌려준다. 캐시에서 왔다면 옛날 시간이 보인다.
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ serverNow: new Date().toISOString() }));
    return;
  }

  const hit = files[url.pathname];
  if (!hit) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": hit[1], "cache-control": "no-cache" });
  res.end(await readFile(join(dir, hit[0])));
}).listen(5173, () => console.log("lab server: http://localhost:5173  (Ctrl+C로 종료)"));
