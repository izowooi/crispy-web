export type StrengthLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const STRENGTH_THRESHOLDS: number[] = [
  28, 36, 60, 80, 100, 120, 140, 160, 200,
];

export function calcEntropy(length: number, charsetSize: number): number {
  if (length <= 0 || charsetSize <= 1) return 0;
  return length * Math.log2(charsetSize);
}

export function entropyToLevel(entropy: number): StrengthLevel {
  let level = 1;
  for (const threshold of STRENGTH_THRESHOLDS) {
    if (entropy >= threshold) level += 1;
    else break;
  }
  return level as StrengthLevel;
}
