"use client";

import type { ReactNode } from "react";
import { OnboardingSidebar } from "@/components/onboarding/OnboardingSidebar";
import { ProgressBar } from "@/components/onboarding/ProgressBar";

type Props = {
  step: number;
  onStep: (i: number) => void;
  children: ReactNode;
};

export function Shell({ step, onStep, children }: Props) {
  return (
    <div className="fixed inset-0 z-0 flex h-[100dvh] w-full bg-void text-primary">
      <OnboardingSidebar step={step} onStep={onStep} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
        <ProgressBar step={step} />
      </div>
    </div>
  );
}
