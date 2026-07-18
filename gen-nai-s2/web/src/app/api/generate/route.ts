import { z } from "zod";
import { hasSession, unauthorized } from "@/lib/require-session";
import { queueFetch } from "@/lib/queue-client";

const schema = z.object({
  prompt: z.string().trim().min(1).max(20000),
  negativePrompt: z.string().max(20000),
  count: z.number().int().min(1).max(500),
  bulkMode: z.enum(["fixed", "reroll"]),
  sourceMode: z.enum(["manual", "random", "inspector"]),
  randomRecipe: z.object({
    locked: z.record(z.string(), z.string()), includeSensitive: z.boolean(), includeArtist: z.boolean(), extraPrompt: z.string().max(10000).optional(),
  }).optional(),
  settings: z.object({
    width: z.number().int().min(256).max(2048).multipleOf(64),
    height: z.number().int().min(256).max(2048).multipleOf(64),
    steps: z.number().int().min(1).max(50),
    cfgScale: z.number().min(0).max(20), cfgRescale: z.number().min(0).max(1),
    sampler: z.enum(["k_euler_ancestral", "k_euler", "k_dpmpp_2s_ancestral", "k_dpmpp_2m_sde", "k_dpmpp_2m"]),
    noiseSchedule: z.enum(["native", "karras", "exponential", "polyexponential"]),
    seed: z.number().int().min(0).max(0xffffffff).optional(),
    qualityToggle: z.boolean(), ucPreset: z.number().int().min(0).max(4),
  }),
});

export async function POST(request: Request) {
  if (!(await hasSession())) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  const response = await queueFetch("/enqueue", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data),
  });
  return new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } });
}
