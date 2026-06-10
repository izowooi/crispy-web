/**
 * Strip executable code from archived HTML.
 * Defense-in-depth: archived pages are also served in a sandboxed iframe.
 */
export function sanitizeHtml(html: string): string {
  // Remove <script> blocks
  let out = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi,
    "",
  );

  // Remove inline event handlers (on*)
  out = out.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");

  // Replace javascript: URIs
  out = out.replace(
    /(href|src|action)\s*=\s*["']javascript:[^"']*["']/gi,
    '$1="#"',
  );

  return out;
}
