"use client";

import type { ReactNode } from "react";
import { ProgressBar } from "@/components/onboarding/ProgressBar";

type Props = {
  step: number;
  children: ReactNode;
};

export function Shell({ step, children }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {children}
      <ProgressBar step={step} />
    </div>
  );
}
