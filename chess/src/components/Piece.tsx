import type { ReactNode } from "react";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";

interface Palette {
  fill: string;
  stroke: string;
  accent: string;
  shine: string;
}

const PALETTE: Record<PieceColor, Palette> = {
  w: { fill: "#ffffff", stroke: "#a4b4c7", accent: "#e3e9f1", shine: "#ffffff" },
  b: { fill: "#50555d", stroke: "#3c4047", accent: "#3c4047", shine: "#6d737c" },
};

const BASE = <rect x="26" y="71" width="48" height="13" rx="6.5" />;
const BODY = <path d="M41 61 C41 66 37 70 34 73 L66 73 C63 70 59 66 59 61 Z" />;
const COLLAR = (w = 28) => <rect x={50 - w / 2} y="55" width={w} height="7" rx="3.5" />;

const SHAPES: Record<PieceType, (p: Palette) => ReactNode> = {
  p: (p) => (
    <>
      {BASE}
      <path d="M41 50 C41 59 37 67 32 73 L68 73 C63 67 59 59 59 50 Z" />
      <rect x="37" y="45" width="26" height="7" rx="3.5" />
      <circle cx="50" cy="32" r="13" />
      <ellipse cx="45.5" cy="27.5" rx="4" ry="3" fill={p.shine} stroke="none" />
    </>
  ),
  r: (p) => (
    <>
      {BASE}
      <path d="M36 38 L64 38 L66 72 L34 72 Z" />
      <path d="M30 16 H39 V23 H45.5 V16 H54.5 V23 H61 V16 H70 V36 H30 Z" />
      <rect x="32" y="33" width="36" height="7" rx="3.5" />
      <rect x="45" y="47" width="10" height="14" rx="5" fill={p.accent} />
    </>
  ),
  n: (p) => (
    <>
      {BASE}
      <path d="M35 72 C35 61 41 55 46 49 C40 51 33 53 29 49 C26 46 27 42 30 39 L45 25 C47 21 50 17 55 16 L57 21 C67 24 73 36 72 50 C71 60 67 66 65 72 Z" />
      <path d="M58 22 C66 28 69 39 68 50 C67.5 56 66 61 64.5 66" fill="none" stroke={p.accent} strokeWidth="4" />
      <circle cx="49" cy="31" r="3.2" fill={p.stroke} stroke="none" />
      <circle cx="33.5" cy="44" r="1.8" fill={p.stroke} stroke="none" />
    </>
  ),
  b: (p) => (
    <>
      {BASE}
      {BODY}
      {COLLAR(26)}
      <path d="M50 20 C61 28 66 39 62.5 48.5 C60.5 54 56 56 50 56 C44 56 39.5 54 37.5 48.5 C34 39 39 28 50 20 Z" />
      <path d="M55 31 L46 41" fill="none" stroke={p.accent} strokeWidth="4.5" />
      <circle cx="50" cy="14.5" r="5.5" />
      <ellipse cx="44" cy="36" rx="2.6" ry="5" fill={p.shine} stroke="none" transform="rotate(20 44 36)" />
    </>
  ),
  q: (p) => (
    <>
      {BASE}
      {BODY}
      {COLLAR(30)}
      <path d="M30 27 L38.5 49 L41 22 L50 45 L59 22 L61.5 49 L70 27 L64 57 L36 57 Z" />
      <circle cx="30" cy="25" r="4.5" />
      <circle cx="41" cy="20" r="4.5" />
      <circle cx="59" cy="20" r="4.5" />
      <circle cx="70" cy="25" r="4.5" />
      <circle cx="50" cy="16" r="5" />
      <rect x="38" y="49" width="24" height="4" rx="2" fill={p.accent} stroke="none" />
    </>
  ),
  k: (p) => (
    <>
      {BASE}
      {BODY}
      {COLLAR(30)}
      <path d="M50 26 C62 26 69 33 66.5 42 L62 57 L38 57 L33.5 42 C31 33 38 26 50 26 Z" />
      <rect x="46.5" y="6" width="7" height="22" rx="3" />
      <rect x="40" y="11.5" width="20" height="7" rx="3" />
      <rect x="38" y="47" width="24" height="4" rx="2" fill={p.accent} stroke="none" />
    </>
  ),
};

export function PieceSvg({ type, color, className }: { type: PieceType; color: PieceColor; className?: string }) {
  const p = PALETTE[color];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx="50" cy="86" rx="25" ry="5" fill="rgba(30,40,60,0.10)" />
      <g fill={p.fill} stroke={p.stroke} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        {SHAPES[type](p)}
      </g>
    </svg>
  );
}
