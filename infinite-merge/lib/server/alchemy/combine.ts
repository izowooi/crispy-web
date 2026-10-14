import "server-only";
import { BASE_NAMES, normalizeName, pairKey } from "@/lib/elements";
import type { CombineResponse, ElementView } from "@/lib/types";
import { aiProvider, GUEST_MODEL, guestConfig, modelOverride } from "../config";
import { getDb, transaction } from "../db";
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

function owns(sub: string, name: string): boolean {
  if (BASE_NAMES.has(name)) return true;
  return Boolean(getDb().prepare("SELECT 1 FROM discoveries WHERE sub = ? AND element_name = ?").get(sub, name));
}

export async function resolveModel(sub: string, accessToken: string): Promise<string> {
  const account = findAccount(sub);
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

async function generate(sub: string, a: string, b: string): Promise<{ element: ParsedElement; model: string }> {
  if (aiProvider() === "mock") return { element: await mockCombine(a, b), model: "mock" };
  if (isGuest(sub)) return generateAsGuest(sub, a, b);

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

async function generateAsGuest(sub: string, a: string, b: string): Promise<{ element: ParsedElement; model: string }> {
  const { enabled, limits } = guestConfig();
  if (!enabled) throw new AppError("guest_unavailable", { detail: "guest mode disabled" });
  for (let attempt = 0; ; attempt++) {
    // Every model call is charged against the quota, including a retry after bad output.
    consumeGuestCall(sub, limits);
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

// Two quick drops of the same pair must not spend the user's plan twice.
const inflight = new Map<string, Promise<{ result: ParsedElement; model: string | null; generated: boolean }>>();

function recipeFor(key: string): (ElementRow & { model: string | null }) | undefined {
  return getDb()
    .prepare(
      `SELECT e.name, e.emoji, e.desc, e.first_by_sub, r.model
         FROM recipes r JOIN elements e ON e.name = r.result_name
        WHERE r.pair_key = ?`,
    )
    .get(key) as (ElementRow & { model: string | null }) | undefined;
}

export async function combine(sub: string, rawA: string, rawB: string): Promise<CombineResponse> {
  const started = Date.now();
  const a = normalizeName(rawA ?? "");
  const b = normalizeName(rawB ?? "");
  if (!a || !b) throw new AppError("bad_request");
  if (!owns(sub, a) || !owns(sub, b)) throw new AppError("unknown_element");

  const key = pairKey(a, b);
  const cached = recipeFor(key);
  let outcome: { result: ParsedElement; model: string | null; generated: boolean };
  if (cached) {
    outcome = { result: { name: cached.name, emoji: cached.emoji, desc: cached.desc ?? undefined }, model: cached.model, generated: false };
  } else {
    let task = inflight.get(key);
    if (!task) {
      const [x, y] = [a, b].sort();
      task = generate(sub, x, y)
        .then(({ element, model }) => ({ result: element, model, generated: true }))
        .finally(() => inflight.delete(key));
      inflight.set(key, task);
    }
    outcome = await task;
  }

  const db = getDb();
  const now = Date.now();
  return transaction(db, () => {
    let isFirstDiscovery = false;
    let element = db.prepare("SELECT name, emoji, desc, first_by_sub FROM elements WHERE name = ?").get(outcome.result.name) as
      | ElementRow
      | undefined;
    if (!element) {
      db.prepare("INSERT INTO elements (name, emoji, desc, created_at, first_by_sub) VALUES (?, ?, ?, ?, ?)").run(
        outcome.result.name,
        outcome.result.emoji,
        outcome.result.desc ?? null,
        now,
        sub,
      );
      element = { name: outcome.result.name, emoji: outcome.result.emoji, desc: outcome.result.desc ?? null, first_by_sub: sub };
      isFirstDiscovery = true;
    }
    if (outcome.generated) {
      const [x, y] = [a, b].sort();
      db.prepare(
        "INSERT OR IGNORE INTO recipes (pair_key, a, b, result_name, model, created_at, created_by_sub) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(key, x, y, element.name, outcome.model, now, sub);
    }

    let isNew = false;
    let discoveredAt = now;
    let firstDiscovery = isFirstDiscovery;
    if (BASE_NAMES.has(element.name)) {
      discoveredAt = 0;
    } else {
      const existing = db
        .prepare("SELECT discovered_at, first_discovery FROM discoveries WHERE sub = ? AND element_name = ?")
        .get(sub, element.name) as { discovered_at: number; first_discovery: number } | undefined;
      if (existing) {
        discoveredAt = existing.discovered_at;
        firstDiscovery = existing.first_discovery === 1;
      } else {
        db.prepare("INSERT INTO discoveries (sub, element_name, discovered_at, first_discovery) VALUES (?, ?, ?, ?)").run(
          sub,
          element.name,
          now,
          isFirstDiscovery ? 1 : 0,
        );
        isNew = true;
      }
    }

    const result: ElementView = {
      name: element.name,
      emoji: element.emoji,
      desc: element.desc ?? undefined,
      discoveredAt,
      firstDiscovery,
    };
    if (BASE_NAMES.has(element.name)) result.base = true;
    return {
      result,
      isNew,
      isFirstDiscovery,
      cached: !outcome.generated,
      model: outcome.model,
      elapsedMs: Date.now() - started,
      remaining: isGuest(sub) ? guestRemaining(sub, guestConfig().limits) : undefined,
    };
  });
}

export function listUserElements(sub: string): ElementView[] {
  const rows = getDb()
    .prepare(
      `SELECT e.name, e.emoji, e.desc, d.discovered_at, d.first_discovery
         FROM discoveries d JOIN elements e ON e.name = d.element_name
        WHERE d.sub = ?
        ORDER BY d.discovered_at ASC`,
    )
    .all(sub) as { name: string; emoji: string; desc: string | null; discovered_at: number; first_discovery: number }[];
  return rows.map((r) => ({
    name: r.name,
    emoji: r.emoji,
    desc: r.desc ?? undefined,
    discoveredAt: r.discovered_at,
    firstDiscovery: r.first_discovery === 1,
  }));
}

export function worldCount(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM elements").get() as { n: number }).n;
}

export function resetProgress(sub: string): void {
  getDb().prepare("DELETE FROM discoveries WHERE sub = ?").run(sub);
}
