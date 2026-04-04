import type { AgentRecord } from "./types.js";
import { downloadFrom0G, uploadJsonTo0G } from "./storage0g.js";
import { generateResponseWithFallback } from "./compute/providers.js";
import { isOpenClawEnabled } from "./openclaw/config.js";
import type { OpenClawConfig } from "./openclaw/types.js";
import type { RagSource, RunAgentResult } from "./openclaw/types.js";
import { getTrainingRagForInference } from "./trainingData.js";
import {
  buildWeb3ArchitectSystemPrompt,
  isWeb3ArchitectProfession,
} from "./web3Architect.js";
import { cleanResponse } from "./openclaw/responseFormatter.js";

/** Runtime text includes full phrases; source splits avoid accidental copy-paste of banned outputs into prompts. */
export const ADVISOR_CRITICAL_RULES_FOOTER = `CRITICAL RULES — never break these:
- Never start your response with "${"As a professional" + " advisor:"}"
- Never end your response with a disclaimer
- Never tell the user to "${"consult a qualified " + "professional"}"
- Never say "${"General " + "guidance only"}"
- Never say "${"not formal " + "professional advice"}"
- Never use the phrase "${"your " + "jurisdiction"}" in a disclaimer
- You ARE the ${"qualified " + "professional"}. Answer as the expert.`;

export type AdvisorPromptInput = {
  name: string;
  profession: string;
  specialization: string;
  experience: string;
  advisorTone: string;
  pitch?: string;
};

function frameworksForProfession(profession: string): string {
  const p = profession.trim().toLowerCase();
  const blocks: string[] = [];
  if (p.includes("law") || p === "legal" || p.includes("web3") || p.includes("architect") || p.includes("crypto")) {
    blocks.push(`
- Howey Test (US securities law)
- MiCA Articles 3-4 (EU crypto regulation)
- Reg D 506(b) and 506(c), Reg S, Reg A+ (US exemptions)
- SAFT, Token Warrant, SAFE (fundraising instruments)
- GDPR Article 6, CCPA (data privacy)`);
  }
  if (p.includes("trader") || p.includes("finance") || p.includes("financial")) {
    blocks.push(`
- Basel III / Basel IV (banking capital)
- IFRS 9 / ASC 815 (derivatives accounting)
- Dodd-Frank Section 619 (Volcker Rule)
- MiFID II (EU financial instruments)`);
  }
  if (p.includes("medical") || p.includes("doctor") || p.includes("health")) {
    blocks.push(`
- FDA 21 CFR (US drug/device regulation)
- HIPAA Safe Harbor (de-identification)
- CE marking (EU medical devices)
- ICH E6 GCP (clinical trials)`);
  }
  return blocks.join("\n");
}

/** Full system prompt body for new non–Web3-Architect agents (minted to 0G). Includes critical footer. */
export function buildAdvisorPrompt(advisor: AdvisorPromptInput): string {
  const toneGuide: Record<string, string> = {
    formal: "You are precise, authoritative, and concise. No contractions. Direct declarative sentences.",
    friendly:
      'You are warm and approachable but always expert. Use "you" and "your" naturally. Conversational but substantive.',
    analytical:
      "You lead with data, frameworks, and named precedents. You structure answers with numbers. You cite specific rules.",
  };

  const tone = toneGuide[advisor.advisorTone] ?? toneGuide.formal;
  const fw = frameworksForProfession(advisor.profession);

  return `You are ${advisor.name}, a specialist in ${advisor.specialization} with ${advisor.experience} of experience.

IDENTITY:
You are a paid professional advisor on Alter. Users pay for your expertise. You are the expert — never defer to other professionals.
${advisor.pitch ? `Your expertise focus: ${advisor.pitch}` : ""}

TONE: ${tone}

BANNED PHRASES — never use these under any circumstances:
- ${'"' + "As a professional" + ' advisor:"'}
- ${'"' + "General " + 'guidance only"'}
- ${'"' + "not formal " + 'professional advice"'}
- ${'"' + "consult a qualified " + 'professional"'}
- "consult a lawyer / financial advisor / doctor"
- ${'"' + "in your " + 'jurisdiction"'} (in a disclaimer context)
- "I recommend seeking professional advice"
- "Summary:" or "Overview:" or "Key points:" as headers

RESPONSE STRUCTURE — always follow this order:
1. Lead with the most important thing they need to know RIGHT NOW
2. Give 2-4 specific, actionable points with named frameworks
3. End with ONE targeted follow-up question if jurisdiction or details are needed

RESPONSE RULES:

ALWAYS lead with substance — never lead with a question.
Give real guidance first, then ask for specifics.

WRONG: "To determine X, please provide Y."
RIGHT: "Launching a token involves three key legal risks you need to address first: [actual content]...
To give you jurisdiction-specific advice, which country are you launching from?"

When a user asks a broad question like "guide me on launching a token" — give the top 3 most important things they need to know RIGHT NOW. Do not stall.

Cite real frameworks by name in your answer:
- Howey Test (US securities classification)
- MiCA Article 4 (EU token classification)
- Reg D 506(b) or Reg S (US exemptions)
- SAFT vs SAFE vs Token Warrant (fundraising structure)

Format rules:
- Plain numbered lists for multiple points: 1. 2. 3.
- NO markdown headers (no ##, no **Header**, no ---)
- Bold only for key terms: **Howey Test**, **Reg D**
- Maximum 4 paragraphs or 6 numbered points
- End with ONE targeted follow-up question, not three

EXAMPLE of correct response to "guide me on token launch":

"Launching a token requires navigating three immediate legal questions before anything else.

1. Securities classification: Under the Howey Test, your token is likely a security if investors expect profit from your team's efforts. This triggers SEC registration requirements or the need for an exemption like Reg D 506(b) for accredited investors only.

2. EU exposure: If any of your investors or users are in the EU, MiCA applies from June 2024. Utility tokens need a whitepaper filed with your national regulator. Stablecoins need authorization as EMTs or ARTs.

3. Fundraising structure: A SAFT (Simple Agreement for Future Tokens) is the standard instrument for pre-launch raises from accredited investors. It is itself a security, so you need Reg D. A Token Warrant is more flexible post-2023.

Which country are you incorporating in? That changes which regulatory path you need to follow."

CITE REAL FRAMEWORKS by name when relevant:
${fw || "- Use domain-appropriate named frameworks and cite them explicitly."}

FORMAT RULES:
- Plain numbered lists: 1. 2. 3. (not bullet points)
- Bold key terms only: **Howey Test**, **Reg D**
- No markdown headers (no ##, no ---)
- No horizontal rules
- Maximum 4 paragraphs or 6 numbered points
- Plain text only — no italic disclaimers

MEMORY CONTEXT:
If [PREVIOUS CONSULTATIONS] is in your context, reference specific details from prior conversations naturally. Example: "As you mentioned before, you're incorporated in Delaware..."

Never use section headers like 'Summary:' or 'Overview:' or 'Key Points:' before your response. Start directly with the content.

Profession: ${advisor.profession}
Specialization: ${advisor.specialization}

${ADVISOR_CRITICAL_RULES_FOOTER}`;
}

export type AgentConfigEnvelope = {
  agentId?: string;
  ensFullName: string;
  tokenId?: number;
  owner?: string;
  version?: number;
};

export type AgentConfig = {
  name: string;
  expertise: string;
  personality: string;
  profession?: string;
  specialization?: string;
  experience?: string;
  advisorTone?: string;
  systemPrompt?: string;
  pricing?: AgentRecord["pricing"];
  personalitySliders?: AgentRecord["personalitySliders"];
  configVersion?: number;
  version?: number;
  openClaw?: OpenClawConfig;
  /** Primary + legacy 0G config envelopes (readers prefer `_alter`, then `_counselr`, then `_twinnet`). */
  _alter?: AgentConfigEnvelope;
  _counselr?: AgentConfigEnvelope;
  _twinnet?: AgentConfigEnvelope;
};

function personalityToString(p: unknown, fallback: string): string {
  if (typeof p === "string") return p;
  if (p && typeof p === "object") {
    const o = p as Record<string, unknown>;
    if (typeof o.summary === "string") return o.summary;
    return JSON.stringify(p);
  }
  return fallback;
}

export async function loadAgentConfig(agent: AgentRecord): Promise<AgentConfig> {
  const raw = await downloadFrom0G(agent.configRoot);
  const cfg = JSON.parse(raw) as AgentConfig;
  const personality = personalityToString(cfg.personality, agent.personality || "");
  return { ...cfg, personality };
}

/** When profession is Web3 Architect, ensure 0G config carries the full specialist prompt (e.g. after reflection rewrote config). */
export function ensureWeb3ArchitectSystemPrompt(agent: AgentRecord, cfg: AgentConfig): void {
  if (!isWeb3ArchitectProfession(agent.profession)) return;
  const marker = "You are a Web3 Architect";
  if (cfg.systemPrompt?.includes(marker)) return;
  cfg.systemPrompt = buildWeb3ArchitectSystemPrompt({
    name: agent.name,
    specialization: agent.specialization ?? "",
    experience: agent.experience ?? "",
    pitch: agent.expertise,
  });
}

/** Naive RAG: memory roots + optional long-term summaries. */
export async function buildRagContext(agent: AgentRecord, maxChars = 6000): Promise<string> {
  const roots = [
    ...(agent.longTermRoots ?? []),
    ...agent.memoryRoots,
    ...agent.conversationRoots,
  ]
    .slice(-16)
    .reverse();
  const chunks: string[] = [];
  let n = 0;
  for (const r of roots) {
    if (n >= maxChars) break;
    try {
      const t = await downloadFrom0G(r);
      chunks.push(t.slice(0, 2000));
      n += t.length;
    } catch {
      /* skip */
    }
  }
  return chunks.join("\n---\n").slice(0, maxChars);
}

export async function runAgentTurnDetailed(
  target: AgentRecord,
  userMessage: string,
  caller?: AgentRecord | null
): Promise<{ reply: string; provider: string; ragSources?: RagSource[] }> {
  const cfg = await loadAgentConfig(target);
  ensureWeb3ArchitectSystemPrompt(target, cfg);
  const training = await getTrainingRagForInference(target.id, userMessage);
  const rag = await buildRagContext(target);
  const callerBlock = caller
    ? `You are replying to another agent: ${caller.name} (${caller.expertise}).`
    : "You are replying to a human operator.";
  const trainingBlock = training.context
    ? `[TRAINING KNOWLEDGE — cite these sources in your response when relevant]\n${training.context}\n`
    : "";
  const ragBlock = `Relevant memory and prior exchanges (retrieved from decentralized storage):
${rag || "(none yet)"}

Stay in character. Be concise and actionable.`;
  const stored = cfg.systemPrompt?.trim();
  const fallbackPrompt = buildAdvisorPrompt({
    name: cfg.name,
    profession: target.profession?.trim() || cfg.profession?.trim() || "Advisor",
    specialization: target.specialization?.trim() || cfg.specialization?.trim() || "",
    experience: target.experience?.trim() || cfg.experience?.trim() || "",
    advisorTone: target.advisorTone ?? cfg.advisorTone ?? "formal",
    pitch: cfg.expertise || target.expertise,
  });
  const base =
    stored && stored.includes("CRITICAL RULES — never break these")
      ? stored
      : stored
        ? `${stored}\n\n${ADVISOR_CRITICAL_RULES_FOOTER}`
        : fallbackPrompt;
  const system = `${base}

${callerBlock}

${trainingBlock}
${ragBlock}`;
  const messages = [
    { role: "system", content: system },
    { role: "user", content: userMessage },
  ];
  const { text, provider } = await generateResponseWithFallback(messages);
  if (training.sources.length) {
    console.log(`[RAG] Injected ${training.sources.length} training docs for agent ${target.id}`);
  }
  return {
    reply: cleanResponse(text),
    provider,
    ragSources: training.sources.length ? training.sources : undefined,
  };
}

export async function runAgentTurn(
  target: AgentRecord,
  userMessage: string,
  caller?: AgentRecord | null
): Promise<string> {
  const { reply } = await runAgentTurnDetailed(target, userMessage, caller);
  return reply;
}

export async function persistMemorySnippet(agent: AgentRecord, snippet: object) {
  const root = await uploadJsonTo0G(snippet);
  return root;
}

export type UnifiedTurnResult =
  | ({ mode: "openclaw" } & RunAgentResult)
  | { mode: "legacy"; reply: string; provider: string; ragSources?: RagSource[] };

/** OpenClaw when enabled in config; otherwise legacy single-shot completion (still may use 0G per compute chain). */
export async function runUnifiedAgentTurn(
  target: AgentRecord,
  userMessage: string,
  caller: AgentRecord | null,
  opts?: { delegatePeer?: AgentRecord }
): Promise<UnifiedTurnResult> {
  const cfg = await loadAgentConfig(target);
  if (isOpenClawEnabled(cfg)) {
    const { runOpenClawTurn } = await import("./openclaw/agent.js");
    const r = await runOpenClawTurn(target, userMessage, caller, opts);
    return { mode: "openclaw", ...r };
  }
  const r = await runAgentTurnDetailed(target, userMessage, caller);
  return { mode: "legacy", reply: r.reply, provider: r.provider, ragSources: r.ragSources };
}
