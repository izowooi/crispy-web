import { ENGINES, type EngineId } from "../shared/types";
import { createEngine, engineAvailable } from "../worker/ai/engines";
import { candidates } from "../worker/ai/position";
import { gridFrom, turnOf } from "../shared/omok";

// A scattered middlegame so the candidate list is near its realistic maximum.
const MID = "H8 I9 G7 J10 I7 G9 F6 K11 E5 D4 L12 C3 M5 N6 B10 C11 F12 E13 J4 K3 L8 M9 H12 I13 D8 C7 G3 F2".split(" ");
const points = process.argv.includes("--empty") ? [] : MID;
console.log(`candidates: ${candidates(gridFrom(points), turnOf(points.length), "black").length}`);

const configs: { id: EngineId; effort?: "medium" | "high" }[] = [{ id: "jev" }, { id: "luna" }, { id: "haiku", effort: "medium" }, { id: "haiku", effort: "high" }];
for (const c of configs) {
  const label = `${ENGINES[c.id].name}${c.effort ? ` ${c.effort}` : ""}`;
  if (!engineAvailable(process.env, c.id)) {
    console.log(`${label}: no key`);
    continue;
  }
  const t = Date.now();
  try {
    const d = await createEngine(process.env, c.id)({ points, doubleThree: "black", effort: c.effort, signal: AbortSignal.timeout(120_000) });
    console.log(`${label}: ${d.point} in ${Date.now() - t}ms · $${d.costUsd.toFixed(6)} · ${d.inputTokens}/${d.outputTokens} tok${d.comment ? ` · ${d.comment}` : ""}`);
  } catch (err) {
    console.log(`${label}: ERROR ${(err as Error).message.slice(0, 300)}`);
  }
}
