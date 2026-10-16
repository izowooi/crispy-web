const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const VALID_CHAR_ID = /^(f|m|mf|mm)(0[1-9]|1[0-6])$/;
const VALID_THEMES = new Set([
  "fantasy",
  "modern",
  "all",
  "male_fantasy",
  "male_modern",
  "all_male",
  "grand_all",
]);

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function inferCharacterTheme(charId) {
  if (charId.startsWith("mf")) return "male_fantasy";
  if (charId.startsWith("mm")) return "male_modern";
  if (charId.startsWith("f")) return "fantasy";
  return "modern";
}

async function parseJsonBody(request, maxBytes = 65536) {
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new Error("Payload too large");
  }
  return JSON.parse(text);
}

async function handleImageFromR2(request, env, url) {
  // Strip leading slash -> e.g. "images/fantasy/f01.jpg"
  const objectKey = url.pathname.replace(/^\/+/, "");

  // Check Cloudflare Edge Cache first
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(url.toString(), request);
  if (cache && request.method === "GET") {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  if (env.IMAGES) {
    try {
      const object = await env.IMAGES.get(objectKey);
      if (object) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        if (!headers.get("Content-Type")) {
          headers.set("Content-Type", "image/jpeg");
        }
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("X-Served-By", "Cloudflare-R2-dream-girl");

        const response = new Response(object.body, {
          status: 200,
          headers,
        });

        if (cache && request.method === "GET") {
          await cache.put(cacheKey, response.clone());
        }
        return response;
      }
    } catch {
      // Fall through to ASSETS fallback
    }
  }

  // Fallback to static bundle assets (useful during local dev before R2 local seeding)
  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }
  return new Response("Image not found", { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Serve Character Portraits from Cloudflare R2 (/images/*)
    if (url.pathname.startsWith("/images/")) {
      return handleImageFromR2(request, env, url);
    }

    // 2. Serve Static Assets & SPA Fallback for non-API routes
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS
        ? env.ASSETS.fetch(request)
        : new Response("Not found", { status: 404 });
    }

    // 3. API Routes (/api/*)
    try {
      if (env.API_LIMITER && request.method === "POST") {
        const { success } = await env.API_LIMITER.limit({
          key: request.headers.get("CF-Connecting-IP") || "anonymous",
        });
        if (!success) {
          return jsonResponse(
            { ok: false, error: "rate_limit", message: "Too many requests" },
            429
          );
        }
      }

      // GET /api/health
      if (url.pathname === "/api/health" && request.method === "GET") {
        let d1Ready = false;
        if (env.DB) {
          try {
            const row = await env.DB.prepare("SELECT COUNT(*) AS cnt FROM dg_character_stats").first();
            d1Ready = Boolean(row);
          } catch {
            d1Ready = false;
          }
        }
        return jsonResponse({
          ok: true,
          service: "dream-girl-world-cup",
          d1: d1Ready,
          r2: Boolean(env.IMAGES),
          timestamp: new Date().toISOString(),
        });
      }

      // GET /api/stats
      if (url.pathname === "/api/stats" && request.method === "GET") {
        if (!env.DB) {
          return jsonResponse({
            ok: true,
            source: "fallback",
            totalTournaments: 0,
            totalMatches: 0,
            stats: {},
            recentChampions: [],
          });
        }

        const [statsRes, tourCountRow, recentRes] = await Promise.all([
          env.DB.prepare(
            "SELECT character_id, wins, matches, championships FROM dg_character_stats"
          ).all(),
          env.DB.prepare("SELECT COUNT(*) AS total FROM dg_tournaments").first(),
          env.DB.prepare(
            "SELECT id, winner_id, runner_up_id, theme, round_size, created_at FROM dg_tournaments ORDER BY id DESC LIMIT 10"
          ).all(),
        ]);

        const statsMap = {};
        let totalWins = 0;
        let totalChamps = 0;

        for (const row of statsRes.results || []) {
          const wins = Number(row.wins || 0);
          const matches = Number(row.matches || 0);
          const championships = Number(row.championships || 0);
          statsMap[row.character_id] = { wins, matches, championships };
          totalWins += wins;
          totalChamps += championships;
        }

        const dbTourCount = Number(tourCountRow?.total || 0);
        const totalTournaments = Math.max(dbTourCount, totalChamps);

        const recentChampions = (recentRes.results || []).map((r) => ({
          id: r.id,
          winnerId: r.winner_id,
          runnerUpId: r.runner_up_id,
          theme: r.theme,
          roundSize: r.round_size,
          createdAt: r.created_at,
        }));

        return jsonResponse({
          ok: true,
          source: "d1",
          totalTournaments,
          totalMatches: totalWins,
          stats: statsMap,
          recentChampions,
        });
      }

      // POST /api/vote
      if (url.pathname === "/api/vote" && request.method === "POST") {
        const payload = await parseJsonBody(request);
        const { winnerId, loserId } = payload || {};
        if (!VALID_CHAR_ID.test(winnerId) || !VALID_CHAR_ID.test(loserId) || winnerId === loserId) {
          return jsonResponse({ ok: false, error: "invalid_character_id" }, 400);
        }

        if (env.DB) {
          const winTheme = inferCharacterTheme(winnerId);
          const loseTheme = inferCharacterTheme(loserId);
          await env.DB.batch([
            env.DB.prepare(
              `INSERT INTO dg_character_stats (character_id, theme, wins, matches, championships, updated_at)
               VALUES (?1, ?2, 1, 1, 0, datetime('now'))
               ON CONFLICT(character_id) DO UPDATE SET
                 wins = wins + 1,
                 matches = matches + 1,
                 updated_at = datetime('now')`
            ).bind(winnerId, winTheme),
            env.DB.prepare(
              `INSERT INTO dg_character_stats (character_id, theme, wins, matches, championships, updated_at)
               VALUES (?1, ?2, 0, 1, 0, datetime('now'))
               ON CONFLICT(character_id) DO UPDATE SET
                 matches = matches + 1,
                 updated_at = datetime('now')`
            ).bind(loserId, loseTheme),
          ]);
        }

        return jsonResponse({ ok: true });
      }

      // POST /api/tournament/complete
      if (url.pathname === "/api/tournament/complete" && request.method === "POST") {
        const payload = await parseJsonBody(request);
        const { winnerId, runnerUpId, semifinalistIds, theme, roundSize } = payload || {};

        if (!VALID_CHAR_ID.test(winnerId)) {
          return jsonResponse({ ok: false, error: "invalid_winner_id" }, 400);
        }

        const safeTheme = VALID_THEMES.has(theme) ? theme : "all";
        const safeRoundSize = [8, 16, 32, 64].includes(Number(roundSize))
          ? Number(roundSize)
          : 16;
        const safeRunnerUp = VALID_CHAR_ID.test(runnerUpId) ? runnerUpId : null;
        const safeSemis = Array.isArray(semifinalistIds)
          ? semifinalistIds.filter((id) => VALID_CHAR_ID.test(id)).slice(0, 4)
          : [];

        if (env.DB) {
          const winTheme = inferCharacterTheme(winnerId);
          await env.DB.batch([
            env.DB.prepare(
              `INSERT INTO dg_character_stats (character_id, theme, wins, matches, championships, updated_at)
               VALUES (?1, ?2, 0, 0, 1, datetime('now'))
               ON CONFLICT(character_id) DO UPDATE SET
                 championships = championships + 1,
                 updated_at = datetime('now')`
            ).bind(winnerId, winTheme),
            env.DB.prepare(
              `INSERT INTO dg_tournaments (winner_id, runner_up_id, semifinalist_ids, theme, round_size, created_at)
               VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`
            ).bind(
              winnerId,
              safeRunnerUp,
              JSON.stringify(safeSemis),
              safeTheme,
              safeRoundSize
            ),
          ]);
        }

        return jsonResponse({ ok: true }, 201);
      }

      // POST /api/share
      if (url.pathname === "/api/share" && request.method === "POST") {
        const payload = await parseJsonBody(request);
        const { winnerId, runnerUpId, semifinalistIds, theme, roundSize, history, nickname } =
          payload || {};

        if (!VALID_CHAR_ID.test(winnerId)) {
          return jsonResponse({ ok: false, error: "invalid_winner_id" }, 400);
        }

        const shareId = crypto.randomUUID().slice(0, 12);
        const safeTheme = VALID_THEMES.has(theme) ? theme : "all";
        const safeRoundSize = [8, 16, 32, 64].includes(Number(roundSize))
          ? Number(roundSize)
          : 16;
        const safeRunnerUp = VALID_CHAR_ID.test(runnerUpId) ? runnerUpId : null;
        const safeSemis = Array.isArray(semifinalistIds)
          ? semifinalistIds.filter((id) => VALID_CHAR_ID.test(id)).slice(0, 4)
          : [];
        const safeHistory = Array.isArray(history) ? history.slice(0, 64) : [];
        const safeNickname =
          typeof nickname === "string" ? nickname.trim().slice(0, 32) : null;

        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO dg_shares (id, winner_id, runner_up_id, semifinalist_ids, theme, round_size, history_json, nickname, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))`
          )
            .bind(
              shareId,
              winnerId,
              safeRunnerUp,
              JSON.stringify(safeSemis),
              safeTheme,
              safeRoundSize,
              JSON.stringify(safeHistory),
              safeNickname
            )
            .run();
        }

        return jsonResponse({ ok: true, id: shareId }, 201);
      }

      // GET /api/share/:id
      if (url.pathname.startsWith("/api/share/") && request.method === "GET") {
        const shareId = url.pathname.slice("/api/share/".length).trim();
        if (!/^[a-zA-Z0-9_-]{6,40}$/.test(shareId) || !env.DB) {
          return jsonResponse({ ok: false, error: "not_found" }, 404);
        }

        const row = await env.DB.prepare(
          "SELECT id, winner_id, runner_up_id, semifinalist_ids, theme, round_size, history_json, nickname, created_at FROM dg_shares WHERE id = ?1"
        )
          .bind(shareId)
          .first();

        if (!row) {
          return jsonResponse({ ok: false, error: "not_found" }, 404);
        }

        return jsonResponse({
          ok: true,
          share: {
            id: row.id,
            winnerId: row.winner_id,
            runnerUpId: row.runner_up_id,
            semifinalistIds: JSON.parse(row.semifinalist_ids || "[]"),
            theme: row.theme,
            roundSize: row.round_size,
            history: JSON.parse(row.history_json || "[]"),
            nickname: row.nickname,
            createdAt: row.created_at,
          },
        });
      }

      return jsonResponse({ ok: false, error: "not_found" }, 404);
    } catch (err) {
      return jsonResponse(
        {
          ok: false,
          error: "internal_error",
          message: err instanceof Error ? err.message : "Unknown error",
        },
        500
      );
    }
  },
};
