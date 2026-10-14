const BASE_TINTS: Record<string, string> = {
  나무: "74 222 128",
  불: "255 106 61",
  흙: "230 180 80",
  금속: "223 229 242",
  물: "74 168 255",
};

/** Space-separated RGB triplet for `rgb(var(--tint) / a)`; stable per name. */
export function tintOf(name: string): string {
  const base = BASE_TINTS[name];
  if (base) return base;
  let h = 2166136261;
  for (const ch of name) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  const hue = (h >>> 0) % 360;
  return hslToRgb(hue, 0.72, 0.68);
}

function hslToRgb(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)).join(" ");
}
