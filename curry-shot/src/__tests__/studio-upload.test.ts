import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Studio } from "@/components/studio";

describe("studio upload", () => {
  it("renders an immediately usable native file picker without samples", () => {
    const markup = renderToStaticMarkup(createElement(Studio));

    expect(markup).toContain('id="studio-file-input"');
    expect(markup).toContain('for="studio-file-input"');
    expect(markup).not.toMatch(/<fieldset[^>]*disabled/);
    expect(markup).not.toContain("샘플");
  });
});
