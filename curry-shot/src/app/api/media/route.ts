import { apiErrorResponse } from "@/lib/server/api-utils";
import { authorizeApiRequest } from "@/lib/server/access";
import { ValidationError, isAllowedReplicateUrl } from "@/lib/server/generation";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    authorizeApiRequest(request);
    const source = new URL(request.url).searchParams.get("url") ?? "";
    if (!isAllowedReplicateUrl(source)) {
      throw new ValidationError("SOURCE_URL_FORBIDDEN", "안전한 Replicate 결과 URL만 가져올 수 있습니다.");
    }
    const response = await fetch(source, { redirect: "error" });
    if (!response.ok || !response.body) {
      return Response.json(
        { error: "결과 이미지를 가져오지 못했습니다.", code: "MEDIA_FETCH_FAILED" },
        { status: 502 },
      );
    }
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      return Response.json(
        { error: "지원하지 않는 결과 파일입니다.", code: "MEDIA_TYPE_INVALID" },
        { status: 502 },
      );
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "결과 파일을 가져오지 못했습니다.");
  }
}
