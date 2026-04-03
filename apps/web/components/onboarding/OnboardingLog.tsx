"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCommandLog, formatTime } from "@/components/command-log/CommandLogProvider";

function dotColor(level: string) {
  switch (level) {
    case "success":
      return "bg-success";
    case "error":
      return "bg-error";
    case "pending":
      return "bg-pending";
    default:
      return "bg-tertiary";
  }
}

export function OnboardingLog() {
  const { lines } = useCommandLog();

  return (
    <div className="border-t border-dim py-4 pl-0 pr-0 pt-4">
      <p className="mb-2 px-3.5 font-mono text-[9px] uppercase tracking-[0.1em] text-tertiary">Log</p>
      <div className="max-h-[120px] space-y-0 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {lines.map((line) => (
            <motion.div
              key={line.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: line.faded ? 0.45 : 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-3.5 py-0.5 font-mono text-[11px]"
            >
              <span className="shrink-0 text-[rgba(255,255,255,0.2)]">{formatTime(line.ts)}</span>
              <span className={`size-1.5 shrink-0 rounded-full ${dotColor(line.level)}`} aria-hidden />
              <span className="shrink-0 text-secondary">{line.event}</span>
              <span className="min-w-0 flex-1 truncate text-primary">{line.value}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
