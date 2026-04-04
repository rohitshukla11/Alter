import { downloadFrom0G, uploadJsonTo0G } from "./storage0g.js";
import type { AgentIndexEntry } from "./types.js";

export const AGENT_INDEX_SCHEMA = "alter-agent-index/v1" as const;
export const AGENT_INDEX_SCHEMA_LEGACY_COUNSELR = "counselr-agent-index/v1" as const;
export const AGENT_INDEX_SCHEMA_LEGACY = "twinnet-agent-index/v1" as const;

export type AgentIndexManifest = {
  schema:
    | typeof AGENT_INDEX_SCHEMA
    | typeof AGENT_INDEX_SCHEMA_LEGACY_COUNSELR
    | typeof AGENT_INDEX_SCHEMA_LEGACY;
  entries: AgentIndexEntry[];
  updatedAt: string;
};

function isAgentIndexSchema(s: unknown): s is AgentIndexManifest["schema"] {
  return (
    s === AGENT_INDEX_SCHEMA ||
    s === AGENT_INDEX_SCHEMA_LEGACY_COUNSELR ||
    s === AGENT_INDEX_SCHEMA_LEGACY
  );
}

export async function loadManifest(root: string): Promise<AgentIndexManifest | null> {
  if (!root?.trim()) return null;
  try {
    const raw = await downloadFrom0G(root);
    const j = JSON.parse(raw) as AgentIndexManifest;
    if (!isAgentIndexSchema(j.schema) || !Array.isArray(j.entries)) return null;
    return j;
  } catch {
    return null;
  }
}

export async function appendManifestEntry(prevRoot: string | undefined, entry: AgentIndexEntry): Promise<string> {
  const prev = prevRoot ? await loadManifest(prevRoot) : null;
  const entries = [...(prev?.entries ?? [])];
  const idx = entries.findIndex(
    (e) => e.ensFullName.toLowerCase() === entry.ensFullName.toLowerCase() || e.id === entry.id
  );
  const nextEntry: AgentIndexEntry = { ...entry, source: "manifest" };
  if (idx >= 0) entries[idx] = nextEntry;
  else entries.push(nextEntry);
  const manifest: AgentIndexManifest = {
    schema: AGENT_INDEX_SCHEMA,
    entries,
    updatedAt: new Date().toISOString(),
  };
  return uploadJsonTo0G(manifest);
}
