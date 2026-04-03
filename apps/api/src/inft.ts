import { Contract, Wallet, JsonRpcProvider, ethers, type EventLog } from "ethers";
import { assertINFT, config } from "./config.js";

function assertINFTRead(): void {
  const a = config.inftAddress?.trim() ?? "";
  if (!a || a === "0x...") throw new Error("INFT_CONTRACT_ADDRESS required");
  if (!/^0x[a-fA-F0-9]{40}$/i.test(a)) {
    throw new Error("INFT_CONTRACT_ADDRESS must be a 40-hex-character address (0x-prefixed)");
  }
}

const ABI = [
  "function mintAgent(address to, string tokenURI_, bytes32 configRoot, string ensName_, string dataDescription) returns (uint256)",
  "function updateAgentConfig(uint256 tokenId, bytes32 newConfigRoot, string newTokenURI)",
  "function appendIntelligentData(uint256 tokenId, bytes32 dataHash, string dataDescription)",
  "function intelligentDataOf(uint256 tokenId) view returns (tuple(string dataDescription, bytes32 dataHash)[])",
  "function agentState(uint256 tokenId) view returns (tuple(bytes32 configRoot, uint64 createdAt, uint32 version, string ensName))",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "event AgentCreated(uint256 indexed tokenId, address indexed owner, bytes32 indexed configRoot, string ensName)",
  "event AgentUpdated(uint256 indexed tokenId, bytes32 indexed newConfigRoot, uint32 newVersion)",
] as const;

function readContract() {
  return new Contract(config.inftAddress, ABI, new JsonRpcProvider(config.zgRpc));
}

function contract(signer: Wallet) {
  return new Contract(config.inftAddress, ABI, signer);
}

function rootToBytes32(configRootHex: string): string {
  const h = configRootHex.startsWith("0x") ? configRootHex : `0x${configRootHex}`;
  return ethers.zeroPadValue(h, 32);
}

export type OnChainAgentState = {
  configRoot: string;
  createdAt: number;
  version: number;
  ensName: string;
};

export async function readAgentStateOnChain(tokenId: number): Promise<OnChainAgentState | null> {
  assertINFTRead();
  const c = readContract();
  try {
    const t = await c.agentState(tokenId);
    const root = t.configRoot as string;
    return {
      configRoot: ethers.hexlify(root),
      createdAt: Number(t.createdAt),
      version: Number(t.version),
      ensName: String(t.ensName ?? ""),
    };
  } catch {
    return null;
  }
}

export async function readTokenURIOnChain(tokenId: number): Promise<string | null> {
  assertINFTRead();
  const c = readContract();
  try {
    return String(await c.tokenURI(tokenId));
  } catch {
    return null;
  }
}

export async function readOwnerOnChain(tokenId: number): Promise<string | null> {
  assertINFTRead();
  const c = readContract();
  try {
    return String(await c.ownerOf(tokenId)).toLowerCase();
  } catch {
    return null;
  }
}

export async function readIntelligentDataRoots(tokenId: number): Promise<{ description: string; hash: string }[]> {
  try {
    assertINFTRead();
  } catch {
    return [];
  }
  const c = readContract();
  try {
    const rows = await c.intelligentDataOf(tokenId);
    return (rows as { dataDescription: string; dataHash: string }[]).map((r) => ({
      description: r.dataDescription,
      hash: ethers.hexlify(r.dataHash),
    }));
  } catch {
    return [];
  }
}

export async function mintAgentINFT(
  owner: string,
  tokenUri: string,
  configRootHex: string,
  ensName: string,
  dataDescription: string
): Promise<number> {
  assertINFT();
  const provider = new JsonRpcProvider(config.zgRpc);
  const signer = new Wallet(config.inftOwnerPrivateKey, provider);
  const c = contract(signer);
  const root = rootToBytes32(configRootHex);
  const tx = await c.mintAgent(owner, tokenUri, root, ensName, dataDescription);
  const receipt = await tx.wait();
  const transferIface = new ethers.Interface([
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  ]);
  let tokenId: bigint | undefined;
  const ca = config.inftAddress.toLowerCase();
  for (const log of receipt?.logs ?? []) {
    if (log.address.toLowerCase() !== ca) continue;
    try {
      const ev = transferIface.parseLog(log);
      if (ev?.name === "Transfer" && ev.args.from === ethers.ZeroAddress) {
        tokenId = ev.args.tokenId as bigint;
        break;
      }
    } catch {
      /* skip */
    }
  }
  if (tokenId === undefined) throw new Error("Could not parse tokenId from mint receipt");
  return Number(tokenId);
}

export async function updateAgentConfigOnChain(
  tokenId: number,
  newConfigRootHex: string,
  newTokenURI: string
): Promise<void> {
  assertINFT();
  const provider = new JsonRpcProvider(config.zgRpc);
  const signer = new Wallet(config.inftOwnerPrivateKey, provider);
  const c = contract(signer);
  const root = rootToBytes32(newConfigRootHex);
  const tx = await c.updateAgentConfig(tokenId, root, newTokenURI ?? "");
  await tx.wait();
}

export async function appendIntelligentDataOnChain(tokenId: number, rootHex: string, description: string) {
  assertINFT();
  const provider = new JsonRpcProvider(config.zgRpc);
  const signer = new Wallet(config.inftOwnerPrivateKey, provider);
  const c = contract(signer);
  const root = rootToBytes32(rootHex);
  const tx = await c.appendIntelligentData(tokenId, root, description);
  await tx.wait();
}

export async function transferINFT(fromPk: string, to: string, tokenId: number) {
  assertINFT();
  const provider = new JsonRpcProvider(config.zgRpc);
  const signer = new Wallet(fromPk, provider);
  const c = contract(signer);
  const tx = await c.safeTransferFrom(await signer.getAddress(), to, tokenId);
  await tx.wait();
}

export type AgentCreatedLog = {
  tokenId: number;
  owner: string;
  configRoot: string;
  ensName: string;
  blockNumber: number;
};

export async function fetchAgentCreatedLogs(opts?: { fromBlock?: number; toBlock?: number }): Promise<AgentCreatedLog[]> {
  assertINFTRead();
  const provider = new JsonRpcProvider(config.zgRpc);
  const c = new Contract(config.inftAddress, ABI, provider);
  const filter = c.filters.AgentCreated();
  const fromBlock = opts?.fromBlock ?? 0;
  const toBlock = opts?.toBlock ?? "latest";
  const logs = await c.queryFilter(filter, fromBlock, toBlock);
  const out: AgentCreatedLog[] = [];
  for (const log of logs) {
    const el = log as EventLog;
    if (!el.args) continue;
    try {
      const tokenId = Number(el.args.tokenId);
      const owner = String(el.args.owner).toLowerCase();
      const configRoot = ethers.hexlify(el.args.configRoot);
      const ensName = String(el.args.ensName);
      out.push({
        tokenId,
        owner,
        configRoot,
        ensName,
        blockNumber: Number(el.blockNumber),
      });
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => a.tokenId - b.tokenId);
}

export type AgentUpdatedLog = {
  tokenId: number;
  newConfigRoot: string;
  newVersion: number;
  blockNumber: number;
};

export async function fetchAgentUpdatedLogs(
  tokenId: number,
  opts?: { fromBlock?: number; toBlock?: number }
): Promise<AgentUpdatedLog[]> {
  assertINFTRead();
  const provider = new JsonRpcProvider(config.zgRpc);
  const c = new Contract(config.inftAddress, ABI, provider);
  const filter = c.filters.AgentUpdated();
  const fromBlock = opts?.fromBlock ?? 0;
  const toBlock = opts?.toBlock ?? "latest";
  const logs = await c.queryFilter(filter, fromBlock, toBlock);
  const out: AgentUpdatedLog[] = [];
  for (const log of logs) {
    const el = log as EventLog;
    if (!el.args) continue;
    if (Number(el.args.tokenId) !== tokenId) continue;
    try {
      out.push({
        tokenId: Number(el.args.tokenId),
        newConfigRoot: ethers.hexlify(el.args.newConfigRoot),
        newVersion: Number(el.args.newVersion),
        blockNumber: Number(el.blockNumber),
      });
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => a.blockNumber - b.blockNumber);
}
