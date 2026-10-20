// Calls every engine configuration once on a fixed position to check keys, latency, and cost.
import { Chess } from "chess.js";
import type { Effort, EngineId } from "../shared/types";
import { createEngine } from "../worker/ai/engines";

const chess = new Chess();
for (const m of ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"]) chess.move(m);

const configs: { id: EngineId; effort?: Effort }[] = [
  { id: "jev" },
  { id: "luna" },
  { id: "haiku", effort: "medium" },
  { id: "haiku", effort: "high" },
];

for (const { id, effort } of configs) {
  const label = effort ? `${id}/${effort}` : id;
  const started = Date.now();
  try {
    const d = await createEngine(process.env, id)({ fen: chess.fen(), pgn: chess.pgn(), effort, signal: AbortSignal.timeout(120_000) });
    console.log(label.padEnd(13), `${Date.now() - started}ms`.padStart(7), d.san.padEnd(6), `$${d.costUsd.toFixed(6)}`, `in=${d.inputTokens} out=${d.outputTokens}`, d.comment ?? `p=${d.confidence}`);
  } catch (err) {
    console.log(label.padEnd(13), "ERROR", (err as Error).message);
  }
}
