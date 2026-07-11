import { describe, expect, it, vi } from "vitest";
import {
  accessRequestHeaders,
  createClientRequestId,
} from "@/components/client-api";

describe("client API request helpers", () => {
  it("keeps the access code in a header and includes a paid request id", () => {
    expect(accessRequestHeaders("  studio-secret  ", "paid-request-1234")).toEqual({
      "x-curry-shot-access-code": "studio-secret",
      "x-curry-shot-request-id": "paid-request-1234",
    });
  });

  it("omits empty credentials from non-paid requests", () => {
    expect(accessRequestHeaders("  ")).toEqual({});
  });

  it("uses browser UUIDs for unique paid requests when available", () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue("123e4567-e89b-12d3-a456-426614174000");
    expect(createClientRequestId()).toBe("123e4567-e89b-12d3-a456-426614174000");
    randomUUID.mockRestore();
  });
});
