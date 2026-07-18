import type { EnqueueInput, Env, StoredRun } from "./types";

export function normalizePrompt(value: string): string {
  return value.split(",").map((part) => part.trim().toLowerCase().replaceAll("_", " ").replace(/\s+/g, " ")).filter(Boolean).join(", ");
}

export function splitTags(value: string): string[] {
  return value.split(",").map((tag) => tag.trim().toLowerCase().replaceAll("_", " ")).filter(Boolean);
}

export async function textHash(normalized: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function promptId(positive: string, negative: string): Promise<string> {
  return textHash(`${normalizePrompt(positive)}\0${normalizePrompt(negative)}`);
}

export async function persistCampaign(env: Env, campaignId: string, input: EnqueueInput): Promise<void> {
  const created = new Date().toISOString();
  await env.DB.prepare("INSERT INTO campaigns (id,total,bulk_mode,source_mode,created_at) VALUES (?,?,?,?,?)")
    .bind(campaignId, input.count, input.bulkMode, input.sourceMode, created).run();
}

export async function persistRunStart(env: Env, run: StoredRun): Promise<void> {
  const created = new Date(run.createdAt).toISOString();
  const started = new Date().toISOString();
  const id = await promptId(run.prompt, run.negativePrompt);
  const positiveNormalized = normalizePrompt(run.prompt);
  const negativeNormalized = normalizePrompt(run.negativePrompt);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare("INSERT OR IGNORE INTO prompts (id,positive,positive_normalized,positive_hash,negative,negative_normalized,negative_hash,created_at) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id, run.prompt, positiveNormalized, await textHash(positiveNormalized), run.negativePrompt, negativeNormalized, await textHash(negativeNormalized), created),
  ];
  splitTags(run.prompt).forEach((tag, position) => statements.push(
    env.DB.prepare("INSERT OR IGNORE INTO prompt_tags (prompt_id,position,tag) VALUES (?,?,?)").bind(id, position, tag),
  ));
  statements.push(env.DB.prepare(
    "INSERT INTO generation_runs (id,campaign_id,prompt_id,status,settings_json,seed,created_at,started_at) VALUES (?,?,?,?,?,?,?,?)",
  ).bind(run.id, run.campaignId, id, "processing", JSON.stringify(run.settings), run.settings.seed ?? null, created, started));
  await env.DB.batch(statements);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function persistImages(env: Env, run: StoredRun, images: Uint8Array[]): Promise<string[]> {
  const keys: string[] = [];
  try {
    for (let index = 0; index < images.length; index++) {
      const key = `${run.id}/${index}.png`;
      await env.IMAGES.put(key, images[index], { httpMetadata: { contentType: "image/png" } });
      keys.push(key);
    }
    const completed = new Date().toISOString();
    const statements = await Promise.all(images.map(async (image, index) => env.DB.prepare(
      "INSERT INTO generation_images (id,run_id,image_index,r2_key,byte_size,sha256,created_at) VALUES (?,?,?,?,?,?,?)",
    ).bind(`${run.id}:${index}`, run.id, index, keys[index], image.byteLength, await sha256(image), completed)));
    statements.push(env.DB.prepare("UPDATE generation_runs SET status='done', completed_at=? WHERE id=?").bind(completed, run.id));
    await env.DB.batch(statements);
    return keys;
  } catch (error) {
    await Promise.all(keys.map((key) => env.IMAGES.delete(key).catch(() => undefined)));
    throw error;
  }
}

export async function markFailed(env: Env, runId: string, error: string): Promise<void> {
  await env.DB.prepare("UPDATE generation_runs SET status='failed', error=?, completed_at=? WHERE id=?")
    .bind(error.slice(0, 1000), new Date().toISOString(), runId).run();
}
