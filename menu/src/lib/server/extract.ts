import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { MonthSheetSchema, type MonthSheet } from "@/lib/schema";

export const EXTRACT_SYSTEM_PROMPT = `당신은 한국 어린이집·유치원의 월간 식단표 사진을 정확한 구조화 데이터로 옮기는 전문가입니다.
사진의 양식은 기관마다 다를 수 있습니다. 표의 행·열 구조를 먼저 파악한 뒤 날짜별로 옮기세요.

규칙:
- 사진에 실제로 적힌 글자만 옮깁니다. 추측해서 메뉴를 만들지 않습니다. 흐려서 읽기 어려운 글자는 가장 가능성 높은 글자로 쓰되 그날 note에 "일부 글자 불확실"이라고 남깁니다.
- 날짜 칸이 있는 모든 날(평일, 휴원일, 공휴일 포함)을 days에 넣습니다. 표에 칸이 없는 날(주말 등)은 넣지 않습니다.
- weekday에는 날짜 옆에 적힌 요일 글자를 그대로 넣습니다. 계산해서 채우지 않습니다.
- 메뉴 이름 뒤의 숫자(예: "모듬버섯국5,6")는 알레르기 유발 식품 번호입니다. name에는 숫자를 뺀 이름("모듬버섯국"), allergens에는 [5,6]을 넣습니다. "&"는 숫자가 아닙니다.
- 괄호 안 대체 메뉴(예: "백김치9(백깍두기9)")는 name을 "백김치(백깍두기)", allergens [9]처럼 하나로 합칩니다. 괄호 안 숫자(예: "신선과일(토마토12)")는 name "신선과일(토마토)", allergens [12].
- 한 칸에 쉼표로 나뉜 간식은 각각 별도 항목으로 나눕니다(예: "유아치즈2,당근주스" → 유아치즈[2], 당근주스[]). "씨리얼5,6,우유2"처럼 숫자 목록과 이름이 섞이면 숫자는 바로 앞 항목의 알레르기 번호입니다.
- 반별로 다른 메뉴(예: "유아치즈2(달빛반)")는 반 이름을 name에 괄호로 남깁니다.
- 휴원·공휴일·대체휴일이면 closed=true, closedReason에 사유("대체휴일", "한글날" 등)를 넣습니다.
- 날짜 머리글의 행사(예: "7(수)-우주반견학", "원내행사")는 event에 넣습니다.
- 열량/단백질 "445/16"은 kcal=445, protein=16. 없으면 null.
- 원산지 표기는 origin에 "오리고기: 국내산"처럼 쓰고, 여러 개면 " · "로 이어 붙입니다.
- notes에는 안내사항 문장들을, footer에는 표 하단의 공통 원산지·공급 안내 등을 넣습니다.
- allergenLegend는 하단 범례(①난류 ②우유 …)를 옮깁니다. 범례가 없으면 빈 배열입니다.
- year, month는 제목에서 읽습니다. 제목에 연도가 없으면 사용자 메시지의 힌트를 따릅니다.`;

export class ExtractError extends Error {}

type ExtractInput = {
  apiKey: string;
  model: string;
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  hint: { year: number; month: number };
};

export async function extractMonthSheet(input: ExtractInput, client?: Anthropic): Promise<MonthSheet> {
  const anthropic = client ?? new Anthropic({ apiKey: input.apiKey, maxRetries: 1 });
  let response;
  try {
    response = await anthropic.beta.messages.parse({
      model: input.model,
      max_tokens: 16000,
      // Sonnet 5.5의 정책성 거절이 나면 서버가 기본 대체 모델로 재시도한다.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: EXTRACT_SYSTEM_PROMPT,
      output_config: { format: betaZodOutputFormat(MonthSheetSchema), effort: "medium" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 } },
            {
              type: "text",
              text: `이 식단표 사진을 스키마에 맞게 추출해 주세요. 제목에 연·월이 없으면 ${input.hint.year}년 ${input.hint.month}월로 봅니다.`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("claude extract failed", error instanceof Anthropic.APIError ? { status: error.status, message: error.message } : error);
    if (error instanceof Anthropic.RateLimitError) throw new ExtractError("AI 사용량이 많아요. 잠시 후 다시 시도해 주세요.");
    if (error instanceof Anthropic.AuthenticationError) throw new ExtractError("AI 키 설정에 문제가 있어요. 관리자에게 알려주세요.");
    if (error instanceof Anthropic.BadRequestError) throw new ExtractError("이미지를 AI가 처리하지 못했어요. 다른 사진으로 시도해 주세요.");
    if (error instanceof Anthropic.APIError) throw new ExtractError("AI 서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    throw error;
  }

  if (response.stop_reason === "refusal") throw new ExtractError("AI가 이 사진을 처리하지 않았어요. 식단표 사진인지 확인해 주세요.");
  if (response.stop_reason === "max_tokens") throw new ExtractError("식단표가 너무 길어 끝까지 읽지 못했어요.");
  if (!response.parsed_output) throw new ExtractError("식단표를 읽지 못했어요. 더 선명한 사진으로 다시 시도해 주세요.");
  return response.parsed_output;
}
