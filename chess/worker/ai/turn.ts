import type { Game } from "../game";
import type { Engine } from "./engines";

const MAX_ATTEMPTS = 3;

/**
 * Lets the AI on move think and play once. Its API wait is charged to its own clock;
 * after repeated API failures it plays a random legal move so the game can go on.
 */
export async function playAiTurn(
  game: Game,
  engine: Engine,
  ctrl: AbortController,
  now: () => number,
  onUpdate: () => void,
): Promise<void> {
  const color = game.aiToMove();
  if (!color) return;
  const p = game.player(color);
  if (p.kind !== "ai") return;
  const ply = game.snap.moves.length;
  const stale = () => game.snap.status !== "playing" || ctrl.signal.aborted || game.snap.moves.length !== ply;
  const usage = game.snap.usage[color];
  game.snap.thinking = color;
  onUpdate();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const left = game.remaining(color, now());
    if (left <= 0 || ctrl.signal.aborted) break;
    const started = now();
    try {
      const decision = await engine({
        fen: game.chess.fen(),
        pgn: game.chess.pgn(),
        effort: p.effort,
        // The flag alarm normally ends the game first; this is only a backstop.
        signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(left + 50)]),
      });
      if (stale()) return;
      usage.calls++;
      usage.inputTokens += decision.inputTokens;
      usage.outputTokens += decision.outputTokens;
      usage.costUsd += decision.costUsd;
      usage.thinkMs += now() - started;
      if (game.flag(now())) return;
      game.aiMove(decision.san, now(), decision);
      return;
    } catch (err) {
      if (stale()) return;
      usage.thinkMs += now() - started;
      // Running out of clock mid-call is a time loss, not an API failure.
      if (game.flag(now())) return;
      usage.errors++;
      game.snap.lastError = { color, message: errorMessage(err), at: now() };
      onUpdate();
    }
  }
  if (stale() || game.flag(now())) return;
  const legal = game.chess.moves();
  usage.fallbacks++;
  game.aiMove(legal[Math.floor(Math.random() * legal.length)], now(), { fallback: true });
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.name === "TimeoutError" ? "time ran out while waiting for the API" : err.message.slice(0, 200);
  return String(err);
}
