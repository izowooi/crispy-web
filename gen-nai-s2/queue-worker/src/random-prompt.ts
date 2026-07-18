import type { RandomRecipe } from "./types";

const buckets: Record<string, readonly string[]> = {
  subject: ["1girl", "1boy"], framing: ["portrait", "upper body", "cowboy shot", "full body", "close-up"],
  pose: ["looking at viewer", "standing", "sitting", "looking back", "head tilt"],
  expression: ["smile", "soft smile", "serious", "blush", "closed mouth"],
  appearance: ["long hair", "short hair", "ponytail", "twintails", "braid", "blue eyes", "green eyes", "red eyes", "black hair", "blonde hair", "brown hair", "white hair"],
  outfit: ["dress", "shirt", "jacket", "school uniform", "sweater", "hoodie", "coat", "kimono"],
  setting: ["indoors", "outdoors", "city", "forest", "beach", "bedroom", "cafe", "night sky"],
  lighting: ["soft lighting", "cinematic lighting", "rim lighting", "sunlight", "backlighting"],
  quality: ["very aesthetic", "masterpiece", "highres", "absurdres", "detailed background"],
};
const order = ["subject", "appearance", "outfit", "expression", "pose", "framing", "setting", "lighting", "quality"];

export function randomPrompt(recipe?: RandomRecipe, random = Math.random): string {
  const tags: string[] = [];
  for (const slot of order) {
    const locked = recipe?.locked[slot];
    tags.push(locked || buckets[slot][Math.floor(random() * buckets[slot].length)]);
    if (slot === "appearance" && !locked) tags.push(buckets.appearance[Math.floor(random() * buckets.appearance.length)]);
  }
  const base = Array.from(new Set(tags)).join(", ");
  return recipe?.extraPrompt?.trim() ? `${base}, ${recipe.extraPrompt.trim()}` : base;
}
