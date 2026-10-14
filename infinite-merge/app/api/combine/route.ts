import { combine } from "@/lib/server/alchemy/combine";
import { AppError, errorResponse } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { getCurrentAccount } from "@/lib/server/session";
import type { CombineRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const account = await getCurrentAccount();
    if (!account) throw new AppError("not_signed_in");
    const body = await readJson<CombineRequest>(request);
    if (!body || typeof body.a !== "string" || typeof body.b !== "string") throw new AppError("bad_request");
    return Response.json(await combine(account.sub, body.a, body.b));
  } catch (err) {
    return errorResponse(err);
  }
}
