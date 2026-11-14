import { describe, expect, it } from "vitest";
import { normalizeInput } from "../worker/bookmarks";
import { HttpError } from "../worker/util";

function thrownStatus(input: Parameters<typeof normalizeInput>[0]): number | undefined {
  try {
    normalizeInput(input);
  } catch (err) {
    return err instanceof HttpError ? err.status : -1;
  }
  return undefined;
}

describe("normalizeInput", () => {
  it("extracts a URL-only text", () => {
    expect(normalizeInput({ text: "https://example.com/a?x=1" })).toEqual({ url: "https://example.com/a?x=1", title: "", note: "" });
  });

  it("splits 'title + URL' text into title and url", () => {
    expect(normalizeInput({ text: "Great article https://example.com/post" })).toEqual({
      url: "https://example.com/post",
      title: "Great article",
      note: "",
    });
  });

  it("strips trailing punctuation from the URL", () => {
    expect(normalizeInput({ text: "https://example.com/a." }).url).toBe("https://example.com/a");
    expect(normalizeInput({ text: "see https://example.com/a?x=1!?" }).url).toBe("https://example.com/a?x=1");
  });

  it("drops an unmatched closing parenthesis", () => {
    expect(normalizeInput({ text: "(read https://example.com/a)" }).url).toBe("https://example.com/a");
  });

  it("keeps balanced parentheses (wikipedia style)", () => {
    expect(normalizeInput({ text: "https://en.wikipedia.org/wiki/Foo_(bar)" }).url).toBe("https://en.wikipedia.org/wiki/Foo_(bar)");
  });

  it("does not duplicate text identical to the title into the note", () => {
    expect(normalizeInput({ title: "Hello  World", text: "Hello World https://example.com/" })).toEqual({
      url: "https://example.com/",
      title: "Hello World",
      note: "",
    });
  });

  it("turns a memo without URL into a note with null url", () => {
    expect(normalizeInput({ text: "buy milk" })).toEqual({ url: null, title: "", note: "buy milk" });
  });

  it("keeps the rest of multi-line text in the note", () => {
    const out = normalizeInput({ text: "first line\nhttps://example.com/a\nlast line" });
    expect(out.url).toBe("https://example.com/a");
    expect(out.title).toBe("");
    expect(out.note).toContain("first line");
    expect(out.note).toContain("last line");
  });

  it("puts long leading text into the note instead of the title", () => {
    const out = normalizeInput({ text: `${"x".repeat(250)} https://example.com/a` });
    expect(out.title).toBe("");
    expect(out.note).toBe("x".repeat(250));
  });

  it("appends extra text to an explicit note", () => {
    expect(normalizeInput({ url: "https://example.com/a", note: "mine", text: "more\nlines" }).note).toBe("mine\nmore\nlines");
  });

  it("accepts an explicit url and normalizes it", () => {
    expect(normalizeInput({ url: "  https://example.com  " }).url).toBe("https://example.com/");
  });

  it("rejects an invalid explicit url with 400", () => {
    expect(thrownStatus({ url: "not a url" })).toBe(400);
  });

  it("rejects non-http schemes as explicit url", () => {
    expect(thrownStatus({ url: "ftp://example.com/file" })).toBe(400);
    expect(thrownStatus({ url: "javascript:alert(1)" })).toBe(400);
  });

  it("treats a non-http link inside text as a plain note", () => {
    expect(normalizeInput({ text: "ftp://example.com/file" })).toEqual({ url: null, title: "", note: "ftp://example.com/file" });
  });

  it("throws 400 for empty input", () => {
    expect(thrownStatus({})).toBe(400);
    expect(thrownStatus({ text: "   ", title: " ", note: "" })).toBe(400);
    expect(thrownStatus({ text: 42 })).toBe(400);
  });

  it("caps title and note lengths", () => {
    const out = normalizeInput({ url: "https://example.com/", title: "t".repeat(600), note: "n".repeat(25_000) });
    expect(out.title).toHaveLength(500);
    expect(out.note).toHaveLength(20_000);
  });

  it("rejects URLs longer than 2048 characters", () => {
    expect(thrownStatus({ url: `https://example.com/${"a".repeat(2100)}` })).toBe(400);
  });
});
