import {
  CHARSETS,
  PasswordOptions,
  activeCharsetKeys,
  buildCharset,
} from "./charsets";

function unbiasedRandomIndex(modulo: number): number {
  const max = 0x100000000;
  const limit = max - (max % modulo);
  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % modulo;
  }
}

function pickFromString(source: string): string {
  return source.charAt(unbiasedRandomIndex(source.length));
}

function shuffle(arr: string[]): string[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = unbiasedRandomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generatePassword(options: PasswordOptions): string {
  const pool = buildCharset(options);
  if (pool.length === 0 || options.length <= 0) return "";

  const required: string[] = [];
  const activeKeys = activeCharsetKeys(options);

  if (options.length >= activeKeys.length) {
    for (const key of activeKeys) {
      required.push(pickFromString(CHARSETS[key]));
    }
  }

  const remaining = options.length - required.length;
  const rest: string[] = [];
  for (let i = 0; i < remaining; i++) {
    rest.push(pickFromString(pool));
  }

  return shuffle([...required, ...rest]).join("");
}
