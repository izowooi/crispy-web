import {
  ProviderApiError,
  apiErrorResponse,
  isValidPredictionId,
  prepareReplicateFileInput,
  replicateJsonRequest,
  requireReplicateToken,
} from "@/lib/server/api-utils";
import {
  VIDEO_MODEL_SLUGS,
  buildReplicateVideoInput,
  parseVideoFormData,
  readMultipartFormData,
} from "@/lib/server/generation";
import {
  authorizeApiRequest,
  bindVideoPrediction,
  releaseVideoReservation,
  reserveVideoBudget,
} from "@/lib/server/access";

// OpenNext Cloudflare does not support Next.js Edge Runtime route bundles.
// The Node.js runtime is compiled into the Cloudflare Worker with nodejs_compat.
export const runtime = "nodejs";

type CreatedPrediction = {
  readonly id?: unknown;
  readonly status?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let reservationClient: string | undefined;
  let predictionCreateStarted = false;
  try {
    const { clientKey } = authorizeApiRequest(request);
    const input = parseVideoFormData(await readMultipartFormData(request));
    const token = requireReplicateToken();
    reservationClient = reserveVideoBudget(request, clientKey).clientKey;
    const image = input.image
      ? (await prepareReplicateFileInput(input.image, { token })).url
      : input.sourceUrl;
    if (!image) {
      // parseVideoFormData enforces the XOR invariant; this keeps TypeScript and
      // future refactors from ever sending an empty paid request.
      throw new Error("Validated video source is absent");
    }

    const model = VIDEO_MODEL_SLUGS[input.model];
    predictionCreateStarted = true;
    const response = await replicateJsonRequest<CreatedPrediction>(
      `/v1/models/${model}/predictions`,
      {
        method: "POST",
        cancelAfter: "10m",
        body: {
          input: buildReplicateVideoInput(
            input.model,
            input.motionPrompt,
            image,
            input.audio,
          ),
        },
      },
      { token },
    );

    if (
      typeof response.data.id !== "string" ||
      !isValidPredictionId(response.data.id) ||
      typeof response.data.status !== "string"
    ) {
      throw new ProviderApiError(
        "replicate",
        502,
        "PROVIDER_RESPONSE_INVALID",
        "Replicate 동영상 작업 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
        response.requestId,
      );
    }

    bindVideoPrediction(reservationClient, response.data.id);

    return Response.json(
      {
        kind: "queued",
        model,
        videoModel: input.model,
        prediction: {
          id: response.data.id,
          status: response.data.status === "processing" ? "processing" : "starting",
        },
        ...(response.requestId ? { requestId: response.requestId } : {}),
      },
      { status: 202 },
    );
  } catch (error) {
    if (
      reservationClient &&
      (!predictionCreateStarted || (error instanceof ProviderApiError && error.status < 500))
    ) {
      releaseVideoReservation(reservationClient);
    }
    return apiErrorResponse(error, "동영상 생성 요청을 처리하지 못했습니다.");
  }
}
