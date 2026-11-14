import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { googleAuthUrl, verifyGoogleIdToken, type GoogleIdentity } from "./google";
import { messagePage, page, redirectPage } from "./pages";
import { authenticate, createSession, destroySession, setSessionCookie } from "./session";
import { type AppEnv, type Env, type User, HttpError, escapeHtml, randomToken, safeNext, sha256B64url, sha256Hex } from "./util";

const OAUTH_COOKIE = "__Host-zk_oauth";
const APP_SCHEME = "zkeep://auth";
const CODE_TTL = 2 * 60_000;
const BOOTSTRAP_SUB = "bootstrap";
const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/;

const auth = new Hono<AppEnv>();

async function upsertUser(env: Env, identity: GoogleIdentity): Promise<User | null> {
  const db = env.DB;
  const existing = await db.prepare("SELECT id FROM users WHERE google_sub = ?").bind(identity.sub).first<{ id: string }>();
  if (existing) {
    await db
      .prepare("UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?")
      .bind(identity.email, identity.name, identity.picture, existing.id)
      .run();
    return { id: existing.id, email: identity.email, name: identity.name, picture: identity.picture };
  }

  // Google 로그인 설정 전에 임시 접속 키로 쓰던 계정이 있으면, 첫 Google 로그인이 그 계정(북마크·기기 연결 포함)을 이어받는다.
  if (identity.sub !== BOOTSTRAP_SUB) {
    const claimed = await db
      .prepare("UPDATE users SET google_sub = ?, email = ?, name = ?, picture = ? WHERE google_sub = ? RETURNING id")
      .bind(identity.sub, identity.email, identity.name, identity.picture, BOOTSTRAP_SUB)
      .first<{ id: string }>();
    if (claimed) return { id: claimed.id, email: identity.email, name: identity.name, picture: identity.picture };
  }

  if (env.SIGNUP_MODE !== "open") {
    const allowed = (env.ALLOWED_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim());
    if (!allowed.includes(identity.email)) {
      const count = await db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
      if (count && count.n > 0) return null;
    }
  }

  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO users (id, google_sub, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, identity.sub, identity.email, identity.name, identity.picture, Date.now())
    .run();
  return { id, email: identity.email, name: identity.name, picture: identity.picture };
}

auth.get("/login", (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const next = safeNext(c.req.query("next"));
  if (!clientId) {
    if (!c.env.BOOTSTRAP_KEY) {
      return c.html(messagePage("Google 로그인 미설정", "서버에 GOOGLE_CLIENT_ID가 설정되지 않았습니다. README의 설정 절차를 확인하세요."), 503);
    }
    return c.html(
      page(
        "임시 로그인",
        `<h1>임시 접속 키로 로그인</h1>
         <p>Google 로그인을 설정하기 전까지 사용하는 임시 로그인입니다.</p>
         <form method="post" action="/auth/bootstrap">
           <input type="hidden" name="next" value="${escapeHtml(next)}">
           <input class="field" type="password" name="key" placeholder="접속 키" autocomplete="current-password" autofocus required>
           <button class="btn" type="submit">로그인</button>
         </form>`,
      ),
    );
  }
  const state = randomToken(16);
  const nonce = randomToken(16);
  // Google이 cross-site POST로 돌아오므로 Lax 쿠키는 실리지 않는다. 이 임시 쿠키만 SameSite=None으로 둔다.
  setCookie(c, OAUTH_COOKIE, `${state}.${nonce}.${encodeURIComponent(next)}`, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 600,
  });
  const redirectUri = `${new URL(c.req.url).origin}/auth/callback`;
  return c.redirect(googleAuthUrl({ clientId, redirectUri, state, nonce }));
});

// Google client ID가 아직 없을 때만 열리는 임시 로그인. GOOGLE_CLIENT_ID를 설정하면 자동으로 닫힌다.
auth.post("/bootstrap", async (c) => {
  if (c.env.GOOGLE_CLIENT_ID || !c.env.BOOTSTRAP_KEY) throw new HttpError(404, "Not found");
  if (c.req.header("Origin") !== new URL(c.req.url).origin) throw new HttpError(403, "잘못된 요청 출처입니다");
  const form = await c.req.parseBody();
  const key = typeof form.key === "string" ? form.key.trim() : "";
  // 해시끼리 비교해 길이·내용에 따른 비교 시간 차이를 없앤다.
  if ((await sha256Hex(key)) !== (await sha256Hex(c.env.BOOTSTRAP_KEY))) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return c.html(messagePage("로그인 실패", "접속 키가 올바르지 않습니다.", { href: "/auth/login", label: "다시 시도" }), 401);
  }
  const user = await upsertUser(c.env, { sub: BOOTSTRAP_SUB, email: "owner@keep.zowoo.uk", name: "Owner", picture: "" });
  if (!user) throw new HttpError(403, "현재 가입이 제한되어 있습니다");
  setSessionCookie(c, await createSession(c.env.DB, user.id, "web", c.req.header("User-Agent") ?? ""));
  return c.html(redirectPage(safeNext(typeof form.next === "string" ? form.next : "/")));
});

auth.post("/callback", async (c) => {
  const fail = (msg: string) => c.html(redirectPage(`/?auth_error=${encodeURIComponent(msg)}`));
  const form = await c.req.parseBody();
  const [state, nonce, ...nextParts] = (getCookie(c, OAUTH_COOKIE) ?? "").split(".");
  const encodedNext = nextParts.join(".");
  deleteCookie(c, OAUTH_COOKIE, { path: "/", secure: true });

  if (typeof form.error === "string") return fail("Google 로그인이 취소되었습니다");
  if (!state || !nonce || form.state !== state || typeof form.id_token !== "string") {
    return fail("로그인 요청이 만료되었습니다. 다시 시도해 주세요");
  }

  let identity: GoogleIdentity;
  try {
    identity = await verifyGoogleIdToken(form.id_token, c.env.GOOGLE_CLIENT_ID ?? "", nonce);
  } catch {
    return fail("Google 계정을 확인하지 못했습니다");
  }

  const user = await upsertUser(c.env, identity);
  if (!user) return fail("현재 가입이 제한되어 있습니다");

  setSessionCookie(c, await createSession(c.env.DB, user.id, "web", c.req.header("User-Agent") ?? ""));
  return c.html(redirectPage(safeNext(decodeURIComponent(encodedNext ?? ""))));
});

auth.post("/logout", async (c) => {
  await destroySession(c);
  return c.body(null, 204);
});

// ── Android 앱 연결: 브라우저에서 로그인 → 동의 → zkeep:// 로 1회성 코드 전달 → 앱이 PKCE verifier로 토큰 교환 ──

auth.get("/app/start", async (c) => {
  const challenge = c.req.query("challenge") ?? "";
  const device = (c.req.query("device") ?? "Android").slice(0, 60);
  if (!CHALLENGE_RE.test(challenge)) {
    return c.html(messagePage("잘못된 요청", "앱에서 다시 로그인을 시작해 주세요."), 400);
  }

  let user: User;
  try {
    ({ user } = await authenticate(c));
  } catch {
    const self = new URL(c.req.url);
    return c.redirect(`/auth/login?next=${encodeURIComponent(self.pathname + self.search)}`);
  }

  // 동의 클릭을 요구한다: 다른 앱이 zkeep:// 스킴을 가로채 로그인된 브라우저 세션으로 몰래 토큰을 받아가는 것을 막는다.
  return c.html(
    page(
      "앱 연결",
      `<h1>ZKeep 앱 연결</h1>
       <p><b>${escapeHtml(device)}</b> 기기의 ZKeep 앱을<br><b>${escapeHtml(user.email)}</b> 계정에 연결합니다.</p>
       <form method="post" action="/auth/app/approve">
         <input type="hidden" name="challenge" value="${escapeHtml(challenge)}">
         <input type="hidden" name="device" value="${escapeHtml(device)}">
         <button class="btn" type="submit">연결하기</button>
       </form>
       <a class="sub" href="/auth/login?next=${encodeURIComponent(new URL(c.req.url).pathname + new URL(c.req.url).search)}">다른 계정으로 로그인</a>`,
    ),
  );
});

auth.post("/app/approve", async (c) => {
  const { user } = await authenticate(c);
  const form = await c.req.parseBody();
  const challenge = typeof form.challenge === "string" ? form.challenge : "";
  const device = typeof form.device === "string" ? form.device.slice(0, 60) : "Android";
  if (!CHALLENGE_RE.test(challenge)) throw new HttpError(400, "잘못된 요청입니다");

  const code = randomToken();
  await c.env.DB.prepare("INSERT INTO auth_codes (code_hash, user_id, challenge, label, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256Hex(code), user.id, challenge, device, Date.now() + CODE_TTL)
    .run();
  // 사용자의 버튼 클릭에서 이어지는 서버 리다이렉트여야 Chrome이 외부 앱 스킴 이동을 허용한다.
  return c.redirect(`${APP_SCHEME}?code=${code}`, 303);
});

auth.post("/app/token", async (c) => {
  const body = await c.req.json<{ code?: unknown; verifier?: unknown }>().catch(() => ({}) as { code?: unknown; verifier?: unknown });
  if (typeof body.code !== "string" || typeof body.verifier !== "string") throw new HttpError(400, "code와 verifier가 필요합니다");

  const row = await c.env.DB.prepare("DELETE FROM auth_codes WHERE code_hash = ? RETURNING user_id, challenge, label, expires_at")
    .bind(await sha256Hex(body.code))
    .first<{ user_id: string; challenge: string; label: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now() || (await sha256B64url(body.verifier)) !== row.challenge) {
    throw new HttpError(400, "연결 코드가 유효하지 않습니다. 다시 로그인해 주세요");
  }

  const token = await createSession(c.env.DB, row.user_id, "device", row.label);
  const user = await c.env.DB.prepare("SELECT id, email, name, picture FROM users WHERE id = ?").bind(row.user_id).first<User>();
  return c.json({ token, user });
});

// ── 로컬 개발/테스트 전용 로그인. 배포 환경에는 DEV_LOGIN을 설정하지 않는다. ──
auth.post("/dev-login", async (c) => {
  if (c.env.DEV_LOGIN !== "1") throw new HttpError(404, "Not found");
  const { email = "dev@example.com" } = await c.req.json<{ email?: string }>().catch(() => ({}) as { email?: string });
  const user = await upsertUser(c.env, { sub: `dev:${email}`, email, name: email.split("@")[0], picture: "" });
  if (!user) throw new HttpError(403, "현재 가입이 제한되어 있습니다");
  setSessionCookie(c, await createSession(c.env.DB, user.id, "web", "dev"));
  return c.json({ user });
});

export default auth;
