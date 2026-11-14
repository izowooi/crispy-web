import type { Env } from "./util";

export type PageMeta = { title: string; description: string; image: string | null; siteName: string; favicon: string | null };

const MAX_HTML_BYTES = 600_000;
const FETCH_TIMEOUT_MS = 8_000;
// 일부 사이트(네이버 블로그 등)는 브라우저가 아닌 UA에 OG 태그 없는 페이지를 주므로 브라우저 형태 UA를 쓴다.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 ZKeepBot/1.0";

function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.startsWith("[")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  return true;
}

function absolute(raw: string | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), base);
    if (url.protocol === "http:") url.protocol = "https:"; // 혼합 콘텐츠 차단 회피
    return url.protocol === "https:" ? url.toString().slice(0, 2048) : null;
  } catch {
    return null;
  }
}

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function decodeEntities(s: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] !== "#") return named[e.toLowerCase()] ?? m;
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });
}

/** 본문 전체를 읽지 않도록 앞부분만 통과시킨다(메타 태그는 <head>에 있다). */
function limitBytes(body: ReadableStream<Uint8Array>, max: number): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let seen = 0;
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done || seen >= max) {
        controller.close();
        if (!done) void reader.cancel();
        return;
      }
      seen += value.byteLength;
      controller.enqueue(value);
    },
    cancel: () => reader.cancel(),
  });
}

/** HTMLRewriter는 UTF-8만 가정하므로 EUC-KR 등은 먼저 UTF-8로 바꾼다. */
function toUtf8(body: ReadableStream<Uint8Array>, charset: string): ReadableStream<Uint8Array> {
  try {
    return body.pipeThrough(new TextDecoderStream(charset) as unknown as TransformStream<Uint8Array, string>).pipeThrough(new TextEncoderStream());
  } catch {
    return body;
  }
}

export async function parseMeta(res: Response, pageUrl: string): Promise<PageMeta> {
  const found: Record<string, string> = {};
  let titleText = "";
  let icon: string | undefined;

  const charset = /charset=["']?([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1]?.toLowerCase();
  let body = limitBytes(res.body!, MAX_HTML_BYTES);
  if (charset && charset !== "utf-8" && charset !== "utf8") body = toUtf8(body, charset);

  const rewriter = new HTMLRewriter()
    .on("meta", {
      element(el) {
        const key = (el.getAttribute("property") ?? el.getAttribute("name") ?? "").toLowerCase();
        const content = el.getAttribute("content");
        if (key && content && !(key in found)) found[key] = content;
      },
    })
    .on("title", {
      text(chunk) {
        if (titleText.length < 1000) titleText += chunk.text;
      },
    })
    .on("link", {
      element(el) {
        const rel = (el.getAttribute("rel") ?? "").toLowerCase();
        const href = el.getAttribute("href");
        if (!href || !/(^|\s)(icon|apple-touch-icon)(\s|$)/.test(rel)) return;
        // apple-touch-icon이 보통 더 고해상도라 우선한다.
        if (!icon || rel.includes("apple-touch-icon")) icon = href;
      },
    });

  await rewriter.transform(new Response(body)).arrayBuffer();

  const text = (s: string | undefined, max: number) => clean(decodeEntities(s ?? ""), max);
  return {
    title: text(found["og:title"] ?? found["twitter:title"] ?? titleText, 300),
    description: text(found["og:description"] ?? found["twitter:description"] ?? found["description"], 500),
    image: absolute(found["og:image"] ?? found["og:image:url"] ?? found["twitter:image"] ?? found["twitter:image:src"], pageUrl),
    siteName: text(found["og:site_name"] ?? found["application-name"], 80),
    favicon: absolute(icon ?? "/favicon.ico", pageUrl),
  };
}

export async function fetchMeta(url: string): Promise<PageMeta | null> {
  if (!isPublicHttpUrl(url)) return null;
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" },
  });
  if (!res.ok || !res.body || !/html/i.test(res.headers.get("content-type") ?? "")) {
    await res.body?.cancel();
    return null;
  }
  return parseMeta(res, res.url || url);
}

/** 저장 응답을 막지 않도록 waitUntil에서 호출한다. 앱/사용자가 준 제목은 덮어쓰지 않는다. */
export async function enrichBookmark(env: Env, id: string, url: string): Promise<void> {
  if (env.META_FETCH === "0") return;
  let meta: PageMeta | null = null;
  try {
    meta = await fetchMeta(url);
  } catch {
    // 타임아웃/차단 등은 메타 없이 둔다
  }
  await env.DB.prepare(
    `UPDATE bookmarks SET
       title = CASE WHEN title = '' THEN ? ELSE title END,
       description = ?, image = ?, site_name = ?, favicon = ?, meta_at = ?
     WHERE id = ?`,
  )
    .bind(meta?.title ?? "", meta?.description ?? "", meta?.image ?? null, meta?.siteName ?? "", meta?.favicon ?? null, Date.now(), id)
    .run();
}
