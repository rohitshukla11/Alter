/**
 * Wipes local agent registry (`DATA_DIR/registry.json` agents + ensToAgentId).
 * Does not remove nullifier → wallet session links.
 */
import { clearAllAgents } from "../src/db.js";

clearAllAgents();
console.log("Counselr: cleared all agents from registry (wallets / sessions unchanged).");
