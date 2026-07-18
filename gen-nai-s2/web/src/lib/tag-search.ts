export type CompactTag = [string, number, number];

export function searchCompactTags(all: CompactTag[], query: string, limit = 8): CompactTag[] {
  const q = query.trim().toLowerCase().replaceAll("_", " ");
  if (q.length < 2) return [];
  const prefix: CompactTag[] = [];
  const substring: CompactTag[] = [];
  for (const row of all) {
    if (row[0].startsWith(q)) {
      prefix.push(row);
      if (prefix.length >= limit) break;
    } else if (substring.length < limit && row[0].includes(q)) {
      substring.push(row);
    }
  }
  return [...prefix, ...substring].slice(0, limit);
}
