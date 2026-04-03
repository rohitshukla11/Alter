"use client";

type Props = {
  connected: boolean;
};

function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z`;
}

const HEXES: { cx: number; cy: number; pulse?: "hex-pulse-a" | "hex-pulse-b" | "hex-pulse-c" }[] = [
  { cx: 110, cy: 110 },
  { cx: 110, cy: 58, pulse: "hex-pulse-a" },
  { cx: 162, cy: 84, pulse: "hex-pulse-b" },
  { cx: 162, cy: 136, pulse: "hex-pulse-c" },
  { cx: 110, cy: 162 },
  { cx: 58, cy: 136 },
  { cx: 58, cy: 84 },
];

export function HexHoneycomb({ connected }: Props) {
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" className="shrink-0" aria-hidden>
      {HEXES.map((h, i) => (
        <path
          key={i}
          d={hexPath(h.cx, h.cy, 26)}
          fill={connected ? "rgba(74,222,128,0.06)" : "transparent"}
          stroke="rgba(232,255,90,0.15)"
          strokeWidth="0.5"
          className={`${!connected && h.pulse ? h.pulse : ""} ${connected ? "transition-[fill] duration-[600ms] ease-out" : ""}`}
        />
      ))}
      <circle
        cx="110"
        cy="110"
        r="4"
        className="transition-[fill] duration-[600ms] ease-out"
        fill={connected ? "#4ADE80" : "rgba(232,255,90,0.6)"}
      />
    </svg>
  );
}
