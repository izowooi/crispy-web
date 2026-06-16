import { describe, it, expect } from "vitest";
import { canViewArchive } from "@/lib/visibility";

describe("canViewArchive", () => {
  it("public archive: anyone can view", () => {
    expect(canViewArchive(false, false)).toBe(true);
    expect(canViewArchive(false, true)).toBe(true);
  });

  it("private archive: only admin can view", () => {
    expect(canViewArchive(true, false)).toBe(false);
    expect(canViewArchive(true, true)).toBe(true);
  });
});
