"use client";

import { useEffect, useRef } from "react";

const N = 40;
const CONNECT = 100;
const SPEED = 0.3;

export function ParticleNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = ctx;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    function resize() {
      const c = ref.current;
      if (!c) return;
      const p = c.parentElement;
      if (!p) return;
      w = Math.max(4, p.clientWidth);
      h = Math.max(4, p.clientHeight);
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      draw.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) {
        for (let i = 0; i < N; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * SPEED * 2,
            vy: (Math.random() - 0.5) * SPEED * 2,
            r: 0.5 + Math.random(),
          });
        }
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);

    let raf = 0;
    function frame() {
      draw.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = particles[i]!;
          const b = particles[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < CONNECT) {
            draw.strokeStyle = `rgba(232,255,90,${0.08 * (1 - d / CONNECT)})`;
            draw.lineWidth = 0.5;
            draw.beginPath();
            draw.moveTo(a.x, a.y);
            draw.lineTo(b.x, b.y);
            draw.stroke();
          }
        }
      }
      for (const p of particles) {
        draw.fillStyle = "rgba(232,255,90,0.5)";
        draw.beginPath();
        draw.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        draw.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden
    />
  );
}
