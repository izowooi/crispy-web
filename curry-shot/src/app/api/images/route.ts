import {
  ProviderApiError,
  apiErrorResponse,
  isValidPredictionId,
  prepareReplicateFileInput,
  replicateJsonRequest,
  requestOpenAIImageEdit,
  requireOpenAIKey,
  requireReplicateToken,
} from "@/lib/server/api-utils";
import {
  IMAGE_MODEL_SLUGS,
  buildImagePrompt,
  buildReplicateImageInput,
  parseImageFormData,
  readMultipartFormData,
} from "@/lib/server/generation";
import { authorizeApiRequest, consumeImageBudget } from "@/lib/server/access";

// OpenNext Cloudflare does not support Next.js Edge Runtime route bundles.
// The Node.js runtime is compiled into the Cloudflare Worker with nodejs_compat.
export const runtime = "nodejs";

type CreatedPrediction = {
  readonly id?: unknown;
  readonly status?: unknown;
};

function assertCreatedPrediction(
  value: CreatedPrediction,
  requestId?: string,
): { id: string; status: string } {
  if (
    typeof value.id !== "string" ||
    !isValidPredictionId(value.id) ||
    typeof value.status !== "string"
  ) {
    throw new ProviderApiError(
      "replicate",
      502,
      "PROVIDER_RESPONSE_INVALID",
      "Replicate 작업 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      requestId,
    );
  }
  return { id: value.id, status: value.status };
}

function safeQueueError(error: unknown, index: number) {
  if (error instanceof ProviderApiError) {
    return {
      index,
      code: error.code,
      message: error.safeMessage,
      ...(error.requestId ? { requestId: error.requestId } : {}),
    };
  }
  return {
    index,
    code: "QUEUE_FAILED",
    message: "이 이미지 생성 작업을 대기열에 추가하지 못했습니다.",
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { clientKey } = authorizeApiRequest(request);
    const input = parseImageFormData(await readMultipartFormData(request));
    const prompt = buildImagePrompt(input);

    if (input.provider === "openai") {
      const apiKey = requireOpenAIKey();
      consumeImageBudget(request, clientKey, input.count);
      const result = await requestOpenAIImageEdit(
        {
          image: input.image,
          prompt,
          count: input.count,
          quality: input.quality,
          outputSize: input.outputSize,
        },
        { apiKey },
      );
      return Response.json({
        kind: "complete",
        images: result.images,
        missingCount: Math.max(0, input.count - result.images.length),
        ...(result.requestId ? { requestId: result.requestId } : {}),
      });
    }

    const token = requireReplicateToken();
    consumeImageBudget(request, clientKey, input.count);
    const imageInput = await prepareReplicateFileInput(input.image, { token });
    const model = IMAGE_MODEL_SLUGS[input.replicateModel];
    const providerInput = buildReplicateImageInput(
      input.replicateModel,
      prompt,
      imageInput.url,
    );

    const settled = await Promise.allSettled(
      Array.from({ length: input.count }, async (_, index) => {
        const response = await replicateJsonRequest<CreatedPrediction>(
          `/v1/models/${model}/predictions`,
          { method: "POST", body: { input: providerInput }, cancelAfter: "5m" },
          { token },
        );
        return { ...assertCreatedPrediction(response.data, response.requestId), index };
      }),
    );

    const predictions: Array<{ id: string; status: string; index: number }> = [];
    const queueErrors: Array<ReturnType<typeof safeQueueError>> = [];
    settled.forEach((result, index) => {
      if (result.status === "fulfilled") predictions.push(result.value);
      else queueErrors.push(safeQueueError(result.reason, index));
    });

    return Response.json(
      {
        kind: "queued",
        model,
        replicateModel: input.replicateModel,
        predictions,
        queueErrors,
      },
      { status: 202 },
    );
  } catch (error) {
    return apiErrorResponse(error, "이미지 생성 요청을 처리하지 못했습니다.");
  }
}
