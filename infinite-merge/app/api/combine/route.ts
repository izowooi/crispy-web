import { combine } from "@/lib/server/alchemy/combine";
import { AppError, errorResponse } from "@/lib/server/errors";
import { assertSameOrigin, clientIp, enforceRateLimit, ipKey } from "@/lib/server/guard";
import { readJson } from "@/lib/server/http";
import { getCurrentAccount } from "@/lib/server/session";
import type { CombineRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    // Burst limit first: it costs no D1 reads, so a flood is turned away before touching the database.
    const ip = await ipKey(clientIp(request));
    await enforceRateLimit("COMBINE_LIMITER", ip);
    const account = await getCurrentAccount();
    if (!account) throw new AppError("not_signed_in");
    const body = await readJson<CombineRequest>(request);
    if (!body || typeof body.a !== "string" || typeof body.b !== "string") throw new AppError("bad_request");
    return Response.json(await combine(account.sub, body.a, body.b, { ipKey: ip }));
  } catch (err) {
    return errorResponse(err);
  }
}
