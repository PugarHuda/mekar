# MEKAR Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER LAYER (Next.js)                     │
│                                                                  │
│  Landing /  | Explorer /explorer | Mint /mint  | Dashboard /dash │
│       ↓             ↓                  ↓                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ wagmi v2 + viem + RainbowKit                             │    │
│  │ D3.js force-graph (lineage tree visualization)           │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────┬────────────────────────────────────────┘
                          │ JSON-RPC + on-chain reads
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│              MEKAR PROTOCOL (Solidity 0.8.24)                    │
│                                                                  │
│  ┌────────────────────┐   ┌────────────────────┐                 │
│  │  AgentINFT.sol     │   │ MekarRegistry.sol  │                 │
│  │  ERC-7857 mint     │←──┤ Lineage graph BFS  │                 │
│  │  Genesis/Fork/     │   │ Descendants index  │                 │
│  │  Compose flows     │   │ Owner-creator map  │                 │
│  └─────────┬──────────┘   └─────────┬──────────┘                 │
│            │                        │                            │
│            ▼                        ▼                            │
│  ┌────────────────────┐   ┌────────────────────┐                 │
│  │ TrainingDataReg.sol│   │ RoyaltyVault.sol   │                 │
│  │ Merkle root anchor │   │ Atomic distribute  │                 │
│  │ Contributor split  │   │ Multi-tier dedup   │                 │
│  └────────────────────┘   └────────────────────┘                 │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│              0G INFRASTRUCTURE (Aristotle / Galileo)             │
│                                                                  │
│  Chain (16602/16661) | Storage Log/KV | Specialized Flow         │
│  Compute (TEE)       | INFT (ERC-7857) | Alignment Nodes         │
│  Data Serving Network (auto-billing)                             │
└──────────────────────────────────────────────────────────────────┘
                          ▲
                          │ Express service
                          │
┌──────────────────────────────────────────────────────────────────┐
│              MEKAR BACKEND (Node 20 + TypeScript)                │
│                                                                  │
│  /api/storage/upload     ──► 0G Storage SDK                      │
│  /api/storage/merkle     ──► Compute training data Merkle root   │
│  /api/compute/inference  ──► 0G Compute broker (TEE)             │
│  /api/compute/verify     ──► Verify TEE attestation              │
└──────────────────────────────────────────────────────────────────┘
```

## Contract Reference

| Contract | LOC | Purpose | Mainnet Ready |
|---|---|---|---|
| `AgentINFT.sol` | 350 | ERC-7857 INFT, mint flows, lineage data | ✓ |
| `MekarRegistry.sol` | 200 | Master index, BFS ancestors traversal | ✓ |
| `RoyaltyVault.sol` | 400 | Escrow + atomic multi-tier distribution | ✓ |
| `TrainingDataRegistry.sol` | 200 | Dataset hash + contributors | ✓ |
| `LineageMath.sol` (lib) | 80 | Schema validation, share math, dedup | ✓ |

**Total: ~1,200 LOC Solidity, all gas-optimized via `viaIR`.**

## Data Flow: One Inference Payment

```
1. Frontend
   └─► royaltyVault.payInference(agentId, { value: price })
   └─► Wallet signs tx
   └─► Tx mined on 0G chain

2. RoyaltyVault.payInference
   ├─► Verify msg.value >= getInferencePrice(agentId)
   ├─► Generate requestId = keccak256(payer, agentId, ts, nonce)
   ├─► Lock escrow with status = Escrowed
   └─► Emit InferenceRequested(requestId, agentId, payer, amount)

3. Backend / Compute Provider
   ├─► Subscribe to InferenceRequested events
   ├─► Pop request from queue
   ├─► Load encrypted weights from 0G Storage Specialized Flow
   ├─► Decrypt + run inference inside TEE enclave
   ├─► Generate output + TEE attestation signature
   └─► Call royaltyVault.settleInference(requestId, outputHash, attestation)

4. RoyaltyVault.settleInference
   ├─► Verify attestation
   ├─► Walk lineage tree (BFS, deduplicated)
   ├─► Distribute per royaltySchema:
   │     50% direct owner
   │     25% gen1 parents (split)
   │     15% gen2 grandparents (split, dedup)
   │      7% gen3+ ancestors (split, capped)
   │      3% training contributors
   ├─► Pay compute provider (10% on top)
   ├─► Accrue protocol fee (10% on top)
   └─► Emit RoyaltyPaid for each recipient + InferenceSettled
```

## Royalty Math (Worked Example)

Lineage:
```
Genesis (Alice)
   ├── Fork B (Bob)
   ├── Fork C (Carol)
   └── Compose D = B + C (David)
```

User pays 1 $0G to use Agent D:

| Recipient | Generation | Share | Amount |
|---|---|---|---|
| David (D owner) | 0 | 50% | 0.50 $0G |
| Bob (parent) | 1 | 12.5% | 0.125 $0G |
| Carol (parent) | 1 | 12.5% | 0.125 $0G |
| Alice (genesis grandparent, **deduped**) | 2 | 15% | 0.15 $0G |
| Training contributors of Genesis | — | 3% | 0.03 $0G |
| **Subtotal** | | **93%** | **0.93 $0G** |
| Protocol fee | — | +10% on top | 0.10 $0G |
| Compute provider | — | +10% on top | 0.10 $0G |
| User pays total | | | **1.20 $0G** |

## Anti-Wrapping Defense (5 Layers)

1. **TEE attestation required** — empty `teeProof` = revert
2. **Weight delta check** — child weights must differ from parent
3. **Behavioral fingerprint probe** (Phase 2) — compare output distribution
4. **Challenge period** — 30-day window for community challenges with stake-slashing
5. **Reputation system** (Phase 3) — repeat offenders blocked

## Three Participation Tiers

| Tier | Weights | Forks Forced? | Royalty Capture |
|---|---|---|---|
| **Strict** | Encrypted on Specialized Flow | Yes (TEE access only) | ~100% |
| **Voluntary** | Public download | No (license-based) | ~70% |
| **Audit-Only** | Existing model wrapped | N/A | 0% (compliance only) |

## Network Targets

```
Galileo Testnet (development):
  chainId:        16602
  RPC:            https://evmrpc-testnet.0g.ai
  Explorer:       https://chainscan-galileo.0g.ai
  Storage Indexer: https://indexer-storage-testnet-turbo.0g.ai
  Faucet:         https://faucet.0g.ai (0.1 0G/day)

Aristotle Mainnet (production):
  chainId:        16661
  RPC:            https://evmrpc.0g.ai
  Explorer:       https://chainscan.0g.ai
  Storage Indexer: https://indexer-storage-turbo.0g.ai
```

## File Tree

```
mekar/
├── packages/
│   ├── contracts/           # Foundry workspace
│   │   ├── contracts/       # 5 Solidity contracts
│   │   ├── test/            # 33 unit tests (incl. Q2/Q4/Q5 fix coverage)
│   │   └── lib/             # OZ + forge-std
│   ├── frontend/            # Next.js 15 dApp
│   │   └── src/
│   │       ├── app/         # Pages: /, /explorer, /mint, /agent/[id], /dashboard
│   │       ├── components/  # LineageGarden, Header, NetworkBanner, InferencePay
│   │       ├── hooks/       # useLineageData, useAgent, useUserStats
│   │       ├── lib/         # chains, wagmi, utils, agentNaming, storage
│   │       └── contracts/   # ABIs + addresses
│   └── backend/             # Express + 0G SDKs
│       └── src/
│           ├── services/    # storage (real Indexer.upload), compute (stub)
│           ├── routes/      # /api/storage, /api/compute
│           └── lib/         # config, logger
├── docs/
│   ├── ARCHITECTURE.md      # This file
│   ├── DEPLOY_GUIDE.md      # Deploy walkthrough
│   ├── HACKATHON_SUBMISSION.md
│   ├── HACKQUEST_FORM.md
│   ├── DEMO_VIDEO_SCRIPT.md
│   └── X_POST_DRAFT.md
├── scripts/
│   ├── deploy-v2-fix.sh     # verified-code re-deploy
│   ├── multi-wallet-seed.sh # 3 ephemeral wallets + cascade demo
│   └── seed-more-royalty.sh # multi-agent inference top-up
├── 0g-whitepaper.pdf        # Reference
├── README.md
└── CLAUDE.md
```
