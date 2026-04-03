"use client";

import { useEffect, useRef } from "react";

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };

const COLORS = ["#00E5FF", "#7C3AED", "#22d3ee", "#a78bfa", "#ffffff"];

export function ConfettiBurst({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = (canvas.width = 320);
    const h = (canvas.height = 240);
    const cx = w / 2;
    const cy = h / 2;
    const particles: Particle[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (Math.PI * 2 * i) / 48 + Math.random() * 0.5;
      const sp = 3 + Math.random() * 6;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        life: 1,
        color: COLORS[i % COLORS.length]!,
        size: 2 + Math.random() * 3,
      });
    }

    let frame = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.life -= 0.012;
        if (p.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      if (frame < 90) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    />
  );
}
