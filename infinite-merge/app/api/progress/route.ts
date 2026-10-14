import { resetProgress } from "@/lib/server/alchemy/combine";
import { AppError, errorResponse } from "@/lib/server/errors";
import { assertSameOrigin } from "@/lib/server/guard";
import { getCurrentAccount } from "@/lib/server/session";

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const account = await getCurrentAccount();
    if (!account) throw new AppError("not_signed_in");
    await resetProgress(account.sub);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
