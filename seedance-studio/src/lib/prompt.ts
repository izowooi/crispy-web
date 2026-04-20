import type { GuidedPromptState } from "./types";

export function buildPrompt(guided: GuidedPromptState): string {
  return [
    guided.subject.trim(),
    guided.action.trim(),
    guided.setting.trim(),
    guided.cameraShot,
    guided.lighting ? `${guided.lighting} lighting` : "",
    guided.mood ? `${guided.mood} mood` : "",
    guided.visualStyle ? `${guided.visualStyle} style` : "",
  ]
    .filter(Boolean)
    .join(", ");
}
