"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  step: number;
  children: [ReactNode, ReactNode, ReactNode];
};

export function StepSlider({ step, children }: Props) {
  const clamped = Math.max(0, Math.min(2, step));
  return (
    <div className="relative h-full w-full overflow-hidden">
      <motion.div
        className="flex h-full"
        style={{ width: "300%" }}
        animate={{ x: `-${clamped * 33.333333}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 35, mass: 0.8 }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="flex h-full min-w-[33.333333%] shrink-0 items-stretch justify-center overflow-y-auto"
          >
            <div className="flex min-h-full w-full max-w-[1200px] flex-1 flex-col px-10 py-12 md:px-16">{child}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
