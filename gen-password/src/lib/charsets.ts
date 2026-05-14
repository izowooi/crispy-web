export const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
} as const;

export type CharsetKey = keyof typeof CHARSETS;

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
}

export function buildCharset(options: PasswordOptions): string {
  let pool = "";
  if (options.uppercase) pool += CHARSETS.uppercase;
  if (options.lowercase) pool += CHARSETS.lowercase;
  if (options.digits) pool += CHARSETS.digits;
  if (options.symbols) pool += CHARSETS.symbols;
  return pool;
}

export function activeCharsetKeys(options: PasswordOptions): CharsetKey[] {
  const keys: CharsetKey[] = [];
  if (options.uppercase) keys.push("uppercase");
  if (options.lowercase) keys.push("lowercase");
  if (options.digits) keys.push("digits");
  if (options.symbols) keys.push("symbols");
  return keys;
}
