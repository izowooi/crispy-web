import { describe, expect, it } from "vitest";
import { parseMeta } from "../worker/meta";

const PAGE = "https://blog.example.com/posts/1";

const html = (body: string, contentType = "text/html; charset=utf-8") => new Response(body, { headers: { "content-type": contentType } });

describe("parseMeta", () => {
  it("prefers og tags over <title> and name=description", async () => {
    const meta = await parseMeta(
      html(`<head>
        <title>Plain title</title>
        <meta name="description" content="plain description">
        <meta property="og:title" content="OG title">
        <meta property="og:description" content="OG description">
        <meta property="og:site_name" content="My Blog">
        <meta property="og:image" content="https://cdn.example.com/cover.png">
      </head>`),
      PAGE,
    );
    expect(meta).toMatchObject({
      title: "OG title",
      description: "OG description",
      siteName: "My Blog",
      image: "https://cdn.example.com/cover.png",
    });
  });

  it("falls back to <title> and meta[name=description]", async () => {
    const meta = await parseMeta(html(`<head><title>Plain title</title><meta name="description" content="plain description"></head>`), PAGE);
    expect(meta).toMatchObject({ title: "Plain title", description: "plain description", image: null, siteName: "" });
  });

  it("falls back to twitter tags", async () => {
    const meta = await parseMeta(
      html(`<head><meta name="twitter:title" content="Tweet title"><meta name="twitter:image" content="https://cdn.example.com/t.png"></head>`),
      PAGE,
    );
    expect(meta).toMatchObject({ title: "Tweet title", image: "https://cdn.example.com/t.png" });
  });

  it("returns empty strings when the page has no metadata", async () => {
    const meta = await parseMeta(html("<html><body>hello</body></html>"), PAGE);
    expect(meta).toMatchObject({ title: "", description: "", image: null, siteName: "" });
  });

  it("resolves relative og:image and icon against the page URL", async () => {
    const meta = await parseMeta(
      html(`<head><meta property="og:image" content="../img/cover.png"><link rel="icon" href="/static/fav.png"></head>`),
      PAGE,
    );
    expect(meta.image).toBe("https://blog.example.com/img/cover.png");
    expect(meta.favicon).toBe("https://blog.example.com/static/fav.png");
  });

  it("resolves protocol-relative image URLs", async () => {
    const meta = await parseMeta(html(`<head><meta property="og:image" content="//cdn.example.com/a.png"></head>`), PAGE);
    expect(meta.image).toBe("https://cdn.example.com/a.png");
  });

  it("upgrades http images and icons to https", async () => {
    const meta = await parseMeta(
      html(`<head><meta property="og:image" content="http://cdn.example.com/a.png"><link rel="icon" href="http://cdn.example.com/f.ico"></head>`),
      PAGE,
    );
    expect(meta.image).toBe("https://cdn.example.com/a.png");
    expect(meta.favicon).toBe("https://cdn.example.com/f.ico");
  });

  it("drops non-http(s) image URLs", async () => {
    const meta = await parseMeta(html(`<head><meta property="og:image" content="data:image/png;base64,AAAA"></head>`), PAGE);
    expect(meta.image).toBeNull();
  });

  it("decodes HTML entities in titles and descriptions", async () => {
    const meta = await parseMeta(
      html(`<head><meta property="og:title" content="Tom &amp; Jerry&#39;s &quot;Show&quot;"><meta name="description" content="a &lt; b &#x41;"></head>`),
      PAGE,
    );
    expect(meta.title).toBe(`Tom & Jerry's "Show"`);
    expect(meta.description).toBe("a < b A");
  });

  it("decodes entities in <title> text", async () => {
    const meta = await parseMeta(html(`<head><title>Fish &amp; Chips &#39;n&#39; more</title></head>`), PAGE);
    expect(meta.title).toBe("Fish & Chips 'n' more");
  });

  it("defaults the favicon to /favicon.ico on the page origin", async () => {
    const meta = await parseMeta(html(`<head><title>x</title></head>`), "https://blog.example.com/a/b?c=1");
    expect(meta.favicon).toBe("https://blog.example.com/favicon.ico");
  });

  it("prefers apple-touch-icon over a regular icon regardless of order", async () => {
    const before = await parseMeta(html(`<head><link rel="apple-touch-icon" href="/apple.png"><link rel="icon" href="/small.ico"></head>`), PAGE);
    const after = await parseMeta(html(`<head><link rel="icon" href="/small.ico"><link rel="apple-touch-icon" href="/apple.png"></head>`), PAGE);
    expect(before.favicon).toBe("https://blog.example.com/apple.png");
    expect(after.favicon).toBe("https://blog.example.com/apple.png");
  });

  it("accepts 'shortcut icon' rel values", async () => {
    const meta = await parseMeta(html(`<head><link rel="shortcut icon" href="/s.ico"></head>`), PAGE);
    expect(meta.favicon).toBe("https://blog.example.com/s.ico");
  });

  it("collapses whitespace and trims", async () => {
    const meta = await parseMeta(html(`<head><title>\n   Hello \t\n  World  \n</title><meta name="description" content="  a   b\nc "></head>`), PAGE);
    expect(meta.title).toBe("Hello World");
    expect(meta.description).toBe("a b c");
  });

  it("caps title, description and site name lengths", async () => {
    const meta = await parseMeta(
      html(`<head><meta property="og:title" content="${"t".repeat(500)}"><meta property="og:description" content="${"d".repeat(900)}"><meta property="og:site_name" content="${"s".repeat(200)}"></head>`),
      PAGE,
    );
    expect(meta.title).toHaveLength(300);
    expect(meta.description).toHaveLength(500);
    expect(meta.siteName).toHaveLength(80);
  });

  it("keeps the first occurrence of a duplicated meta tag", async () => {
    const meta = await parseMeta(html(`<head><meta property="og:title" content="first"><meta property="og:title" content="second"></head>`), PAGE);
    expect(meta.title).toBe("first");
  });

  it("parses the head of a body larger than the byte cap", async () => {
    const big = `<head><meta property="og:title" content="Early title"></head><body>${"x".repeat(1_500_000)}</body>`;
    const meta = await parseMeta(html(big), PAGE);
    expect(meta.title).toBe("Early title");
  });

  it("ignores metadata that appears only after the byte cap", async () => {
    const late = `<head><title>Head title</title></head><body>${"x".repeat(1_500_000)}<meta property="og:title" content="Too late"></body>`;
    const meta = await parseMeta(html(late), PAGE);
    expect(meta.title).toBe("Head title");
  });

  it("decodes EUC-KR pages", async () => {
    const hangul = new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb]);
    const prefix = new TextEncoder().encode("<head><title>");
    const suffix = new TextEncoder().encode("</title></head>");
    const bytes = new Uint8Array([...prefix, ...hangul, ...suffix]);
    const meta = await parseMeta(html(bytes as unknown as string, "text/html; charset=euc-kr"), PAGE);
    expect(meta.title).toBe("한글");
  });
});
