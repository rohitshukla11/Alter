import crypto from "node:crypto";
import path from "node:path";
import { uploadBufferTo0G, uploadJsonTo0G, downloadFrom0G, downloadBufferFrom0G } from "./storage0g.js";
import {
  getAgentById,
  updateAgent,
  addTrainingDoc,
  removeTrainingDoc,
  getTrainingDocs,
} from "./db.js";
import { tryWriteAlterTrainingRecords } from "./ens.js";
import type { TrainingDocumentRecord, TrainingDocMetadata } from "./types.js";
import type { RagSource } from "./openclaw/types.js";

const SEED_DOC_META: TrainingDocMetadata = { source: "seed", seeded: true };

export type TrainingDocument = TrainingDocumentRecord;
export type { RagSource };

export interface TrainingManifest {
  type: "alter-training-manifest/v1" | "counselr-training-manifest/v1";
  agent: string;
  agentId: string;
  docCount: number;
  totalSizeBytes: number;
  documents: Array<{
    filename: string;
    hash: string;
    sizeBytes: number;
    uploadedAt: number;
    description?: string;
  }>;
  manifestHash: string;
  createdAt: number;
}

function uniqueSafeFilename(agentId: string, original: string): string {
  let safe = path.basename(original).replace(/\.\./g, "_").trim() || "unnamed";
  const existing = new Set(getTrainingDocs(agentId).map((d) => d.filename));
  if (!existing.has(safe)) return safe;
  const ext = path.extname(safe);
  const base = path.basename(safe, ext) || "file";
  return `${base}_${crypto.randomBytes(4).toString("hex")}${ext}`;
}

export async function uploadTrainingDocument(
  agentId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
  description?: string,
  metadata?: TrainingDocMetadata
): Promise<TrainingDocument> {
  const safeName = uniqueSafeFilename(agentId, filename);
  const hash = await uploadBufferTo0G(buffer);

  const doc: TrainingDocument = {
    id: crypto.randomUUID(),
    agentId,
    filename: safeName,
    mimeType,
    sizeBytes: buffer.byteLength,
    hash,
    uploadedAt: Date.now(),
    description,
    metadata,
  };

  addTrainingDoc(doc);
  await rebuildManifest(agentId);
  return doc;
}

export async function deleteTrainingDocument(agentId: string, docId: string): Promise<void> {
  removeTrainingDoc(agentId, docId);
  await rebuildManifest(agentId);
}

export async function rebuildManifest(agentId: string): Promise<string> {
  const agent = getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");
  const docs = getTrainingDocs(agentId);
  const totalSizeBytes = docs.reduce((sum, d) => sum + d.sizeBytes, 0);

  const manifestBody: Omit<TrainingManifest, "manifestHash"> = {
    type: "alter-training-manifest/v1",
    agent: agent.ensFullName || agentId,
    agentId,
    docCount: docs.length,
    totalSizeBytes,
    documents: docs.map((d) => ({
      filename: d.filename,
      hash: d.hash,
      sizeBytes: d.sizeBytes,
      uploadedAt: d.uploadedAt,
      description: d.description,
      metadata: d.metadata,
    })),
    createdAt: Date.now(),
  };

  const manifestJson = JSON.stringify(manifestBody, null, 2);
  const manifestHash = crypto.createHash("sha256").update(manifestJson).digest("hex");
  const fullManifest: TrainingManifest = { ...manifestBody, manifestHash };

  const manifestRoot = await uploadJsonTo0G(fullManifest);

  updateAgent(agentId, {
    trainingRoot: manifestRoot,
    trainingDocCount: docs.length,
    trainingUpdatedAt: Date.now(),
  });

  if (agent.ensFullName) {
    try {
      await tryWriteAlterTrainingRecords(agent.ensFullName, {
        trainingRoot: manifestRoot,
        docCount: docs.length,
      });
    } catch (e) {
      console.warn("ENS trainingRoot update failed:", e);
    }
  }

  return manifestRoot;
}

export async function getTrainingManifest(agentId: string): Promise<TrainingManifest | null> {
  const agent = getAgentById(agentId);
  if (!agent?.trainingRoot) return null;
  try {
    const raw = await downloadFrom0G(agent.trainingRoot);
    return JSON.parse(raw) as TrainingManifest;
  } catch {
    return null;
  }
}

export async function fetchTrainingDocument(agentId: string, filename: string): Promise<Buffer | null> {
  const docs = getTrainingDocs(agentId);
  const doc = docs.find((d) => d.filename === filename);
  if (!doc) return null;
  try {
    return await downloadBufferFrom0G(doc.hash);
  } catch {
    return null;
  }
}

/** Download blob from 0G by stored root and compare size to registry (judge-facing proof). */
export async function verifyTrainingDocumentStorage(
  agentId: string,
  docId: string
): Promise<{
  doc: TrainingDocument;
  reachable: boolean;
  integrityOk: boolean;
  byteLength: number;
  expectedSizeBytes: number;
} | null> {
  const docs = getTrainingDocs(agentId);
  const doc = docs.find((d) => d.id === docId);
  if (!doc) return null;
  const content = await fetchTrainingDocument(agentId, doc.filename);
  const reachable = content !== null;
  const byteLength = content?.byteLength ?? 0;
  const integrityOk = reachable && byteLength === doc.sizeBytes;
  return { doc, reachable, integrityOk, byteLength, expectedSizeBytes: doc.sizeBytes };
}

export async function getTrainingRagForInference(
  agentId: string,
  userMessage: string,
  maxDocs = 2
): Promise<{ context: string; sources: RagSource[] }> {
  const docs = getTrainingDocs(agentId);
  if (!docs.length) return { context: "", sources: [] };

  const msgWords = userMessage.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = docs.map((doc) => {
    const nameWords = doc.filename.toLowerCase().split(/[\s._-]+/);
    const descWords = (doc.description || "").toLowerCase().split(/\s+/);
    const allWords = [...nameWords, ...descWords];
    const score = msgWords.filter((w) => allWords.some((dw) => dw.includes(w) || w.includes(dw))).length;
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let picked = scored
    .slice(0, maxDocs)
    .filter((s) => s.score > 0 || docs.length <= maxDocs)
    .map((s) => s.doc);

  if (!picked.length) {
    picked = docs.slice(0, maxDocs);
  }

  const sources: RagSource[] = [];
  const contexts: string[] = [];

  for (const doc of picked) {
    try {
      const content = await downloadBufferFrom0G(doc.hash);
      const isText =
        doc.mimeType === "text/plain" ||
        doc.mimeType === "text/markdown" ||
        doc.mimeType === "application/json";
      const text = isText
        ? content.toString("utf-8").slice(0, 2000)
        : `[Non-text training file (${doc.mimeType}): ${doc.filename} — use filename/metadata only]`;
      contexts.push(`[TRAINING DOC: ${doc.filename} | 0G:${doc.hash.slice(0, 10)}]\n${text}`);
      sources.push({ filename: doc.filename, hash: doc.hash });
    } catch {
      /* skip */
    }
  }

  return { context: contexts.join("\n\n---\n\n"), sources };
}

const SEED_TRAINING_DOCUMENTS: ReadonlyArray<{ filename: string; description: string; body: string }> = [
  {
    filename: "0g-network-architecture.txt",
    description: "0G dual-lane storage, Turbo, compute, DA, Galileo (seed)",
    body: `0G Network Architecture — Technical Summary

0G Storage uses a dual-lane model that separates commitment from bulk delivery. The data publishing lane anchors Merkle roots and transaction metadata on-chain so clients can prove inclusion and finality without downloading entire blobs. The data storage lane stores erasure-coded segments across a peer-to-peer storage network, enabling high throughput retrieval and repair while keeping on-chain costs bounded to commitments and incentives.

Turbo and Standard modes trade off between faster finality paths versus broader replication defaults; operators choose based on latency targets and cost. Proof of Random Access (PoRA) style mining aligns storage providers with honest segment availability and discourages freeloading. 0G Compute layers an inference marketplace on top: models run behind OpenAI-compatible endpoints with ledger-based settlement, while agents and dApps submit prompts and tool traces through the same stack.

0G Data Availability (DA) complements storage by guaranteeing that published data remains retrievable for rollups and verification games. Together, storage + DA + compute form a single data pipeline from upload to model output.

Galileo testnet (Chain ID 16602) exercises this stack end-to-end. It targets roughly 2500 TPS in lab configurations for settlement-adjacent workloads while using CometBFT-derived consensus for ordering and fork choice. Builders should treat Galileo as the integration surface for uploads, indexer queries, compute broker flows, and wallet-funded operations before mainnet hardening.

For hackathon demos, treat the Merkle root as the canonical file identifier, verify it on the indexer, and prefer StorageScan submission URLs for human-readable inspection of roots and receipts.`,
  },
  {
    filename: "defi-protocol-audit-checklist.txt",
    description: "Smart contract and DeFi audit checklist (seed)",
    body: `DeFi Protocol Audit Checklist

Reentrancy: identify external calls before state updates; use checks-effects-interactions; prefer pull over push payments where possible; document any intentional callback surfaces.

Integer safety: rely on Solidity 0.8+ defaults but watch casting, multiplication before division, and fee-on-transfer tokens that break balance assumptions.

Access control: map every privileged function to onlyOwner, roles, or timelocks; ensure initializer paths cannot be replayed; verify two-step ownership transfers on production deployments.

Oracles: document price sources, heartbeat staleness, TWAP vs spot usage, and liquidation paths that could be manipulated with thin liquidity or sandwichable updates.

Flash loans: trace whether any single-transaction paths combine borrow, price move, and repay; isolate atomic arbitrage from governance or collateral factors.

Upgrade proxies: confirm storage layout compatibility, admin keys, pause switches, and migration plans; require timelock + multisig for implementation changes.

Events: ensure critical state transitions emit indexed parameters for off-chain monitors and accounting reconstructions.

Gas griefing: bound unbounded loops in user-facing paths; avoid unbounded dynamic arrays in hot paths; consider caps on batch sizes.

Front-running: examine mempool-visible ordering for liquidations, auctions, and MEV-sensitive queues; document mitigations such as commit-reveal or private mempools.

Emergency controls: verify pause scope, who can trigger it, and whether paused state still allows withdrawals; run tabletop exercises for incident response.

Use this list as a conversation guide with security reviewers rather than a substitute for professional audits.`,
  },
  {
    filename: "ai-agent-system-design.txt",
    description: "Agent memory, tools, delegation, identity (seed)",
    body: `AI Agent System Design Overview

Memory splits into a short-term working context—the conversational window the model sees each turn—and durable long-term stores such as vector databases or key-value logs keyed by content hashes. Good systems version memory writes, tie them to user consent, and expose provenance so downstream tools can cite sources.

Tool-use patterns wrap deterministic APIs (RPC calls, storage uploads, ENS resolution) behind structured JSON schemas. Agents should validate tool outputs, handle retries idempotently, and surface partial failures without hallucinating success.

Delegation models encode which agent may act on behalf of which principal, including scoped permissions and expiring mandates. Trust hierarchies matter when sub-agents operate with lower assurances than a primary advisor.

Reputation accumulates from verifiable outcomes: successful task completions, user feedback with signatures, and on-chain attestations where available. Keep reputation inputs transparent to avoid silent gaming.

Agent-to-agent protocols should standardize message envelopes (who, what capability, which chain, which session) and prefer content-addressed payloads for large artifacts.

Identity verification layers like World ID reduce sybil risk for high-stakes flows while preserving privacy via nullifiers rather than raw biometrics on-chain.

Monetization often pairs per-request pricing with compute and storage rebates; ledgers track balances, provider acknowledgements, and refunds on failure.

For Alter-style demos, bind memory roots to 0G, expose StorageScan links for auditability, and keep tool traces small enough to render in the UI without overwhelming newcomers.`,
  },
];

/** Upload three baseline training texts for hackathon demos (idempotent enough for fresh agents). */
export async function seedTrainingDocsForAgent(agentId: string): Promise<void> {
  const agent = getAgentById(agentId);
  if (!agent) {
    console.warn(`[seed] skip training seed — agent not in local DB: ${agentId}`);
    return;
  }
  for (const doc of SEED_TRAINING_DOCUMENTS) {
    await uploadTrainingDocument(
      agentId,
      doc.filename,
      "text/plain",
      Buffer.from(doc.body, "utf-8"),
      doc.description,
      SEED_DOC_META
    );
  }
}
