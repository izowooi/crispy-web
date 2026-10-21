import type { Color } from "../../shared/types";

// Same flat palette as the chess pieces so both apps feel like one family.
const PALETTE: Record<Color, { fill: string; stroke: string; shine: string }> = {
  w: { fill: "#ffffff", stroke: "#a4b4c7", shine: "#ffffff" },
  b: { fill: "#50555d", stroke: "#3c4047", shine: "#7a818b" },
};

export function StoneSvg({ color, className }: { color: Color; className?: string }) {
  const p = PALETTE[color];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx="52" cy="58" rx="40" ry="38" fill="rgba(30,40,60,0.14)" />
      <circle cx="50" cy="50" r="42" fill={p.fill} stroke={p.stroke} strokeWidth="6" />
      {color === "w" && <path d="M18 62 A36 36 0 0 0 82 62" fill="none" stroke="#e3e9f1" strokeWidth="7" strokeLinecap="round" />}
      <ellipse cx="36" cy="33" rx="11" ry="7.5" fill={p.shine} transform="rotate(-30 36 33)" opacity={color === "w" ? 1 : 0.9} />
    </svg>
  );
}
