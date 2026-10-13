import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { MonthSheet } from "@/lib/schema";
import { ExtractError, extractMonthSheet } from "@/lib/server/extract";

const sheet: MonthSheet = { year: 2026, month: 10, title: "10월", notes: [], allergenLegend: [], footer: [], days: [] };

function fakeClient(response: object) {
  const parse = vi.fn().mockResolvedValue(response);
  return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
}

const input = {
  apiKey: "test",
  model: "claude-sonnet-5-5",
  imageBase64: "AAAA",
  mediaType: "image/jpeg" as const,
  hint: { year: 2026, month: 10 },
};

describe("extractMonthSheet", () => {
  it("설정한 모델·이미지·연월 힌트로 구조화 출력을 요청한다", async () => {
    const { client, parse } = fakeClient({ stop_reason: "end_turn", parsed_output: sheet });
    await expect(extractMonthSheet(input, client)).resolves.toEqual(sheet);
    const params = parse.mock.calls[0][0];
    expect(params.model).toBe("claude-sonnet-5-5");
    expect(params.output_config.format).toBeTruthy();
    expect(params.messages[0].content[0]).toMatchObject({ type: "image", source: { data: "AAAA", media_type: "image/jpeg" } });
    expect(params.messages[0].content[1].text).toContain("2026년 10월");
    expect(params).not.toHaveProperty("thinking");
  });

  it("거절·토큰 초과·파싱 실패는 사용자용 오류로 바꾼다", async () => {
    for (const response of [
      { stop_reason: "refusal", parsed_output: null },
      { stop_reason: "max_tokens", parsed_output: null },
      { stop_reason: "end_turn", parsed_output: null },
    ]) {
      const { client } = fakeClient(response);
      await expect(extractMonthSheet(input, client)).rejects.toBeInstanceOf(ExtractError);
    }
  });
});
