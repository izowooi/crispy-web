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

const SYMBOL_CHARS = new Set("!@#$%^&*()-_=+[]{};:,.<>?/");

export function estimateCharsetSize(input: string): number {
  let size = 0;
  let hasUpper = false;
  let hasLower = false;
  let hasDigit = false;
  let hasSymbol = false;
  let hasOther = false;

  for (const ch of input) {
    if (!hasUpper && ch >= "A" && ch <= "Z") hasUpper = true;
    else if (!hasLower && ch >= "a" && ch <= "z") hasLower = true;
    else if (!hasDigit && ch >= "0" && ch <= "9") hasDigit = true;
    else if (!hasSymbol && SYMBOL_CHARS.has(ch)) hasSymbol = true;
    else if (
      !hasOther &&
      !(ch >= "A" && ch <= "Z") &&
      !(ch >= "a" && ch <= "z") &&
      !(ch >= "0" && ch <= "9") &&
      !SYMBOL_CHARS.has(ch)
    ) {
      hasOther = true;
    }
  }

  if (hasUpper) size += 26;
  if (hasLower) size += 26;
  if (hasDigit) size += 10;
  if (hasSymbol) size += 26;
  if (hasOther) size += 32;

  return size;
}
