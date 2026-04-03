"use client";

import type { ReactNode } from "react";
import { getAddress, isAddress, keccak256, toBytes } from "viem";

function colorFromByte(b: number, offset: number) {
  const h = ((b * 7 + offset * 40) % 360) / 360;
  const s = 0.55 + (b % 30) / 100;
  const l = 0.45 + (b % 25) / 100;
  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

/** Deterministic blockie-style grid from checksummed address. */
export function AddressAvatar({ address }: { address: string }) {
  const valid = address && isAddress(address);
  if (!valid) {
    return (
      <div className="h-10 w-10 shrink-0 rounded-lg border border-white/[0.08] bg-[#111118]" />
    );
  }
  const addr = getAddress(address);
  const hash = keccak256(toBytes(addr));
  const cells = 5;
  const size = 40;
  const cell = size / cells;
  const items: ReactNode[] = [];
  const half = Math.ceil(cells / 2);
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < half; x++) {
      const idx = y * half + x;
      const byte = parseInt(hash.slice(2 + (idx % 31) * 2, 4 + (idx % 31) * 2), 16) || 0;
      const on = byte % 3 !== 0;
      if (!on) continue;
      const fill = colorFromByte(byte, idx);
      const x1 = x * cell;
      const x2 = (cells - 1 - x) * cell;
      items.push(
        <rect key={`l-${x}-${y}`} x={x1} y={y * cell} width={cell - 0.5} height={cell - 0.5} rx={0.5} fill={fill} />
      );
      if (x !== cells - 1 - x) {
        items.push(
          <rect key={`r-${x}-${y}`} x={x2} y={y * cell} width={cell - 0.5} height={cell - 0.5} rx={0.5} fill={fill} />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 overflow-hidden rounded-lg border border-white/[0.08] ring-1 ring-[#00E5FF]/15"
      aria-hidden
    >
      <rect width={size} height={size} fill="#0A0A0F" />
      {items}
    </svg>
  );
}
