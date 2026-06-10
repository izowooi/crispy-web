import { describe, it, expect } from "vitest";

// DOM-based sanitizer (mirrors content script logic without chrome APIs)
function removeScripts(clone: Element): void {
  clone.querySelectorAll("script").forEach((s) => s.remove());
  clone.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes)
      .filter((attr) => attr.name.startsWith("on"))
      .forEach((attr) => el.removeAttribute(attr.name));
  });
}

describe("removeScripts (content script sanitizer)", () => {
  function makeDiv(html: string): HTMLDivElement {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div;
  }

  it("removes script elements", () => {
    const el = makeDiv('<script>alert("xss")</script><p>hi</p>');
    removeScripts(el);
    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelector("p")).not.toBeNull();
  });

  it("removes onclick attributes", () => {
    const el = makeDiv('<button onclick="evil()">click</button>');
    removeScripts(el);
    expect(el.querySelector("button")?.getAttribute("onclick")).toBeNull();
  });

  it("removes onmouseover attributes", () => {
    const el = makeDiv('<a onmouseover="track()">link</a>');
    removeScripts(el);
    expect(el.querySelector("a")?.getAttribute("onmouseover")).toBeNull();
  });

  it("preserves regular attributes", () => {
    const el = makeDiv('<img src="data:image/png;base64,abc" alt="test">');
    removeScripts(el);
    expect(el.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,abc");
    expect(el.querySelector("img")?.getAttribute("alt")).toBe("test");
  });
});
