import { seedTrainingDocsForAgent } from "../src/trainingData.js";

const agentId = process.env.AGENT_ID?.trim();
if (!agentId) {
  console.error("Set AGENT_ID to the agent id (e.g. ens:name.eth). Example: AGENT_ID=ens:foo.eth npm run seed:training -w @alter/api");
  process.exit(1);
}

seedTrainingDocsForAgent(agentId)
  .then(() => {
    console.log(`[seed:training] Done for ${agentId}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("[seed:training]", e);
    process.exit(1);
  });
