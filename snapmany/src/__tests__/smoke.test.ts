import { describe, it, expect } from "vitest";

describe("vitest smoke", () => {
  it("environment is wired up", () => {
    expect(true).toBe(true);
  });

  it("dom is available (jsdom)", () => {
    const el = document.createElement("div");
    el.textContent = "snapmany";
    expect(el.textContent).toBe("snapmany");
  });
});
