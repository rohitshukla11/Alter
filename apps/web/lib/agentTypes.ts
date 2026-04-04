/** Discovery row from GET /agents */
export type MarketplaceAgent = {
  id: string;
  ensFullName: string;
  name: string;
  owner: string;
  tokenId: number;
  reputation: { interactions: number; successes: number };
  type: string;
  source?: string;
  verifiedHumanTwin?: boolean;
  openClawAgent?: boolean;
  configRoot: string;
  memoryHead: string | null;
  personality: string;
  expertise: string;
  profession?: string;
  specialization?: string;
  experience?: string;
  advisorTone?: string;
  personalitySliders: PersonalitySliders | null;
  pricing?: AgentPricing | null;
  trainingDocCount?: number;
};

export type AgentPricing = {
  pricePerRequest: string;
  ownerWallet: string;
  currency?: string;
};

export type PersonalitySliders = {
  humor: number;
  tone: number;
  intelligence: number;
};

/** Product-facing advisor shape (maps from agent + ENS). */
export type Advisor = {
  ensName: string;
  profession: string;
  specialization: string;
  experience: string;
  personality: string;
  pricing?: string;
};

/** GET /agents/:id or by-ens public agent */
export type PublicAgent = {
  id: string;
  ensFullName: string;
  name: string;
  expertise: string;
  personality: string;
  profession?: string | null;
  specialization?: string | null;
  experience?: string | null;
  advisorTone?: string | null;
  owner: string;
  tokenId: number;
  configRoot: string;
  reputation: { interactions: number; successes: number };
  personalitySliders?: PersonalitySliders | null;
  verifiedHumanTwin?: boolean;
  openClawAgent?: boolean;
  memoryHead?: string | null;
  pricing?: AgentPricing | null;
  createdAt?: string;
  trainingRoot?: string | null;
  trainingDocCount?: number;
  trainingUpdatedAt?: number | null;
};

export type RagSourcePayload = { filename: string; hash: string };

/** Row from training corpus API */
export type TrainingDocument = {
  id: string;
  agentId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  uploadedAt: number;
  description?: string;
};

export type ExecutionLogPayload = {
  mode?: string;
  ragSources?: RagSourcePayload[];
  steps?: ExecutionStepPayload[];
  toolsUsed?: unknown[];
} | null;

export type ExecutionStepPayload = {
  kind?: string;
  step?: number;
  detail?: string;
  tool?: string;
  shortSummary?: string;
};

export type AgentRequestResponse = {
  reply: string;
  memoryRoot?: string;
  memoryRootBefore?: string | null;
  memoryRootAfter?: string;
  reflectionTriggered?: boolean;
  agentId: string;
  openClaw?: boolean;
  executionLog?: ExecutionLogPayload;
  ragSources?: RagSourcePayload[];
};

export type DelegateResponse = {
  reply: string;
  memoryRoot?: string;
  conversation: { from: "A" | "B"; message: string }[];
  executionLog?: ExecutionLogPayload;
  agentA: { id: string; ensFullName: string };
  agentB: { id: string; ensFullName: string };
};
