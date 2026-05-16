/**
 * gen-nai/web 와 공유되는 도메인 타입.
 * 두 프로젝트가 분리되어 있어 복제하지만, 두 곳을 동시에 수정해야 한다.
 */

export type SamplerId =
  | "euler_ancestral"
  | "euler"
  | "dpmpp_2s_ancestral"
  | "dpmpp_2m_sde"
  | "dpmpp_2m"
  | "dpmpp_sde";

export type CharacterPrompt = {
  prompt: string;
  negativePrompt: string;
};

export type GenerateInput = {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed?: number;
  sampler: SamplerId;
  characters?: CharacterPrompt[];
};

export interface Env {
  NAI_TOKEN: string;
  MIN_INTERVAL_MS?: string;
  NOVELAI_QUEUE: DurableObjectNamespace;
  IMAGES: R2Bucket;
}
