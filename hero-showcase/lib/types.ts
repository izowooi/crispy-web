export interface Hero {
  id: string;
  name: string;
  title: string | null;
  job: string | null;
  rarity: string;
  portrait_url: string | null;
  card_url: string;
  metadata: CharacterData | null;
  created_at: string;
}

export interface CharacterData {
  id?: string;
  name?: string;
  title?: string;
  race?: string;
  age?: string;
  job?: string;
  alignment?: string;
  rarity?: string;
  stats?: Record<string, number>;
  skills?: Array<{ name: string; rank: string; percent: number }>;
  weapons?: Array<{ name: string; type: string }>;
  passives?: Array<{ name: string; description: string; color: string }>;
  lore?: Record<string, unknown>;
  quote?: string;
  image_prompt?: string;
}

export interface ParsedHtmlResult {
  characterData: CharacterData;
  portraitDataUrl: string | null;
}
