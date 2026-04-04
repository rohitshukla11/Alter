import { createHash } from "node:crypto";
import { uploadJsonTo0G } from "./storage0g.js";

export type TurnAttestation = {
  promptHash: string;
  responseHash: string;
  configRoot: string;
  combinedHash: string;
  ts: string;
};

export function hashUtf8(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export function buildProofHash(prompt: string, response: string, configRoot: string): TurnAttestation {
  const promptHash = `0x${hashUtf8(prompt)}`;
  const responseHash = `0x${hashUtf8(response)}`;
  const combinedHash = `0x${hashUtf8(`${promptHash}|${responseHash}|${configRoot}`)}`;
  return {
    promptHash,
    responseHash,
    configRoot,
    combinedHash,
    ts: new Date().toISOString(),
  };
}

export async function persistAttestation(att: TurnAttestation): Promise<string> {
  return uploadJsonTo0G({ type: "alter-attestation/v1", ...att });
}
