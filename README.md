# Alter — Digital Twin Agents on 0G

Production-oriented MVP: **World ID**-gated agent creation, **0G Storage** for config/memory, **0G Compute** for all LLM inference, **ERC-7857-style iNFT** on 0G chain (intelligent data roots + ERC-721), **ENS** on Sepolia for names and optional on-chain text records, **agent-to-agent** routing over `POST /agent/request`.

## Architecture

| Layer | Choice |
|--------|--------|
| Web | Next.js App Router, Tailwind v4, TypeScript |
| API | Fastify, Zod, JWT session after World ID |
| AI | OpenAI-compatible calls to **0G Compute** only (`@0glabs/0g-serving-broker`) |
| Storage | **0G** via `@0gfoundation/0g-ts-sdk` (`MemData` + `Indexer`) |
| iNFT | `TwinAgentINFT` — ERC-721 + `intelligentDataOf` (EIP-7857 metadata pattern; full TEE/ZKP transfer proofs are not implemented in this MVP) |
| ENS | `viem` — `getEnsAddress` / `getEnsText` on Sepolia; optional `setText` if `ENS_OPERATOR_PRIVATE_KEY` controls the name |

## Prerequisites

1. **World ID** app + **Signing Key** + **RP ID** / **App ID** from the [World Developer Portal](https://developer.worldcoin.org).
2. **0G Galileo testnet** (chain id **16602**): fund the wallets behind `ZG_STORAGE_PRIVATE_KEY` and `ZG_COMPUTE_PRIVATE_KEY` from [faucet.0g.ai](https://faucet.0g.ai). Storage pays upload gas; compute uses the broker ledger (acknowledge provider, etc.). You can use one key for both or split them.
3. **Sepolia** ENS name whose **address record** points to the same wallet that will own the iNFT (the UI checks this before mint).
4. Deploy **TwinAgentINFT** to 0G testnet (`packages/contracts`).

## Setup

```bash
cp .env.example .env
# Fill all keys (see comments in .env.example)

npm install
npm run contracts:compile
# Deploy to 0G Galileo (16602): loads root .env; set DEPLOYER_PRIVATE_KEY or INFT_OWNER_PRIVATE_KEY
npm run contracts:deploy
# Copy logged TwinAgentINFT address into INFT_CONTRACT_ADDRESS (owner = deployer; same key can mint)
```

Run API and web (two terminals):

```bash
npm run dev:api
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy frontend (Vercel)

The Next.js app in `apps/web` is configured for Vercel (`apps/web/vercel.json`: install from monorepo root, then build). Set **Root Directory** to `apps/web` in the Vercel project, deploy the API elsewhere, and configure `NEXT_PUBLIC_API_URL` plus CORS. See **[VERCEL.md](./VERCEL.md)** for the full checklist.

## Demo flow

1. **World ID** — Dashboard → verify; API verifies via `POST https://developer.worldcoin.org/api/v4/verify/{rp_id}`.
2. **Link wallet** — same address as Sepolia ENS and iNFT recipient.
3. **Create agent** — uploads JSON config to **0G Storage**, mints **iNFT**, registers in local registry; optional ENS `twinn.*` text if operator key is set.
4. **0G Compute** — Interaction console or `POST /agent/request` runs chat through the broker (fund ledger / acknowledge provider as per [0G Compute SDK](https://www.npmjs.com/package/@0glabs/0g-serving-broker)).
5. **Memory / reputation** — each turn is uploaded to **0G Storage**; reputation counters updated; optional `appendIntelligentData` on-chain.

## API highlights

- `GET /auth/world-id/challenge` — RP context for IDKit.
- `POST /auth/world-id/verify` — body = IDKit result → JWT.
- `POST /session/wallet` — bind verified nullifier → `0x` address.
- `POST /agents` — authenticated; 0G upload + mint + registry.
- `GET /agents` — marketplace / registry.
- `POST /agent/request` — resolve ENS → load agent → 0G inference → 0G memory write.
- `GET /nft/metadata/:agentId` — off-chain metadata URI target for `tokenURI`.

## 0G verification

After filling `.env`, from the repo root:

```bash
npm run check:0g
```

This hits **Galileo RPC** (latest block), the **storage indexer** (`getShardedNodes`), and lists **compute providers** from the read-only broker. With the API running, `GET /health` includes a `zg` object (RPC URLs and whether storage/compute keys are set—never the keys themselves).

Optional **`ZG_INFERENCE_PROVIDER`**: set to a provider `0x` address to pin routing; otherwise the first provider from `listService()` is used (cached for the process lifetime).

## Production upgrade (decentralized discovery)

- **`DISCOVERY_MODE`**: `local` (default, file registry), `ens` (manifest + ENS text only), or `hybrid` (merge registry + manifest).
- **`AGENT_INDEX_ROOT` / `ENS_INDEX_NAME`**: optional 0G manifest of agents (`alter-agent-index/v1` for new manifests; legacy `counselr-agent-index/v1` and `twinnet-agent-index/v1` still load); index name on Sepolia can store `twinn.manifest` = latest root. Mint flow appends entries and updates ENS when configured.
- **ENS text records**: `twinn.config`, `twinn.owner`, `twinn.chain`, `twinn.worldId`, plus existing `twinn.agentId` / `twinn.tokenId`.
- **API**: `GET /agents?sort=usage|reputation`, `GET /agents/by-root/:root`, `GET /agents/:id/versions`, `POST /agents/:id/config/rollback`, `POST /agent/delegate`, responses include `proofHash` / `inferenceProvider` where applicable.
- **Compute**: `COMPUTE_PROVIDERS=0g,mock,openai` (fallback order). Optional `OPENAI_API_KEY`, `PAYMENT_MODE=off|mock`, `REFLECTION_EVERY_N`.
- **CLI**: `npm run resolve:ens -- name.eth` resolves a profile from Sepolia ENS.

## Notes

- **No mocks**: inference and storage call real 0G services; failures surface as HTTP 502 with error text. Use `COMPUTE_PROVIDERS=mock` for local-only inference.
- **ENS “assignment”**: creation requires the name to **already resolve** to the user’s wallet on Sepolia. Automated `setText` is optional and only works if `ENS_OPERATOR_PRIVATE_KEY` can sign for that name’s resolver.
- **ERC-7857**: this repo implements the **metadata hash** pattern and ERC-721 transfers; not the full `iTransfer` / verifier proof pipeline from the EIP.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev:api` | Fastify + tsx watch |
| `npm run dev:web` | Next.js dev |
| `npm run contracts:compile` | Hardhat build |
| `npm run contracts:deploy` | Deploy to `zgTestnet` |
