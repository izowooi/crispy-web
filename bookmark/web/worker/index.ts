import { Hono } from "hono";
import auth from "./auth";
import api from "./bookmarks";
import { messagePage } from "./pages";
import { type AppEnv, type Env, DAY, HttpError } from "./util";

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof HttpError ? err.message : "서버 오류가 발생했습니다";
  if (status === 500) console.error(err);
  c.header("Cache-Control", "no-store");
  // 브라우저가 직접 여는 /auth/* 페이지는 HTML로, 나머지는 JSON으로 답한다.
  const wantsHtml = c.req.path.startsWith("/auth/") && (c.req.header("Accept") ?? "").includes("text/html");
  return wantsHtml ? c.html(messagePage("문제가 발생했습니다", message, { href: "/", label: "홈으로" }), status) : c.json({ error: message }, status);
});

app.route("/auth", auth);
app.route("/api", api);
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));
app.all("/auth/*", (c) => c.json({ error: "Not found" }, 404));

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM bookmarks WHERE deleted_at IS NOT NULL AND deleted_at < ?").bind(now - 30 * DAY),
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
      env.DB.prepare("DELETE FROM auth_codes WHERE expires_at < ?").bind(now),
    ]);
  },
} satisfies ExportedHandler<Env>;
