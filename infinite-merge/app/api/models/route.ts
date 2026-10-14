import { connection } from "next/server";
import { resolveModel } from "@/lib/server/alchemy/combine";
import { aiProvider, GUEST_MODEL } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";
import { AppError, errorResponse } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { getCurrentAccount, isGuest } from "@/lib/server/session";
import { getValidAccessToken } from "@/lib/server/siwc/oauth";
import { listModels } from "@/lib/server/siwc/responses";
import type { ModelsResponse } from "@/lib/types";

const MOCK_MODELS: ModelsResponse = { models: [{ slug: "mock", displayName: "Mock (오프라인)" }], selected: "mock" };
// Guests play on the operator's key, so the model is fixed to the cheap one.
const GUEST_MODELS: ModelsResponse = { models: [{ slug: GUEST_MODEL, displayName: "Claude Haiku 5.5" }], selected: GUEST_MODEL };

export async function GET() {
  // Request-time only; awaited outside try so the prerender bail-out isn't swallowed as an app error.
  await connection();
  try {
    const account = await getCurrentAccount();
    if (!account) throw new AppError("not_signed_in");
    if (aiProvider() === "mock") return Response.json(MOCK_MODELS);
    if (isGuest(account.sub)) return Response.json(GUEST_MODELS);
    const { accessToken } = await getValidAccessToken(account.sub);
    const models = await listModels(account.sub, accessToken);
    const selected = await resolveModel(account.sub, accessToken);
    return Response.json({ models, selected } satisfies ModelsResponse);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const account = await getCurrentAccount();
    if (!account) throw new AppError("not_signed_in");
    const body = await readJson<{ slug?: unknown }>(request);
    if (typeof body?.slug !== "string") throw new AppError("bad_request");
    if (aiProvider() === "mock") return Response.json(MOCK_MODELS);
    if (isGuest(account.sub)) return Response.json(GUEST_MODELS);

    const { accessToken } = await getValidAccessToken(account.sub);
    const models = await listModels(account.sub, accessToken);
    if (!models.some((m) => m.slug === body.slug)) {
      throw new AppError("bad_request", { message: "이 계정에서 사용할 수 없는 모델이에요." });
    }
    getDb().prepare("UPDATE accounts SET selected_model = ? WHERE sub = ?").run(body.slug, account.sub);
    return Response.json({ models, selected: body.slug } satisfies ModelsResponse);
  } catch (err) {
    return errorResponse(err);
  }
}
