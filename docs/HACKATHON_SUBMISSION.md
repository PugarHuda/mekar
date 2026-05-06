# MEKAR — 0G APAC Hackathon Submission

## Track 3: Agentic Economy & Autonomous Applications

> *Spotify-style royalty for AI agents. Every AI has provable on-chain DNA.
> Every inference automatically distributes royalty to ancestors.*

---

## ✅ Submission Checklist

| Requirement | Status |
|---|---|
| Project name + 30-word description | ✅ |
| Public GitHub repository | ✅ |
| Substantial commits during hackathon | ✅ |
| **0G mainnet/testnet contract address** | ✅ Galileo testnet (16602) |
| **0G Explorer link with verifiable on-chain activity** | ✅ 4 contracts, 4 mints, 3 inference settlements |
| **0G component integration proof** | ✅ Chain + ERC-7857 + Storage interface + Compute interface |
| Demo video ≤ 3 min | ⏳ |
| README with architecture | ✅ |
| Public X post + hashtags + tags | ⏳ |

---

## 📍 Contract Addresses (0G Galileo Testnet — Chain 16602)

```
TrainingDataRegistry: 0xdBE4397f3e4CCafDA7bfbeD264448577249513e8
AgentINFT (ERC-7857): 0xA00A7641FEE39753fFdd1cECA5b73336a68699e3
MekarRegistry:        0x66b2F33bF34081b48046e713457fa3912363E779
RoyaltyVault:         0x1D62B1D60375D325C3362073e12806A7DF20FBDa
```

**Explorer:** https://chainscan-galileo.0g.ai

---

## 🔌 0G Components Integrated

### 1. **0G Chain (Galileo, chainId 16602)**
All 4 smart contracts deployed on 0G Chain. Live transactions visible on
chainscan-galileo.0g.ai.

### 2. **INFT (ERC-7857) — Flagship 0G Innovation**
`AgentINFT.sol` extends ERC-721 with:
- Encrypted weights pointer (referenced from 0G Storage)
- Multi-parent composition primitive
- Re-encryption oracle hook (for ownership transfer)
- Lineage data (parents, generation, training data Merkle root)
- TEE attestation hash

### 3. **0G Storage (Specialized Flow)**
- `weightsPointer` field stores reference to encrypted model weights on
  0G Storage Specialized Flow (premium permanence tier)
- `trainingDataMerkle` anchors the Merkle root of training data
- Backend service (`packages/backend/src/services/storage.ts`) wraps
  `@0gfoundation/0g-ts-sdk` for upload/retrieve

### 4. **0G Compute (TEE Sealed Inference)**
- `RoyaltyVault.settleInference` requires TEE attestation hash
- Backend service (`packages/backend/src/services/compute.ts`) wraps
  `@0glabs/0g-serving-broker` for sealed inference + attestation verify

### 5. **Alignment Nodes (built-in hook)**
- `AgentINFT.updateAlignmentHealth(tokenId, score)` callable by registered
  Alignment Auditor address
- Health score affects royalty distribution

### 6. **Data Serving Network (architecture-ready)**
- Provider registry in `RoyaltyVault.registerProvider`
- Settlement flow matches Data Serving Network spec from whitepaper §1

---

## 🌳 Live Lineage on Galileo

```
        ┌─────────────────────────┐
        │  Genesis Agent (#1)     │
        │  IndoLlama-Base         │
        │  generation 0           │
        └────────────┬────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     ┌─────────┐           ┌─────────┐
     │Fork (#2)│           │Fork (#3)│
     │ medical │           │  legal  │
     │  gen 1  │           │  gen 1  │
     └────┬────┘           └────┬────┘
          │                     │
          └──────────┬──────────┘
                     ▼
              ┌──────────────┐
              │ Compose (#4) │
              │medical+legal │
              │   gen 2      │
              └──────────────┘
                     │
                     ▼
            3 inferences paid
            → royalty auto-distributed
```

---

## 💰 Royalty Distribution Proof

Each user inference of Agent #4 triggers atomic distribution:

| Recipient | Generation | Share |
|---|---|---|
| Agent #4 owner | 0 (direct) | 50% |
| Agent #2 owner (parent) | 1 | 12.5% (split with #3) |
| Agent #3 owner (parent) | 1 | 12.5% (split with #2) |
| Agent #1 owner (grandparent) | 2 | 15% (deduplicated) |
| Training contributors | — | 3% |
| Protocol fee | — | +10% on top |
| Compute provider | — | +10% on top |

**Verifiable on-chain:** Each `settleInference` tx emits 4-5 `RoyaltyPaid` events.

Sample settlement tx:
[`0xd4c01777f7908c7b175e1720eab800e32d5f16aab44fe0543c4cb8974a451d3b`](https://chainscan-galileo.0g.ai/tx/0xd4c01777f7908c7b175e1720eab800e32d5f16aab44fe0543c4cb8974a451d3b)

---

## 📦 Repository

```
mekar/
├── packages/
│   ├── contracts/    # Foundry smart contracts (4 contracts, 25 tests)
│   ├── frontend/     # Next.js 15 dApp (landing + explorer + mint)
│   └── backend/      # Express service (0G Storage + Compute SDK)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOY_GUIDE.md
│   └── HACKATHON_SUBMISSION.md (this file)
└── scripts/
    └── seed-galileo.sh        # Deployed on Galileo testnet
```

**Total LOC:**
- Solidity: ~1,200
- TypeScript (frontend): ~1,400
- TypeScript (backend): ~600

**Test Coverage:** 25/25 unit tests passing (Foundry)

---

## 🎯 Why MEKAR Matters (One Paragraph)

AI today looks like the music industry in 1999 — no copyright rail. NYT vs
OpenAI $7.5B claim, Getty vs Stability $1.7B, EU AI Act enforcement begins
May 2026. Open-source AI is dying without a royalty rail (Stability AI is
bankrupt). MEKAR is the **missing royalty rail** — built natively on 0G's
INFT (ERC-7857) primitive, which no other chain has. Every AI agent has a
verifiable lineage, every inference automatically pays its ancestors, and
alignment is audited by Alignment Nodes. EU AI Act compliance + AI creator
economy in a single protocol.

---

## 🔗 Links

- **Live demo:** [https://mekar.vercel.app](https://mekar.vercel.app) ✅ deployed
  - Explorer: https://mekar.vercel.app/explorer
  - Agent #4 (composed): https://mekar.vercel.app/agent/4
- **Repo:** [github.com/.../mekar](#)
- **Demo video:** (recording)
- **X post:** (publishing)

## 🚀 Live Verification Path

Reviewers can verify the project's claims in 3 steps:

1. **Visit** https://mekar.vercel.app/explorer — see the lineage tree of 4 on-chain agents
2. **Click any agent** → open the detail page with the inference payment UI
3. **Cross-reference** https://chainscan-galileo.0g.ai/address/0xA00A7641FEE39753fFdd1cECA5b73336a68699e3 to verify the on-chain activity

---

## #0GHackathon #BuildOn0G

@0G_labs @0g_CN @0g_Eco @HackQuest_
