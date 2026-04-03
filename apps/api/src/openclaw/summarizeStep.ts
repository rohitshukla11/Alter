import type { ExecutionStep } from "./types.js";

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

/** One-line human-readable label for demo / API visualization. */
export function summarizeStep(step: ExecutionStep): string {
  switch (step.kind) {
    case "reasoning":
      return `0G reasoning (step ${step.step}, ${step.durationMs ?? "?"}ms)`;
    case "tool_call":
      return `Tool call: ${step.tool ?? "?"}${step.detail ? ` — ${clip(step.detail, 72)}` : ""}`;
    case "tool_result":
      return `Tool result: ${step.tool ?? "?"}${step.detail ? ` — ${clip(step.detail, 96)}` : ""}`;
    case "final":
      return `Final reply${step.detail ? `: ${clip(step.detail, 100)}` : ""}`;
    default:
      return String(step.kind);
  }
}
