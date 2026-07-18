export interface Env {
  GENERATION_QUEUE: DurableObjectNamespace;
  DB: D1Database;
  IMAGES: R2Bucket;
  NAI_TOKEN: string;
  NAI_BASE_URL?: string;
  QUEUE_SERVICE_SECRET: string;
  MIN_INTERVAL_MS?: string;
}

export interface Settings {
  width: number; height: number; steps: number; cfgScale: number; cfgRescale: number;
  sampler: string; noiseSchedule: string; seed?: number; qualityToggle: boolean; ucPreset: number;
}

export interface RandomRecipe { locked: Record<string, string>; includeSensitive: boolean; includeArtist: boolean; extraPrompt?: string }

export interface EnqueueInput {
  prompt: string; negativePrompt: string; settings: Settings; count: number;
  bulkMode: "fixed" | "reroll"; sourceMode: "manual" | "random" | "inspector";
  randomRecipe?: RandomRecipe;
}

export interface StoredRun {
  id: string; campaignId: string; status: "queued" | "processing" | "done" | "failed" | "canceled";
  prompt: string; negativePrompt: string; settings: Settings; createdAt: number;
  imageKeys?: string[]; error?: string;
}

export interface Campaign { id: string; runIds: string[]; createdAt: number }
