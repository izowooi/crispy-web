/**
 * NovelAI 해상도 프리셋 (스크린샷 참조).
 */
export type ResolutionPreset = {
  id: string;
  group: "Normal" | "Large";
  label: string;
  width: number;
  height: number;
};

export const RESOLUTIONS: ResolutionPreset[] = [
  { id: "normal_portrait", group: "Normal", label: "Portrait (832×1216)", width: 832, height: 1216 },
  { id: "normal_landscape", group: "Normal", label: "Landscape (1216×832)", width: 1216, height: 832 },
  { id: "normal_square", group: "Normal", label: "Square (1024×1024)", width: 1024, height: 1024 },
  { id: "large_portrait", group: "Large", label: "Portrait (1024×1536)", width: 1024, height: 1536 },
  { id: "large_landscape", group: "Large", label: "Landscape (1536×1024)", width: 1536, height: 1024 },
  { id: "large_square", group: "Large", label: "Square (1472×1472)", width: 1472, height: 1472 },
];

export const DEFAULT_RESOLUTION = RESOLUTIONS[0];

export const SAMPLERS: { id: import("./types").SamplerId; label: string; recommended?: boolean }[] = [
  { id: "euler_ancestral", label: "Euler Ancestral", recommended: true },
  { id: "euler", label: "Euler" },
  { id: "dpmpp_2s_ancestral", label: "DPM++ 2S Ancestral" },
  { id: "dpmpp_2m_sde", label: "DPM++ 2M SDE" },
  { id: "dpmpp_2m", label: "DPM++ 2M" },
  { id: "dpmpp_sde", label: "DPM++ SDE" },
];
