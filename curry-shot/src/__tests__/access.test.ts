import { describe, expect, it } from "vitest";

import {
  authorizeApiRequest,
  bindVideoPrediction,
  consumeImageBudget,
  getAccessState,
  recordVideoPredictionStatus,
  reserveVideoBudget,
} from "@/lib/server/access";
import { apiErrorResponse } from "@/lib/server/api-utils";

const accessCode = "private-code-123456";

function request(
  path: string,
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://curry-shot.test${path}`, {
    headers: {
      origin: "https://curry-shot.test",
      "sec-fetch-site": "same-origin",
      "cf-connecting-ip": `2001:db8::${Math.floor(Math.random() * 10_000)}`,
      ...headers,
    },
  });
}

describe("paid API access guard", () => {
  it("requires a configured access code in production", () => {
    expect(getAccessState({ NODE_ENV: "production" })).toEqual({
      required: true,
      misconfigured: true,
    });

    const guarded = request("/api/images");
    expect(() => authorizeApiRequest(guarded, { NODE_ENV: "production" })).toThrowError(
      expect.objectContaining({ code: "ACCESS_CODE_NOT_CONFIGURED", status: 503 }),
    );
  });

  it("rejects bad codes and cross-origin requests without leaking the configured value", async () => {
    const wrong = request("/api/images", { "x-curry-shot-access-code": "wrong-code-123" });
    expect(() => authorizeApiRequest(wrong, {
      NODE_ENV: "production",
      CURRY_SHOT_ACCESS_CODE: accessCode,
    })).toThrowError(expect.objectContaining({ code: "ACCESS_CODE_REQUIRED", status: 401 }));

    const crossSite = new Request("https://curry-shot.test/api/images", {
      headers: {
        origin: "https://evil.test",
        "sec-fetch-site": "cross-site",
        "x-curry-shot-access-code": accessCode,
      },
    });
    let thrown: unknown;
    try {
      authorizeApiRequest(crossSite, {
        NODE_ENV: "production",
        CURRY_SHOT_ACCESS_CODE: accessCode,
      });
    } catch (error) {
      thrown = error;
    }
    const response = apiErrorResponse(thrown);
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.not.toContain(accessCode);
  });

  it("enforces request replay protection and the eight-image rolling budget", () => {
    const ip = "2001:db8::777";
    const makePaidRequest = (id: string) => request("/api/images", {
      "cf-connecting-ip": ip,
      "x-curry-shot-access-code": accessCode,
      "x-curry-shot-request-id": id,
    });
    const env = { NODE_ENV: "production", CURRY_SHOT_ACCESS_CODE: accessCode };

    const first = makePaidRequest("image-request-0001");
    const { clientKey } = authorizeApiRequest(first, env);
    consumeImageBudget(first, clientKey, 4, 100);

    expect(() => consumeImageBudget(first, clientKey, 4, 100)).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_REQUEST", status: 409 }),
    );

    const second = makePaidRequest("image-request-0002");
    consumeImageBudget(second, clientKey, 4, 100);
    const third = makePaidRequest("image-request-0003");
    expect(() => consumeImageBudget(third, clientKey, 1, 100)).toThrowError(
      expect.objectContaining({ code: "IMAGE_BUDGET_EXCEEDED", status: 429 }),
    );
  });

  it("keeps one video lock and releases it after a terminal failure", () => {
    const ip = "2001:db8::888";
    const makeVideoRequest = (id: string) => request("/api/video", {
      "cf-connecting-ip": ip,
      "x-curry-shot-access-code": accessCode,
      "x-curry-shot-request-id": id,
    });
    const env = { NODE_ENV: "production", CURRY_SHOT_ACCESS_CODE: accessCode };
    const first = makeVideoRequest("video-request-0001");
    const { clientKey } = authorizeApiRequest(first, env);
    reserveVideoBudget(first, clientKey, 1_000);
    bindVideoPrediction(clientKey, "videoabc123", 1_000);

    expect(() => reserveVideoBudget(makeVideoRequest("video-request-0002"), clientKey, 1_000))
      .toThrowError(expect.objectContaining({ code: "VIDEO_ALREADY_CREATED", status: 429 }));

    recordVideoPredictionStatus("videoabc123", "failed", 1_000);
    expect(() => reserveVideoBudget(makeVideoRequest("video-request-0003"), clientKey, 1_000))
      .not.toThrow();
  });
});
