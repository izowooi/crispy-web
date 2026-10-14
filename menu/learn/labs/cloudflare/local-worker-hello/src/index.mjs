// baby-menu-lab-hello — Workers 의 기본 동작을 눈으로 확인하는 연습용 Worker.
// 바인딩(D1/R2)이 없어서 내 계정의 어떤 리소스도 건드리지 않는다.

// 모듈 최상단 변수는 "isolate 하나"의 수명 동안 유지된다. 요청 사이에 공유되지만 언제든 사라질 수 있다.
const isolateStartedAt = new Date().toISOString();
let requestsInThisIsolate = 0;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function pbkdf2Ms(iterations) {
  const started = performance.now();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("lab"), "PBKDF2", false, ["deriveBits"]);
  await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(16), iterations },
    key,
    256,
  );
  return Math.round(performance.now() - started);
}

const worker = {
  async fetch(request, env) {
    requestsInThisIsolate += 1;
    const url = new URL(request.url);

    // 1) 기본: isolate 와 요청 정보
    if (url.pathname === "/") {
      return json({
        greeting: env.GREETING, // wrangler.jsonc 의 vars
        isolateStartedAt,
        requestsInThisIsolate,
        // request.cf 는 Cloudflare 가 요청마다 붙여 주는 정보다. wrangler dev 에서는 내 위치 기준의 값이 채워진다.
        colo: request.cf?.colo ?? "(없음)",
        country: request.cf?.country ?? "(없음)",
        tryNext: ["/secret", "/pbkdf2?n=100000", "/pbkdf2?n=100001", "/subrequest"],
      });
    }

    // 2) secret: 값은 절대 응답에 싣지 않고 "있는지/길이"만 보여 준다.
    if (url.pathname === "/secret") {
      return json({
        LAB_SECRET_defined: typeof env.LAB_SECRET === "string",
        LAB_SECRET_length: env.LAB_SECRET?.length ?? 0,
        hint: "cp .dev.vars.example .dev.vars 하고 wrangler dev 를 다시 시작하면 defined 가 true 가 된다.",
      });
    }

    // 3) PBKDF2 비용: 반복 횟수가 늘수록 느려진다(= 무차별 대입이 어려워진다).
    //    이 앱은 100,000 을 쓴다. 배포된 Workers 에는 반복 횟수 상한이 있다는 보고가 있지만
    //    로컬 wrangler dev 에서는 그 상한이 적용되지 않는다(아래 n=100001 도 통과한다) — learn/01 참고.
    if (url.pathname === "/pbkdf2") {
      const n = Number(url.searchParams.get("n") ?? "100000");
      try {
        const ms = await pbkdf2Ms(n);
        return json({ iterations: n, ok: true, ms });
      } catch (error) {
        return json({ iterations: n, ok: false, error: String(error.message ?? error) }, 400);
      }
    }

    // 4) subrequest: 이 Worker 가 바깥으로 보내는 fetch 한 번 = subrequest 1개
    if (url.pathname === "/subrequest") {
      const res = await fetch("https://bm.zowoo.uk/cdn-cgi/trace");
      const text = await res.text();
      const colo = /^colo=(.*)$/m.exec(text)?.[1] ?? "?";
      return json({ fetchedFrom: "bm.zowoo.uk/cdn-cgi/trace", coloSeenByThatServer: colo });
    }

    return json({ error: "not found", paths: ["/", "/secret", "/pbkdf2", "/subrequest"] }, 404);
  },
};

export default worker;
