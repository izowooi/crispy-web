import type { RandomRecipe } from "./types";

export const RANDOM_BUCKETS = {
  subject: ["1girl", "1boy"],
  framing: ["portrait", "upper body", "cowboy shot", "full body", "close-up"],
  pose: ["looking at viewer", "standing", "sitting", "looking back", "head tilt"],
  expression: ["smile", "soft smile", "serious", "blush", "closed mouth"],
  appearance: [
    "long hair", "short hair", "ponytail", "twintails", "braid", "blue eyes", "green eyes",
    "red eyes", "brown eyes", "black hair", "blonde hair", "brown hair", "white hair",
  ],
  outfit: ["dress", "shirt", "jacket", "school uniform", "sweater", "hoodie", "coat", "kimono"],
  setting: ["indoors", "outdoors", "city", "forest", "beach", "bedroom", "cafe", "night sky"],
  lighting: ["soft lighting", "cinematic lighting", "rim lighting", "sunlight", "backlighting"],
  quality: ["very aesthetic", "masterpiece", "highres", "absurdres", "detailed background"],
} as const;

export type RandomSlot = keyof typeof RANDOM_BUCKETS;
export type RandomSelection = Record<RandomSlot, string[]>;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

export function createRandomSelection(recipe?: Partial<RandomRecipe>, random = Math.random): RandomSelection {
  const locked = recipe?.locked ?? {};
  const one = (slot: RandomSlot) => [locked[slot] || pick(RANDOM_BUCKETS[slot], random)];
  const appearance = locked.appearance
    ? [locked.appearance]
    : Array.from(new Set([pick(RANDOM_BUCKETS.appearance, random), pick(RANDOM_BUCKETS.appearance, random)]));
  return {
    subject: one("subject"), framing: one("framing"), pose: one("pose"), expression: one("expression"),
    appearance, outfit: one("outfit"), setting: one("setting"), lighting: one("lighting"), quality: one("quality"),
  };
}

export function selectionToPrompt(selection: RandomSelection): string {
  const ordered: RandomSlot[] = [
    "subject", "appearance", "outfit", "expression", "pose", "framing", "setting", "lighting", "quality",
  ];
  return Array.from(new Set(ordered.flatMap((slot) => selection[slot]).map((tag) => tag.trim()).filter(Boolean))).join(", ");
}

export function randomPrompt(recipe?: Partial<RandomRecipe>, random = Math.random): string {
  return selectionToPrompt(createRandomSelection(recipe, random));
}

export const DEFAULT_NEGATIVE =
  "lowres, bad quality, worst quality, blurry, bad anatomy, bad hands, watermark, signature, text";
