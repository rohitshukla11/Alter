import type { AgentRecord } from "./types.js";
import { config } from "./config.js";

/** Placeholder for ERC20 / ledger verification. */
export async function assertPaymentOrContinue(
  _agent: AgentRecord,
  _payerHint?: string
): Promise<void> {
  if (config.paymentMode === "off") return;
  if (config.paymentMode === "mock") return;
}
