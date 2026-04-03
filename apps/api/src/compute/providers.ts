import { config } from "../config.js";
import { infer0GChat } from "../compute0g.js";

export type ChatMessage = { role: string; content: string };

export interface InferenceProvider {
  readonly name: string;
  chat(messages: ChatMessage[]): Promise<string>;
}

export class ZeroGInferenceProvider implements InferenceProvider {
  readonly name = "0g";
  async chat(messages: ChatMessage[]): Promise<string> {
    return infer0GChat(messages);
  }
}

export class MockInferenceProvider implements InferenceProvider {
  readonly name = "mock";
  async chat(messages: ChatMessage[]): Promise<string> {
    const last = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    return `${config.computeMockResponse}${last.slice(0, 200)}`;
  }
}

export class OpenAiCompatibleProvider implements InferenceProvider {
  readonly name = "openai";
  async chat(messages: ChatMessage[]): Promise<string> {
    const key = config.openaiApiKey?.trim();
    if (!key) throw new Error("OPENAI_API_KEY not set");
    const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI: empty completion");
    return content;
  }
}

export function buildProviderChain(): InferenceProvider[] {
  if (config.strict0gMode) {
    return [new ZeroGInferenceProvider()];
  }
  const map: Record<string, () => InferenceProvider> = {
    "0g": () => new ZeroGInferenceProvider(),
    zero: () => new ZeroGInferenceProvider(),
    mock: () => new MockInferenceProvider(),
    openai: () => new OpenAiCompatibleProvider(),
  };
  const out: InferenceProvider[] = [];
  for (const raw of config.computeProviders) {
    const f = map[raw.toLowerCase()];
    if (f) out.push(f());
  }
  if (!out.length) out.push(new ZeroGInferenceProvider());
  return out;
}

export async function generateResponseWithFallback(messages: ChatMessage[]): Promise<{ text: string; provider: string }> {
  if (config.strict0gMode) {
    const z = new ZeroGInferenceProvider();
    const text = await z.chat(messages);
    return { text, provider: z.name };
  }
  const chain = buildProviderChain();
  let lastErr: unknown;
  for (const p of chain) {
    try {
      const text = await p.chat(messages);
      return { text, provider: p.name };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
