export type ParsedElement = { name: string; emoji: string; desc?: string };

export class BadOutputError extends Error {}

const FALLBACK_EMOJI = "✨";
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

function firstEmoji(raw: unknown): string {
  if (typeof raw !== "string") return FALLBACK_EMOJI;
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  for (const { segment } of segmenter.segment(raw.trim())) {
    if (EMOJI_RE.test(segment)) return segment;
  }
  return FALLBACK_EMOJI;
}

function cleanName(raw: unknown): string {
  if (typeof raw !== "string") throw new BadOutputError("name is not a string");
  const name = raw
    .normalize("NFC")
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .replace(/^[\s"'“”‘’「」『』\[\](){}<>`*]+|[\s"'“”‘’「」『』\[\](){}<>`*.,!?~。、]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) throw new BadOutputError("empty name");
  if ([...name].length > 20) throw new BadOutputError("name too long");
  return name;
}

function cleanDesc(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const desc = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!desc) return undefined;
  const chars = [...desc];
  return chars.length > 60 ? `${chars.slice(0, 59).join("")}…` : desc;
}

/** Extracts the first balanced {...} object from free-form model output. */
function extractJsonObject(text: string): unknown {
  for (let start = text.indexOf("{"); start !== -1; start = text.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          break;
        }
      }
    }
  }
  throw new BadOutputError("no JSON object in output");
}

export function parseAlchemyOutput(text: string): ParsedElement {
  const obj = extractJsonObject(text) as Record<string, unknown>;
  if (!obj || typeof obj !== "object") throw new BadOutputError("not an object");
  const result: ParsedElement = { name: cleanName(obj.name), emoji: firstEmoji(obj.emoji) };
  const desc = cleanDesc(obj.desc);
  if (desc) result.desc = desc;
  return result;
}
