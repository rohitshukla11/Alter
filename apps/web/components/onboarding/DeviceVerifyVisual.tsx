"use client";

import { motion } from "framer-motion";

type Props = {
  verified: boolean;
  pending: boolean;
};

/** Visual for World ID Device flow — phone frame, not Orb. */
export function DeviceVerifyVisual({ verified, pending }: Props) {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0" aria-hidden>
      <rect
        x="52"
        y="28"
        width="76"
        height="124"
        rx="6"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
      />
      <rect x="60" y="44" width="60" height="92" rx="4" fill="rgba(232,255,90,0.04)" stroke="rgba(232,255,90,0.12)" strokeWidth="0.5" />
      {!verified || pending ? (
        <line
          x1="64"
          y1="90"
          x2="116"
          y2="90"
          stroke="#E8FF5A"
          strokeWidth="0.5"
          opacity={pending ? 1 : 0.35}
          className={pending ? "iris-scanline" : ""}
        />
      ) : null}
      <rect x="82" y="144" width="16" height="3" rx="1" fill="rgba(255,255,255,0.15)" />
      {verified && !pending ? (
        <>
          <motion.circle
            cx="90"
            cy="90"
            r="14"
            fill="rgba(74,222,128,0.12)"
            stroke="rgba(74,222,128,0.45)"
            strokeWidth="1"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
          <motion.path
            d="M 82 90 L 88 96 L 100 82"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
          />
        </>
      ) : null}
    </svg>
  );
}
