import "server-only";
import { BASE_NAMES, normalizeName, pairKey } from "@/lib/elements";
import type { CombineResponse, ElementView } from "@/lib/types";
import { aiProvider, GUEST_MODEL, guestConfig, modelOverride } from "../config";
import { getDb } from "../db";
import { AppError } from "../errors";
import { claudeAlchemy } from "../guest/claude";
import { consumeGuestCall, guestRemaining } from "../guest/quota";
import { findAccount, isGuest } from "../session";
import { getValidAccessToken } from "../siwc/oauth";
import { listModels, pickDefaultModel, streamResponse } from "../siwc/responses";
import { withTransientRetry } from "../retry";
import { mockCombine } from "./mock";
import { BadOutputError, parseAlchemyOutput, type ParsedElement } from "./parse";
import { ALCHEMY_INSTRUCTIONS, buildAlchemyInput } from "./prompt";

type ElementRow = { name: string; emoji: string; desc: string | null; first_by_sub: string | null };

async function ownsBoth(sub: string, a: string, b: string): Promise<boolean> {
  const needed = [a, b].filter((n) => !BASE_NAMES.has(n));
  if (needed.length === 0) return true;
  const { results } = await getDb()
    .prepare("SELECT element_name FROM im_discoveries WHERE sub = ? AND element_name IN (?, ?)")
    .bind(sub, needed[0], needed[1] ?? needed[0])
    .all<{ element_name: string }>();
  const owned = new Set(results.map((r) => r.element_name));
  return needed.every((n) => owned.has(n));
}

export async function resolveModel(sub: string, accessToken: string): Promise<string> {
  const account = await findAccount(sub);
  if (account?.selected_model) return account.selected_model;
  const override = modelOverride();
  if (override) return override;
  const models = await listModels(sub, accessToken);
  const model = pickDefaultModel(models);
  if (!model) throw new AppError("not_eligible", { message: "이 계정에서 사용할 수 있는 모델이 없어요." });
  console.info(`[alchemy] auto model=${model} (listed: ${models.map((m) => m.slug).join(", ")})`);
  return model;
}

// Overload blips are common and short. Two quiet retries keep the game flowing; the
// budget caps how long the fusion animation can spin before we hand control back to the player.
const TRANSIENT_RETRY = { delaysMs: [800, 2500], budgetMs: 15_000 };

type CallerContext = { ipKey: string | null };

async function generate(sub: string, a: string, b: string, ctx: CallerContext): Promise<{ element: ParsedElement; model: string }> {
  if (aiProvider() === "mock") return { element: await mockCombine(a, b), model: "mock" };
  if (isGuest(sub)) return generateAsGuest(sub, a, b, ctx);

  const { accessToken } = await getValidAccessToken(sub);
  const model = await resolveModel(sub, accessToken);
  for (let attempt = 0; ; attempt++) {
    const { text } = await withTransientRetry(
      () =>
        streamResponse({
          accessToken,
          model,
          instructions: ALCHEMY_INSTRUCTIONS,
          input: buildAlchemyInput(a, b),
          reasoningEffort: "low",
        }),
      {
        ...TRANSIENT_RETRY,
        onRetry: (n, wait, err) => console.warn(`[alchemy] transient failure (${err.detail ?? err.code}); retry ${n} in ${wait}ms`),
      },
    );
    try {
      return { element: parseAlchemyOutput(text), model };
    } catch (err) {
      if (!(err instanceof BadOutputError)) throw err;
      console.warn(`[alchemy] bad output (attempt ${attempt + 1}): ${err.message}`);
      if (attempt >= 1) throw new AppError("bad_output", { detail: err.message });
    }
  }
}

async function generateAsGuest(
  sub: string,
  a: string,
  b: string,
  ctx: CallerContext,
): Promise<{ element: ParsedElement; model: string }> {
  const { enabled, limits } = guestConfig();
  if (!enabled) throw new AppError("guest_unavailable", { detail: "guest mode disabled" });
  for (let attempt = 0; ; attempt++) {
    // Every model call is charged against the quota, including a retry after bad output.
    await consumeGuestCall(sub, ctx.ipKey, limits);
    const text = await claudeAlchemy(a, b);
    try {
      return { element: parseAlchemyOutput(text), model: GUEST_MODEL };
    } catch (err) {
      if (!(err instanceof BadOutputError)) throw err;
      console.warn(`[alchemy] guest bad output (attempt ${attempt + 1}): ${err.message}`);
      if (attempt >= 1) throw new AppError("bad_output", { detail: err.message });
    }
  }
}

// Two quick drops of the same pair must not spend the user's plan twice (per Worker isolate).
const inflight = new Map<string, Promise<{ result: ParsedElement; model: string | null; generated: boolean }>>();

async function recipeFor(key: string): Promise<(ElementRow & { model: string | null }) | null> {
  return getDb()
    .prepare(
      `SELECT e.name, e.emoji, e.desc, e.first_by_sub, r.model
         FROM im_recipes r JOIN im_elements e ON e.name = r.result_name
        WHERE r.pair_key = ?`,
    )
    .bind(key)
    .first<ElementRow & { model: string | null }>();
}

export async function combine(sub: string, rawA: string, rawB: string, ctx: CallerContext = { ipKey: null }): Promise<CombineResponse> {
  const started = Date.now();
  const a = normalizeName(rawA ?? "");
  const b = normalizeName(rawB ?? "");
  if (!a || !b) throw new AppError("bad_request");
  if (!(await ownsBoth(sub, a, b))) throw new AppError("unknown_element");

  const key = pairKey(a, b);
  const cached = await recipeFor(key);
  let outcome: { result: ParsedElement; model: string | null; generated: boolean };
  if (cached) {
    outcome = { result: { name: cached.name, emoji: cached.emoji, desc: cached.desc ?? undefined }, model: cached.model, generated: false };
  } else {
    let task = inflight.get(key);
    if (!task) {
      const [x, y] = [a, b].sort();
      task = generate(sub, x, y, ctx)
        .then(({ element, model }) => ({ result: element, model, generated: true }))
        .finally(() => inflight.delete(key));
      inflight.set(key, task);
    }
    outcome = await task;
  }

  const db = getDb();
  const now = Date.now();
  let isFirstDiscovery = false;
  let resultName = outcome.result.name;
  if (outcome.generated) {
    // D1 runs a batch as one transaction: the element and its recipe land together or not at all.
    const [x, y] = [a, b].sort();
    const [elementWrite, recipeWrite] = await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO im_elements (name, emoji, desc, created_at, first_by_sub) VALUES (?, ?, ?, ?, ?) RETURNING name",
        )
        .bind(outcome.result.name, outcome.result.emoji, outcome.result.desc ?? null, now, sub),
      db
        .prepare(
          "INSERT OR IGNORE INTO im_recipes (pair_key, a, b, result_name, model, created_at, created_by_sub) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING pair_key",
        )
        .bind(key, x, y, outcome.result.name, outcome.model, now, sub),
    ]);
    // RETURNING yields a row only when the insert happened. meta.changes is no help here: on D1 it also
    // counts rows touched by triggers (the im_counters bump), so a fresh element reports 2.
    isFirstDiscovery = elementWrite.results.length === 1;
    if (recipeWrite.results.length === 0) {
      // Another Worker isolate recorded this pair a moment earlier: the shared recipe book wins.
      const canonical = await recipeFor(key);
      if (canonical && canonical.name !== resultName) {
        resultName = canonical.name;
        outcome = { ...outcome, model: canonical.model };
        isFirstDiscovery = false;
      }
    }
  }

  const isBase = BASE_NAMES.has(resultName);
  const statements = [
    // A pre-seeded element (first_by_sub = 'seed') is still unclaimed: whoever makes it first owns the world-first.
    db.prepare("UPDATE im_elements SET first_by_sub = ? WHERE name = ? AND first_by_sub = 'seed' RETURNING name").bind(sub, resultName),
    db.prepare("SELECT name, emoji, desc, first_by_sub FROM im_elements WHERE name = ?").bind(resultName),
  ];
  if (!isBase) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO im_discoveries (sub, element_name, discovered_at, first_discovery)
           VALUES (?, ?, ?, COALESCE((SELECT first_by_sub = ? FROM im_elements WHERE name = ?), 0)) RETURNING sub`,
        )
        // Runs after the claim above in the same batch, so "is the world-first mine?" is answered by the row itself.
        .bind(sub, resultName, now, sub, resultName),
      db.prepare("SELECT discovered_at, first_discovery FROM im_discoveries WHERE sub = ? AND element_name = ?").bind(sub, resultName),
    );
  }
  const [claim, elementRead, discoveryWrite, discoveryRead] = await db.batch(statements);
  const element = elementRead.results[0] as ElementRow | undefined;
  if (!element) throw new AppError("internal", { detail: `element ${resultName} missing after combine` });
  if (claim.results.length === 1 && !isBase) isFirstDiscovery = true;

  let isNew = false;
  let discoveredAt = 0;
  let firstDiscovery = false;
  if (!isBase) {
    const row = discoveryRead.results[0] as { discovered_at: number; first_discovery: number };
    isNew = discoveryWrite.results.length === 1;
    discoveredAt = row.discovered_at;
    firstDiscovery = row.first_discovery === 1;
  }

  const result: ElementView = {
    name: element.name,
    emoji: element.emoji,
    desc: element.desc ?? undefined,
    discoveredAt,
    firstDiscovery,
  };
  if (isBase) result.base = true;
  return {
    result,
    isNew,
    isFirstDiscovery,
    cached: !outcome.generated,
    model: outcome.model,
    elapsedMs: Date.now() - started,
    remaining: isGuest(sub) ? await guestRemaining(sub, guestConfig().limits) : undefined,
  };
}

export async function listUserElements(sub: string): Promise<ElementView[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT e.name, e.emoji, e.desc, d.discovered_at, d.first_discovery
         FROM im_discoveries d JOIN im_elements e ON e.name = d.element_name
        WHERE d.sub = ?
        ORDER BY d.discovered_at ASC`,
    )
    .bind(sub)
    .all<{ name: string; emoji: string; desc: string | null; discovered_at: number; first_discovery: number }>();
  return results.map((r) => ({
    name: r.name,
    emoji: r.emoji,
    desc: r.desc ?? undefined,
    discoveredAt: r.discovered_at,
    firstDiscovery: r.first_discovery === 1,
  }));
}

/** Kept by triggers on im_elements (see migrations/0001_init.sql), so this reads one row, not the whole table. */
export async function worldCount(): Promise<number> {
  return (await getDb().prepare("SELECT value FROM im_counters WHERE key = 'elements'").first<number>("value")) ?? 0;
}

export async function resetProgress(sub: string): Promise<void> {
  await getDb().prepare("DELETE FROM im_discoveries WHERE sub = ?").bind(sub).run();
}
