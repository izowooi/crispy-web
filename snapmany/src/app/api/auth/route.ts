export const runtime = "edge";

type AuthRequestBody = { password?: unknown };
type AuthResponse = { ok: true } | { ok: false; error: string };

const ERROR_BAD_REQUEST = "잘못된 요청입니다";
const ERROR_INVALID = "암호가 올바르지 않습니다";
const ERROR_SERVER_CONFIG = "서버 설정 오류입니다";

function jsonResponse(body: AuthResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let body: AuthRequestBody;
  try {
    body = (await req.json()) as AuthRequestBody;
  } catch {
    return jsonResponse({ ok: false, error: ERROR_BAD_REQUEST }, 400);
  }

  const password = body?.password;
  if (typeof password !== "string" || password.length === 0) {
    return jsonResponse({ ok: false, error: ERROR_BAD_REQUEST }, 400);
  }

  const expected = process.env.ACCESS_PASSWORD;
  if (typeof expected !== "string" || expected.length === 0) {
    return jsonResponse({ ok: false, error: ERROR_SERVER_CONFIG }, 500);
  }

  if (password === expected) {
    return jsonResponse({ ok: true }, 200);
  }

  return jsonResponse({ ok: false, error: ERROR_INVALID }, 401);
}

export async function GET(): Promise<Response> {
  return jsonResponse({ ok: false, error: "Method Not Allowed" }, 405);
}
