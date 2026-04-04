"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { AGENT_INTERACT_PATH } from "@/lib/agentInteractRoute";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onboardPad = pathname === "/" ? "pb-14" : "";
  const isAgentInteract = AGENT_INTERACT_PATH.test(pathname);
  const isHome = pathname === "/";
  /** Full-height layouts manage their own internal scroll (onboarding slides, consultation console). */
  const lockMainScroll = isHome || isAgentInteract;

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[var(--bg-0)] text-[var(--text-0)]">
      <AppSidebar />
      <main
        className={`relative flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-[var(--border-0)] px-14 pb-10 pt-10 ${onboardPad}`}
      >
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mx-auto flex h-full min-h-0 w-full max-w-[1200px] flex-1 flex-col"
        >
          <div
            className={
              lockMainScroll
                ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                : "scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            }
          >
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
