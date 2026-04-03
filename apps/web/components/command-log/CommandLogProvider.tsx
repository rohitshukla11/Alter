"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type CommandLogLevel = "success" | "error" | "pending" | "info";

export type CommandLogLine = {
  id: string;
  ts: number;
  level: CommandLogLevel;
  event: string;
  value: string;
  faded: boolean;
};

type Ctx = {
  lines: CommandLogLine[];
  push: (entry: { level: CommandLogLevel; event: string; value: string }) => void;
};

const CommandLogContext = createContext<Ctx | null>(null);

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

export function CommandLogProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CommandLogLine[]>([]);
  const idRef = useRef(0);

  const push = useCallback((entry: { level: CommandLogLevel; event: string; value: string }) => {
    const id = `log-${++idRef.current}`;
    const ts = Date.now();
    const line: CommandLogLine = { ...entry, id, ts, faded: false };
    setLines((prev) => [...prev, line].slice(-5));
    window.setTimeout(() => {
      setLines((prev) => prev.map((l) => (l.id === id ? { ...l, faded: true } : l)));
    }, 30_000);
  }, []);

  const value = useMemo(() => ({ lines, push }), [lines, push]);

  return <CommandLogContext.Provider value={value}>{children}</CommandLogContext.Provider>;
}

export function useCommandLog() {
  const ctx = useContext(CommandLogContext);
  if (!ctx) throw new Error("useCommandLog requires CommandLogProvider");
  return ctx;
}
