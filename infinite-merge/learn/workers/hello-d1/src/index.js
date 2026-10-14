// 실습용 미니 Worker: fetch 핸들러 하나에 D1 · vars · secret · Rate Limiting binding을 모두 담았다.
// 본 앱은 Next.js(OpenNext)가 이 fetch 핸들러를 만들어 주는 것이고, 원리는 똑같다.
const worker = {
  /**
   * @param {Request} request
   * @param {{ DB: D1Database, LIMITER: RateLimit, GREETING: string, LAB_SECRET?: string }} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") ?? "local";

    if (url.pathname === "/visit") {
      // D1: 한 번 쓰고(RETURNING으로 새 id 받기), 한 번 읽는다. batch는 하나의 트랜잭션이다.
      const [inserted, counted] = await env.DB.batch([
        env.DB.prepare("INSERT INTO lab_visits (path, at) VALUES (?, ?) RETURNING id").bind(url.pathname, Date.now()),
        env.DB.prepare("SELECT COUNT(*) AS n FROM lab_visits"),
      ]);
      return Response.json({ id: inserted.results[0].id, total: counted.results[0].n, meta: counted.meta });
    }

    if (url.pathname === "/limited") {
      // Rate Limiting: 키(여기서는 IP)마다 10초에 5번. 로컬에서는 정확하고, 운영에서는 느슨하다.
      const { success } = await env.LIMITER.limit({ key: ip });
      return success ? new Response("ok\n") : new Response("too many\n", { status: 429 });
    }

    if (url.pathname === "/secret") {
      // 비밀값은 절대 그대로 응답하지 않는다. 설정됐는지·길이만 확인한다.
      const s = env.LAB_SECRET;
      return Response.json({ configured: Boolean(s), length: s?.length ?? 0 });
    }

    if (url.pathname === "/later") {
      // ctx.waitUntil: 응답은 바로 보내고, 뒷정리는 Worker가 이어서 한다.
      ctx.waitUntil(env.DB.prepare("DELETE FROM lab_visits WHERE at < ?").bind(Date.now() - 60_000).run());
      return new Response("1분 지난 방문 기록 정리를 예약했어요\n");
    }

    return new Response(
      `${env.GREETING}! 실습 Worker예요.\n` +
        "GET /visit    D1에 쓰고 읽기\nGET /limited  Rate Limiting (10초 5회)\n" +
        "GET /secret   secret이 설정됐는지\nGET /later    ctx.waitUntil 뒷정리\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  },
};

export default worker;
