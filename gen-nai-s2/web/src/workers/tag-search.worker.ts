/// <reference lib="webworker" />

import { searchCompactTags, type CompactTag } from "../lib/tag-search";
type SearchRequest = { id: number; query: string; limit?: number };

let indexPromise: Promise<CompactTag[]> | null = null;

function loadIndex(): Promise<CompactTag[]> {
  indexPromise ??= fetch("/data/tags.json", { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) throw new Error(`tag index ${response.status}`);
    return (await response.json()) as CompactTag[];
  });
  return indexPromise;
}

self.onmessage = async (event: MessageEvent<SearchRequest>) => {
  const { id, query, limit } = event.data;
  try {
    const rows = searchCompactTags(await loadIndex(), query, limit);
    self.postMessage({ id, items: rows });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
