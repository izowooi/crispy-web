const ORBS = [
  { color: "var(--wood)", left: "-10%", top: "-15%", delay: "0s" },
  { color: "var(--fire)", left: "55%", top: "-20%", delay: "-8s" },
  { color: "var(--earth)", left: "70%", top: "45%", delay: "-16s" },
  { color: "var(--metal)", left: "20%", top: "60%", delay: "-24s" },
  { color: "var(--water)", left: "-15%", top: "35%", delay: "-30s" },
];

export function Sky() {
  return (
    <div className="sky" aria-hidden>
      {ORBS.map((o) => (
        <div
          key={o.color}
          className="sky__orb"
          style={{ background: o.color, left: o.left, top: o.top, animationDelay: o.delay }}
        />
      ))}
      <div className="sky__grid" />
      <div className="sky__grain" />
    </div>
  );
}
