export const runtime = "edge";

// Phase 3 backend가 구현 예정 — 현재는 컴파일 통과용 스텁.
export async function POST(): Promise<Response> {
  return new Response(
    JSON.stringify({ ok: false, error: "not_implemented" }),
    { status: 501, headers: { "content-type": "application/json" } },
  );
}
