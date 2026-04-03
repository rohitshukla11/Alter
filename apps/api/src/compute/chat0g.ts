import { infer0GChat } from "../compute0g.js";

export type ChatMsg = { role: string; content: string };

/**
 * OpenClaw / production path: all reasoning steps use 0G Compute only (no mock/OpenAI fallback).
 */
export async function chatVia0GOnly(messages: ChatMsg[]): Promise<string> {
  return infer0GChat(messages);
}
