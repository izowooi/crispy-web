import { errorResponse } from "@/lib/server/errors";
import { assertSameOrigin } from "@/lib/server/guard";
import { destroySession, getCurrentAccount } from "@/lib/server/session";
import { clearTokens, readCredentials } from "@/lib/server/siwc/credentials";
import { revokeRefreshToken } from "@/lib/server/siwc/oauth";
import { forgetModels } from "@/lib/server/siwc/responses";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch (err) {
    return errorResponse(err);
  }
  const account = await getCurrentAccount();
  let revoked = false;
  if (account?.client_id) {
    const record = readCredentials(account.client_id);
    if (record?.refresh_token) revoked = await revokeRefreshToken(account.client_id, record.refresh_token);
    // Keep the client_id ↔ account mapping and host ID so the next sign-in reuses this registration.
    clearTokens(account.client_id);
    forgetModels(account.sub);
  }
  await destroySession();
  return Response.json({ ok: true, revoked });
}
