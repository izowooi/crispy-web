import {
  apiErrorResponse,
  isValidPredictionId,
  normalizePrediction,
  replicateJsonRequest,
  requireReplicateToken,
  type ReplicatePrediction,
} from "@/lib/server/api-utils";
import { ValidationError } from "@/lib/server/generation";
import { authorizeApiRequest, recordVideoPredictionStatus } from "@/lib/server/access";

// OpenNext Cloudflare does not support Next.js Edge Runtime route bundles.
// The Node.js runtime is compiled into the Cloudflare Worker with nodejs_compat.
export const runtime = "nodejs";

type RouteContext = {
  readonly params: Promise<{ id: string }> | { id: string };
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    authorizeApiRequest(request);
    const { id } = await context.params;
    if (!isValidPredictionId(id)) {
      throw new ValidationError("PREDICTION_ID_INVALID", "생성 작업 ID가 올바르지 않습니다.");
    }

    const response = await replicateJsonRequest<ReplicatePrediction>(
      `/v1/predictions/${id}`,
      { method: "GET" },
      { token: requireReplicateToken() },
    );
    const prediction = normalizePrediction(response.data);
    recordVideoPredictionStatus(id, prediction.status);
    return Response.json(
      {
        ...prediction,
        ...(response.requestId ? { requestId: response.requestId } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error, "생성 작업 상태를 확인하지 못했습니다.");
  }
}
