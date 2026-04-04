import type { AgentIndexEntry, AgentRecord } from "./types.js";

/**
 * Alter mints OpenClaw agents; older `registry.json` rows may omit `agentType`.
 * Explicit non-openclaw types should set `agentType` to something other than openclaw / empty.
 */
export function agentRecordIsOpenClaw(a: AgentRecord | undefined): boolean {
  if (!a) return false;
  const t = a.agentType;
  if (t === "openclaw") return true;
  if (t == null || t === "") return true;
  return false;
}

/** Row in GET /agents: local registry + discovery index source. */
export function listRowIsOpenClaw(local: AgentRecord | undefined, entrySource: AgentIndexEntry["source"]): boolean {
  if (local) return agentRecordIsOpenClaw(local);
  return entrySource === "chain" || entrySource === "manifest";
}
