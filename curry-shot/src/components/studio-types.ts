export type SourceMode = "scene" | "cover" | "dialogue";
export type Treatment = "faithful" | "cinematic";
export type Provider = "openai" | "replicate";
export type ReplicateModel = "flux" | "seedream" | "nano";
export type VideoModel = "seedance" | "grok";

export type ResultAsset = {
  clientId: string;
  status: "queued" | "ready" | "failed";
  url?: string;
  predictionId?: string;
  error?: string;
  provider: Provider;
  modelLabel: string;
  index: number;
};

export type OverlayConfig = {
  title?: string;
  speaker?: string;
  dialogue?: string;
};

export type VideoJob = {
  predictionId: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled" | "aborted";
  output?: string;
  error?: string;
  model: VideoModel;
  audio: boolean;
};
