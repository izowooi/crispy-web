import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    const html = '<div><script>alert("xss")</script>hello</div>';
    expect(sanitizeHtml(html)).not.toContain("<script");
    expect(sanitizeHtml(html)).toContain("hello");
  });

  it("removes multi-line script blocks", () => {
    const html = "<script>\nconst x = 1;\nconsole.log(x);\n</script><p>ok</p>";
    expect(sanitizeHtml(html)).not.toContain("<script");
    expect(sanitizeHtml(html)).toContain("<p>ok</p>");
  });

  it("removes inline event handlers", () => {
    const html = '<button onclick="evil()">click</button>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onclick");
    expect(result).toContain("click");
  });

  it("removes single-quoted event handlers", () => {
    const html = "<a onmouseover='track()'>link</a>";
    expect(sanitizeHtml(html)).not.toContain("onmouseover");
  });

  it("replaces javascript: href", () => {
    const html = '<a href="javascript:void(0)">link</a>';
    expect(sanitizeHtml(html)).not.toContain("javascript:");
  });

  it("replaces javascript: src", () => {
    const html = '<iframe src="javascript:alert(1)"></iframe>';
    expect(sanitizeHtml(html)).not.toContain("javascript:");
  });

  it("preserves normal content untouched", () => {
    const html = '<img src="data:image/png;base64,abc"><p style="color:red">text</p>';
    const result = sanitizeHtml(html);
    expect(result).toContain('src="data:image/png;base64,abc"');
    expect(result).toContain('style="color:red"');
    expect(result).toContain("text");
  });
});
