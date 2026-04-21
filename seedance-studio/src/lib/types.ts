export interface VideoSettings {
  duration: 5 | 7 | 8 | 10 | -1;
  resolution: "720p" | "480p";
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "adaptive";
  generateAudio: boolean;
}

export interface GuidedPromptState {
  subject: string;
  action: string;
  setting: string;
  cameraShot: string;
  lighting: string;
  mood: string;
  visualStyle: string;
}

export interface Preset {
  id: string;
  title: string;
  description: string;
  prompt: string;
  settings: VideoSettings;
  emoji: string;
  subject?: string;
  action?: string;
  setting?: string;
  cameraShot?: string;
  lighting?: string;
  mood?: string;
  visualStyle?: string;
}

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export interface Prediction {
  id: string;
  status: PredictionStatus;
  output?: string;
  error?: string;
}

export interface CreatePredictionRequest {
  prompt: string;
  duration: number;
  resolution: string;
  aspect_ratio: string;
  generate_audio: boolean;
}
