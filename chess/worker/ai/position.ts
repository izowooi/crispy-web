import type { Chess, Color, PieceSymbol } from "chess.js";

const NAME: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export interface Candidate {
  san: string;
  uci: string;
  note: string;
}

export function sideName(color: Color): string {
  return color === "w" ? "White" : "Black";
}

/** Legal moves with a purely descriptive note; no evaluation is added so engines are compared on their own. */
export function candidates(chess: Chess): Candidate[] {
  return chess.moves({ verbose: true }).map((m) => ({
    san: m.san,
    uci: m.lan,
    note: `${NAME[m.piece]} ${m.from}->${m.to}`,
  }));
}

export function historyText(chess: Chess, maxPlies = 60): string {
  const moves = chess.history();
  const start = Math.max(0, moves.length - maxPlies);
  const out: string[] = [];
  for (let i = start; i < moves.length; i++) {
    const no = Math.floor(i / 2) + 1;
    if (i % 2 === 0) out.push(`${no}. ${moves[i]}`);
    else if (i === start) out.push(`${no}... ${moves[i]}`);
    else out.push(moves[i]);
  }
  return out.length ? out.join(" ") : "(no moves yet)";
}

export function positionBrief(chess: Chess): string {
  const me = chess.turn();
  return [
    `You are playing ${sideName(me)}. It is ${sideName(me)} to move.`,
    `FEN: ${chess.fen()}`,
    `Board (uppercase = White, lowercase = Black, rank 8 at top):`,
    chess.ascii(),
    `Moves so far: ${historyText(chess)}`,
  ].join("\n");
}

export const MOVE_INSTRUCTIONS =
  "Pick the strongest legal chess move for the side to move. Deliver checkmate when available, win material when it is safe, never leave pieces hanging, and avoid stalemating a winning position.";
