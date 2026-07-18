export type SamplerId =
  | "k_euler_ancestral"
  | "k_euler"
  | "k_dpmpp_2s_ancestral"
  | "k_dpmpp_2m_sde"
  | "k_dpmpp_2m";

export type SourceMode = "manual" | "random" | "inspector";
export type BulkMode = "fixed" | "reroll";

export interface GenerationSettings {
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  cfgRescale: number;
  sampler: SamplerId;
  noiseSchedule: "native" | "karras" | "exponential" | "polyexponential";
  seed?: number;
  qualityToggle: boolean;
  ucPreset: number;
}

export interface RandomRecipe {
  locked: Record<string, string>;
  includeSensitive: boolean;
  includeArtist: boolean;
  extraPrompt?: string;
}

export interface EnqueueRequest {
  prompt: string;
  negativePrompt: string;
  settings: GenerationSettings;
  count: number;
  bulkMode: BulkMode;
  sourceMode: SourceMode;
  randomRecipe?: RandomRecipe;
}

export interface CampaignStatus {
  id: string;
  total: number;
  queued: number;
  processing: number;
  done: number;
  failed: number;
  canceled: number;
  runs: Array<{
    id: string;
    status: "queued" | "processing" | "done" | "failed" | "canceled";
    prompt: string;
    position?: number;
    imageKeys?: string[];
    error?: string;
  }>;
}

export interface NaiPromptMetadata {
  prompt: string;
  negativePrompt: string;
}
