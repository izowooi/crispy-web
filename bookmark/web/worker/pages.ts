import { escapeHtml } from "./util";

/** Worker가 직접 내려주는 최소 HTML (로그인 오류, 앱 연결 동의/복귀). SPA 번들과 무관하게 동작해야 한다. */
export function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · ZKeep</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;
    background: #fff; color: #111827; }
  main { width: 100%; max-width: 380px; text-align: center; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { margin: 0 0 20px; color: #6b7280; word-break: keep-all; }
  .btn { display: inline-block; width: 100%; box-sizing: border-box; padding: 14px 20px; border: 0; border-radius: 12px;
    background: #2563eb; color: #fff; font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
  .field { display: block; width: 100%; box-sizing: border-box; margin: 0 0 12px; padding: 13px 14px; border: 1px solid #d1d5db; border-radius: 12px;
    background: transparent; color: inherit; font: inherit; }
  .sub { display: inline-block; margin-top: 16px; color: #6b7280; font-size: 14px; }
  b { color: inherit; }
  @media (prefers-color-scheme: dark) {
    body { background: #030712; color: #f3f4f6; } p, .sub { color: #9ca3af; } .btn { background: #3b82f6; }
  }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export function messagePage(title: string, message: string, link?: { href: string; label: string }): string {
  return page(
    title,
    `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>` +
      (link ? `<a class="btn" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>` : ""),
  );
}

/** 같은 사이트에서 시작된 탐색으로 만들기 위해 302 대신 HTML로 이동시킨다(SameSite=Lax 쿠키가 확실히 실리도록). */
export function redirectPage(to: string): string {
  const safe = escapeHtml(to);
  return page(
    "이동 중",
    `<meta http-equiv="refresh" content="0;url=${safe}"><p>이동 중…</p><a class="sub" href="${safe}">자동으로 넘어가지 않으면 누르세요</a>`,
  );
}
