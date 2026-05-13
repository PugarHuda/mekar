# MEKAR — Integration Guide

> How to use MEKAR agents **without** the official frontend.

MEKAR is on-chain royalty infrastructure on 0G, not a closed platform.
This document shows how a third party can pay for inference, mint
agents, listen to royalty cascades, and query lineage state directly
from contracts — using any standard EVM toolchain.

---

## Why this matters

The `mekar.vercel.app` UI is a reference implementation. The actual
agents live as INFTs on 0G Galileo testnet, callable from anywhere:

- Build a **chatbot** in any language that pays an agent per response
- Build a **mobile app** that lets users invoke MEKAR agents
- **Index** the cascade for analytics, payout dashboards, or compliance
- **Compose** MEKAR INFTs into your own DeFi / AI marketplace

Every external call into `RoyaltyVault.payInference` runs the same
on-chain royalty cascade that the official UI uses. The protocol does
not distinguish between "official" and "third-party" callers.

---

## Contracts (0G Galileo testnet — chain 16602)

| Contract | Address |
|---|---|
| AgentINFT (ERC-7857) | [`0x2B429feAe5d2732fF126F964D5786C0c51A844f3`](https://chainscan-galileo.0g.ai/address/0x2B429feAe5d2732fF126F964D5786C0c51A844f3) |
| MekarRegistry | [`0x5466826BdFcc7f26F03D1E43bAA40E43d7700f92`](https://chainscan-galileo.0g.ai/address/0x5466826BdFcc7f26F03D1E43bAA40E43d7700f92) |
| RoyaltyVault | [`0x49eCE891AeA76aad967A83B53DC160328036BABc`](https://chainscan-galileo.0g.ai/address/0x49eCE891AeA76aad967A83B53DC160328036BABc) |
| AlignmentAuditor | [`0x4C399b1f2DBD4028d39E21A512E90930375910eB`](https://chainscan-galileo.0g.ai/address/0x4C399b1f2DBD4028d39E21A512E90930375910eB) |
| TrainingDataRegistry | [`0xdBE4397f3e4CCafDA7bfbeD264448577249513e8`](https://chainscan-galileo.0g.ai/address/0xdBE4397f3e4CCafDA7bfbeD264448577249513e8) |

**ABIs:** import from `packages/frontend/src/contracts/abis.ts` in the
repo, or pull verified ABIs straight from the chainscan links above.

**RPC + faucet:**
```
RPC:    https://evmrpc-testnet.0g.ai
Chain:  16602
Faucet: https://faucet.0g.ai
```

---

## Common flows

### 1. Pay + run inference (the cascade-triggering flow)

`RoyaltyVault.payInference(agentId)` escrows OG; a registered compute
provider then calls `settleInference(requestId, outputHash, attestation)`
to release the escrow and distribute royalty across the lineage in
a single atomic tx.

#### cast (one-liner)

```bash
# Read current price for agent #4
PRICE=$(cast call \
  0x49eCE891AeA76aad967A83B53DC160328036BABc \
  "getInferencePrice(uint256)(uint256)" 4 \
  --rpc-url https://evmrpc-testnet.0g.ai | awk '{print $1}')

# Pay
cast send \
  0x49eCE891AeA76aad967A83B53DC160328036BABc \
  "payInference(uint256)" 4 \
  --value $PRICE \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $YOUR_KEY \
  --legacy
```

#### viem (TypeScript)

```ts
import { createWalletClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({
    account,
    chain: { id: 16602, name: "0G-Galileo-Testnet", nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 }, rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } } },
    transport: http(),
});

const VAULT = "0x49eCE891AeA76aad967A83B53DC160328036BABc" as const;

// 1. Read price
const price = await wallet.readContract({
    address: VAULT,
    abi: [parseAbiItem("function getInferencePrice(uint256) view returns (uint256)")],
    functionName: "getInferencePrice",
    args: [4n],
});

// 2. Pay
const hash = await wallet.writeContract({
    address: VAULT,
    abi: [parseAbiItem("function payInference(uint256) payable returns (bytes32)")],
    functionName: "payInference",
    args: [4n],
    value: price,
});
```

#### ethers v6

```ts
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const vault = new ethers.Contract(
    "0x49eCE891AeA76aad967A83B53DC160328036BABc",
    [
        "function getInferencePrice(uint256) view returns (uint256)",
        "function payInference(uint256) payable returns (bytes32)",
    ],
    signer
);

const price = await vault.getInferencePrice(4);
const tx = await vault.payInference(4, { value: price });
const receipt = await tx.wait();
```

The Vault emits `InferenceRequested(bytes32 indexed requestId, uint256 indexed agentId, address indexed payer, uint256 amount)` — pluck the
`requestId` from the receipt logs and hand it to the compute provider
out-of-band, or settle it yourself if you're also a registered provider.

### 2. Listen to the royalty cascade

When a settle happens, the Vault fires multiple `RoyaltyPaid` events
in one tx — one per recipient down the lineage tree.

```ts
import { parseAbiItem } from "viem";

const event = parseAbiItem(
    "event RoyaltyPaid(uint256 indexed agentId, address indexed recipient, uint16 generation, uint256 amount)"
);

const logs = await client.getLogs({
    address: "0x49eCE891AeA76aad967A83B53DC160328036BABc",
    event,
    args: { recipient: someAddress },     // filter by recipient OR
    // args: { agentId: BigInt(4) },       // filter by agent
    fromBlock: 32160000n,                  // vault v2 deploy block
});

for (const log of logs) {
    console.log({
        agentId: Number(log.args.agentId),
        recipient: log.args.recipient,
        generation: log.args.generation,
        amount: log.args.amount,        // in wei
    });
}
```

### 3. Read an agent's lineage

```ts
const lineage = await client.readContract({
    address: "0x2B429feAe5d2732fF126F964D5786C0c51A844f3",
    abi: [parseAbiItem(
        "function getLineage(uint256) view returns (" +
        "(uint256[] parents, uint16 generation, bytes32 weightsPointer, " +
        "bytes32 trainingDataMerkle, bytes32 teeAttestation, address creator, " +
        "uint64 createdAt, uint16 alignmentHealth, uint8 mode))"
    )],
    functionName: "getLineage",
    args: [4n],
});

console.log(lineage.parents, lineage.generation);
```

### 4. Walk the lineage tree (deduplicated)

The Registry exposes a server-side BFS that handles multi-path dedup:

```ts
const ancestors = await client.readContract({
    address: "0x5466826BdFcc7f26F03D1E43bAA40E43d7700f92",
    abi: [parseAbiItem("function getAncestors(uint256, uint16) view returns (uint256[])")],
    functionName: "getAncestors",
    args: [4n, 10],   // walk 10 generations deep
});
```

### 5. Mint a new agent

#### Genesis (no parents)

```ts
const tx = await agentInft.write.mintGenesis([
    weightsPointer,        // bytes32 — Merkle root from 0G Storage
    trainingDataMerkle,    // bytes32
    teeAttestation,        // bytes32
    {
        directOwnerBps: 5000,
        gen1Bps: 2500,
        gen2Bps: 1500,
        gen3PlusBps: 700,
        trainingDataBps: 300,
        maxGenerationsPaid: 10,
    },
    1,                     // ParticipationMode.Voluntary
]);
```

Schema bps **must sum to exactly 10000** — `LineageMath.validateSchema`
reverts otherwise.

#### Fork (single parent)

```ts
await agentInft.write.mintFork([
    parentId,              // existing token id
    weightsPointer,        // must differ from parent's
    trainingDataMerkle,
    teeAttestation,
]);
```

Forks inherit royalty schema + mode from the parent — that's enforced
by the contract, not the UI, so even direct callers can't bypass it.

#### Compose (multi-parent)

```ts
await agentInft.write.mintCompose([
    [parent1, parent2],    // 2-8 unique parent IDs
    weightsPointer,
    trainingDataMerkle,
    teeAttestation,
    0,                     // CompositionStrategy.LoraMerge
]);
```

---

## Upload weights to 0G Storage (`weightsPointer`)

The `weightsPointer` is a Merkle root anchored on the Flow contract.
The reference implementation calls the SDK Indexer:

```ts
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

const indexer = new Indexer("https://indexer-storage-testnet-turbo.0g.ai");
const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const file = new MemData(Array.from(yourWeightsBuffer));
const [result, err] = await indexer.upload(
    file,
    "https://evmrpc-testnet.0g.ai",
    signer
);
if (err) throw err;
// result.rootHash is the bytes32 to feed mintGenesis / mintFork
```

That call signs a Flow contract anchor tx (cost ~30 microO at current
rates) and pushes the file segments to a quorum of storage nodes.

---

## Read royalty schema before paying

```ts
const schema = await agentInft.read.getRoyaltySchema([4n]);
// → { directOwnerBps, gen1Bps, gen2Bps, gen3PlusBps, trainingDataBps, maxGenerationsPaid }
```

Use this if your integration needs to display the cascade breakdown
to your end users before they pay.

---

## Verifying alignment health

```ts
const health = await agentInft.read.getAlignmentHealth([4n]);
// → uint16, 10000 = 100%, halved by AlignmentAuditor.flagAgent
```

When an ancestor's alignment is below 10000, **its share is scaled
proportionally** during settle (`shareAfter = share * health / 10000`).
The slashed remainder routes to `protocolFeesAccrued` (Q4 fix).

---

## Notes for compliance / indexers

- All royalty distribution happens **atomically in `settleInference`**.
  One tx = one cascade. Easy to subscribe + replay for audit logs.
- `RoyaltyPaid` events carry the full distribution shape (per-recipient,
  per-generation, exact wei). EU AI Act provenance reporting can derive
  the "who got paid for what training data" trail straight from events.
- Burned ancestors don't break settlement — the `_safeTransfer` fallback
  routes their share to `protocolFeesAccrued` (Q5 fix). Indexers should
  treat treasury growth as part of accountable royalty flow.

---

## Repo

[github.com/PugarHuda/mekar](https://github.com/PugarHuda/mekar) — full
sources, 33 unit tests, deploy scripts, multi-wallet seed flow.

Questions / want a different toolchain example? Open an issue or
ping the team — the protocol is open, the docs should be too.
