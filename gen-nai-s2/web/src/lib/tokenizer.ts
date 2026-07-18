interface TokenizerDef { model: { vocab: [string, number][]; unk_id: number } }
interface Vocab { pieces: Map<string, number>; maxPieceLength: number; unkScore: number }

let vocabPromise: Promise<Vocab> | null = null;

async function loadVocab(): Promise<Vocab> {
  vocabPromise ??= fetch("/data/t5_tokenizer.json", { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`tokenizer ${r.status}`);
      return r.json() as Promise<TokenizerDef>;
    })
    .then((def) => {
      const pieces = new Map<string, number>();
      let maxPieceLength = 0;
      let minScore = Infinity;
      for (const [piece, score] of def.model.vocab) {
        pieces.set(piece, score);
        maxPieceLength = Math.max(maxPieceLength, piece.length);
        minScore = Math.min(minScore, score);
      }
      return { pieces, maxPieceLength, unkScore: minScore - 10 };
    });
  return vocabPromise;
}

function viterbiCount(piece: string, vocab: Vocab): number {
  const scores = new Float64Array(piece.length + 1).fill(-Infinity);
  const counts = new Int32Array(piece.length + 1);
  scores[0] = 0;
  for (let i = 0; i < piece.length; i++) {
    if (scores[i] === -Infinity) continue;
    let matched = false;
    for (let len = 1; len <= Math.min(vocab.maxPieceLength, piece.length - i); len++) {
      const score = vocab.pieces.get(piece.slice(i, i + len));
      if (score === undefined) continue;
      matched = true;
      if (scores[i] + score > scores[i + len]) {
        scores[i + len] = scores[i] + score;
        counts[i + len] = counts[i] + 1;
      }
    }
    if (!matched && scores[i] + vocab.unkScore > scores[i + 1]) {
      scores[i + 1] = scores[i] + vocab.unkScore;
      counts[i + 1] = counts[i] + 1;
    }
  }
  return counts[piece.length];
}

export async function countTokens(text: string): Promise<number> {
  const vocab = await loadVocab();
  const cleaned = text.replace(/[[\]{}]/g, "").replace(/-?\d*\.?\d*::/g, "");
  return cleaned.split(/\s+/).filter(Boolean).reduce((sum, part) => sum + viterbiCount(`▁${part}`, vocab), 1);
}
