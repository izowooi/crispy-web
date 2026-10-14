import { resetProgress } from "@/lib/server/alchemy/combine";
import { AppError, errorResponse } from "@/lib/server/errors";
import { getCurrentAccount } from "@/lib/server/session";

export async function DELETE() {
  try {
    const account = await getCurrentAccount();
    if (!account) throw new AppError("not_signed_in");
    resetProgress(account.sub);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
