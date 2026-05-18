import {
  ACCESS_PASSWORD,
  authCookieHeader,
  jsonAuthResponse,
} from "@/lib/auth";

export const runtime = "edge";

type AuthRequestBody = { password?: unknown };

const ERROR_BAD_REQUEST = "잘못된 요청입니다";
const ERROR_INVALID = "암호가 올바르지 않습니다";

export async function POST(req: Request): Promise<Response> {
  let body: AuthRequestBody;
  try {
    body = (await req.json()) as AuthRequestBody;
  } catch {
    return jsonAuthResponse({ ok: false, error: ERROR_BAD_REQUEST }, 400);
  }

  const password = body?.password;
  if (typeof password !== "string" || password.length === 0) {
    return jsonAuthResponse({ ok: false, error: ERROR_BAD_REQUEST }, 400);
  }

  if (password !== ACCESS_PASSWORD) {
    return jsonAuthResponse({ ok: false, error: ERROR_INVALID }, 401);
  }

  return jsonAuthResponse({ ok: true }, 200, {
    "Set-Cookie": authCookieHeader(),
  });
}

export async function GET(): Promise<Response> {
  return jsonAuthResponse({ ok: false, error: "Method Not Allowed" }, 405);
}
