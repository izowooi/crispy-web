import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./auth";

export async function hasSession(): Promise<boolean> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
