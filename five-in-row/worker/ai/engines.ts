import Anthropic from "@anthropic-ai/sdk";
import { gridFrom, turnOf, type DoubleThreeRule } from "../../shared/omok";
import type { Effort, EngineId } from "../../shared/types";
import { candidates, moveInstructions, positionBrief, type Candidate } from "./position";

export interface MoveDecision {
  point: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  confidence?: number;
  comment?: string;
}

export interface EngineRequest {
  /** Moves so far, black first. */
  points: string[];
  doubleThree: DoubleThreeRule;
  /** Haiku only. */
  effort?: Effort;
  signal: AbortSignal;
}

export type Engine = (req: EngineRequest) => Promise<MoveDecision>;

export interface EngineKeys {
  OPENROUTER_KEY?: string;
  OPENAI_API_KEY?: string;
  CLAUDE_API_KEY?: string;
}

// USD per token. Jev reports its own cost via OpenRouter usage.cost.
const PRICE = {
  luna: { input: 0.1 / 1e6 },
  haiku: { input: 0.1 / 1e6, output: 0.5 / 1e6 },
};

function load(req: EngineRequest): Candidate[] {
  return candidates(gridFrom(req.points), turnOf(req.points.length), req.doubleThree);
}

function pickLegal(cands: Candidate[], point: string | undefined): string {
  const hit = cands.find((c) => c.point === point?.trim().toUpperCase());
  if (!hit) throw new Error(`model chose an illegal or unknown point: ${point}`);
  return hit.point;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const jev = (key: string): Engine => async (req) => {
  const cands = load(req);
  const data = await postJson(
    "https://openrouter.ai/api/alpha/decisions",
    {
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://five.zowoo.uk",
      "X-Title": "Omok Zowoo",
    },
    {
      model: "~typesafe/jev-latest",
      state: { position: positionBrief(req.points) },
      questions: {
        move: {
          type: "choice",
          instructions: moveInstructions(req.doubleThree),
          criteria: Object.fromEntries(cands.map((c) => [c.point, c.note])),
        },
      },
    },
    req.signal,
  );
  const answer = data.answers?.move;
  return {
    point: pickLegal(cands, answer?.choice),
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    costUsd: data.usage?.cost ?? 0,
    confidence: answer?.probabilities?.[answer.choice],
  };
};

const luna = (key: string): Engine => async (req) => {
  const cands = load(req);
  const data = await postJson(
    "https://api.openai.com/v1/decisions",
    { Authorization: `Bearer ${key}` },
    {
      model: "gpt-6-luna",
      input: positionBrief(req.points),
      questions: [
        {
          name: "move",
          type: "choice",
          instructions: moveInstructions(req.doubleThree),
          choices: cands.map((c) => ({ value: c.point, description: c.note })),
        },
      ],
    },
    req.signal,
  );
  const answer = (data.answers ?? []).find((a: { name: string }) => a.name === "move");
  if (answer?.type === "refusal") throw new Error("decision refused");
  const input = data.usage?.input_tokens ?? 0;
  const cached = data.usage?.input_tokens_details?.cached_tokens ?? 0;
  const chosen = (answer?.probabilities ?? []).find((p: { value: string }) => p.value === answer?.choice);
  return {
    point: pickLegal(cands, answer?.choice),
    inputTokens: input,
    outputTokens: data.usage?.output_tokens ?? 0,
    costUsd: (input - cached) * PRICE.luna.input,
    confidence: chosen?.probability,
  };
};

const haikuSystem = (rule: DoubleThreeRule) => `You are a strong Gomoku (omok) player competing in a timed game against another AI.
Your clock keeps running while you think, so think in proportion to how critical the position is.
${moveInstructions(rule)}
Reply with the chosen point (exactly as written in the legal point list) and a one-sentence comment about your idea. The comment MUST be written in Korean (한국어), in a friendly coach tone, under 80 characters.`;

const haiku = (key: string): Engine => {
  const anthropic = new Anthropic({ apiKey: key, maxRetries: 0 });
  return async (req) => {
    const effort = req.effort ?? "medium";
    const cands = load(req);
    const msg = await anthropic.messages.create(
      {
        model: "claude-haiku-5-5",
        max_tokens: effort === "high" ? 16000 : 8000,
        system: haikuSystem(req.doubleThree),
        output_config: {
          effort,
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                move: { type: "string", enum: cands.map((c) => c.point) },
                comment: { type: "string" },
              },
              required: ["move", "comment"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "user",
            content: `${positionBrief(req.points)}\n\nLegal points: ${cands.map((c) => c.point).join(", ")}`,
          },
        ],
      },
      { signal: req.signal },
    );
    if (msg.stop_reason === "refusal") throw new Error("model refused");
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error(`no answer (stop_reason=${msg.stop_reason})`);
    const parsed = JSON.parse(text.text) as { move: string; comment: string };
    const u = msg.usage;
    const input = u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    return {
      point: pickLegal(cands, parsed.move),
      inputTokens: input,
      outputTokens: u.output_tokens,
      costUsd: input * PRICE.haiku.input + u.output_tokens * PRICE.haiku.output,
      comment: parsed.comment,
    };
  };
};

const KEY_NAME: Record<EngineId, keyof EngineKeys> = { jev: "OPENROUTER_KEY", luna: "OPENAI_API_KEY", haiku: "CLAUDE_API_KEY" };
const FACTORY: Record<EngineId, (key: string) => Engine> = { jev, luna, haiku };

export function engineAvailable(keys: EngineKeys, id: EngineId): boolean {
  return Boolean(keys[KEY_NAME[id]]);
}

export function createEngine(keys: EngineKeys, id: EngineId): Engine {
  const key = keys[KEY_NAME[id]];
  if (!key) throw new Error(`${id} API key missing`);
  return FACTORY[id](key);
}
