/**
 * docs/nai-tags/individual_artists_enriched.json (or individual_artists.json) →
 * public/artist-presets.json
 *
 * 79개 인기 스타일 분석에서 추출된 211명 작가 데이터를 프론트엔드용으로 변환.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = resolve(__dirname, "..");
const ENRICHED = resolve(ROOT, "../docs/nai-tags/individual_artists_enriched.json");
const PLAIN = resolve(ROOT, "../docs/nai-tags/individual_artists.json");
const OUT = resolve(ROOT, "public/artist-presets.json");

const src = existsSync(ENRICHED) ? ENRICHED : PLAIN;
type Row = {
  name: string;
  artist_id?: string;
  preset_count?: number;
  positive_count?: number;
  negative_count?: number;
  avg_positive_weight?: number;
  min_positive_weight?: number;
  max_positive_weight?: number;
  danbooru?: {
    danbooru_id?: number;
    danbooru_name?: string;
    other_names?: string[];
    group_name?: string | null;
  };
};

const raw = JSON.parse(readFileSync(src, "utf-8")) as Row[];

type ArtistPreset = {
  name: string;
  defaultWeight: number;
  minWeight: number;
  maxWeight: number;
  usage: number;
  otherNames?: string[];
  danbooruId?: number;
};

const round = (n: number) => Math.round(n * 10) / 10;

const presets: ArtistPreset[] = raw
  .filter((r) => r.name && (r.positive_count ?? 0) > 0)
  .map((r) => {
    const avg = r.avg_positive_weight ?? 1;
    const minW = r.min_positive_weight ?? 0.5;
    const maxW = r.max_positive_weight ?? 2.0;
    const out: ArtistPreset = {
      name: r.name,
      defaultWeight: round(avg),
      minWeight: round(Math.max(0.1, minW)),
      maxWeight: round(Math.min(5.0, maxW)),
      usage: r.positive_count ?? r.preset_count ?? 0,
    };
    if (r.danbooru?.other_names && r.danbooru.other_names.length > 0) {
      out.otherNames = r.danbooru.other_names;
    }
    if (typeof r.danbooru?.danbooru_id === "number") {
      out.danbooruId = r.danbooru.danbooru_id;
    }
    return out;
  })
  .sort((a, b) => b.usage - a.usage); // popular first

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(presets), "utf-8");

console.log(`built ${presets.length} artist presets → ${OUT}`);
console.log(`top 10 by usage:`);
for (const p of presets.slice(0, 10)) {
  console.log(`  ${p.usage.toString().padStart(3)}× ${p.name} (default ${p.defaultWeight}, ${p.minWeight}~${p.maxWeight})`);
}
