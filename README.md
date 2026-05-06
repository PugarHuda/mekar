# 🌳 MEKAR

**AI Genealogy & Royalty Protocol on 0G**

> *Every AI has a lineage. Every inference pays its ancestors.*
>
> *Spotify-style royalty for the agentic era — built on 0G's INFT primitive.*

---

## 🎯 Problem

AI today looks like the music industry in 1999 — before Spotify:

- 🔴 **Lawsuit chaos** — NYT vs OpenAI ($7.5B), Getty vs Stability ($1.7B), 10K artists vs Midjourney
- 🔴 **EU AI Act enforcement** begins May 2026 — mandatory training-data provenance
- 🔴 **Open AI dying** — Stability AI bankrupt 2024, Mistral pivoted closed source
- 🔴 **Creators not paid** — Llama 3 derivatives flood the market, Meta receives $0 royalty
- 🔴 **Compliance nightmare** — there is no way to verify "what was this AI trained on?"

---

## 💡 Solution

MEKAR provides the missing **royalty rail** for AI:

1. **Lineage** — Every agent is an INFT (ERC-7857) with provable parents on-chain
2. **Royalty** — Inference fees automatically split across the entire ancestor tree
3. **Alignment** — 0G Alignment Nodes audit lineage health (bias drift, hallucination)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            USER LAYER                       │
│  Creator | Fine-tuner | End User Dashboard  │
└──────────────────┬──────────────────────────┘
                   │
┌─────────────────────────────────────────────┐
│       MEKAR PROTOCOL CONTRACTS              │
│  Registry | INFT | RoyaltyVault | Auditor   │
└──────────────────┬──────────────────────────┘
                   │
┌─────────────────────────────────────────────┐
│        0G INFRASTRUCTURE (NATIVE)           │
│  Chain | Storage | Compute | INFT | Align   │
└─────────────────────────────────────────────┘
```

---

## 🔌 0G Modules Used (6 components)

| Module | Usage |
|---|---|
| **0G Chain** (16602) | All 7 smart contracts deployed at the Galileo testnet |
| **0G Storage Log** | Genealogy events, lineage history (permanent) |
| **0G Storage KV** | Mutable agent metadata with ACL |
| **0G Specialized Flow** | Encrypted model weights (premium permanence) |
| **0G Compute (TEE)** | Sealed inference + training attestation |
| **INFT (ERC-7857)** | Each agent tokenized with composition primitives |
| **Alignment Nodes** | Lineage health audits |
| **Data Serving Network** | Auto-billing for inference |

---

## 📁 Repository Structure

```
mekar/
├── packages/
│   ├── contracts/    # Solidity smart contracts
│   ├── frontend/     # Next.js dApp
│   └── backend/      # 0G SDK integration service
├── docs/             # Architecture, demo, design notes
├── scripts/          # Deploy + demo helpers
└── CLAUDE.md         # Project context for AI agents
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- A 0G testnet wallet funded via the [faucet](https://faucet.0g.ai)

### Install

```bash
pnpm install
```

### Compile Contracts

```bash
cd packages/contracts
forge build
```

### Run Tests

```bash
forge test
```

### Deploy (0G Galileo Testnet)

```bash
# Configure .env from .env.example
cp .env.example .env
# Add DEPLOYER_PRIVATE_KEY

# Deploy contracts (uses forge create due to forge script chain detection issue)
forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --evm-version cancun --legacy --broadcast \
  contracts/AgentINFT.sol:AgentINFT --constructor-args $YOUR_ADDRESS
```

See [`docs/DEPLOY_GUIDE.md`](docs/DEPLOY_GUIDE.md) for the full walkthrough.

### Run Frontend

```bash
pnpm --filter @mekar/frontend dev
# → http://localhost:3000
```

---

## 📖 How It Works

### 1. Genesis Mint (Original AI Creator)

```
1. Creator trains a base model
2. Encrypts weights and uploads to 0G Specialized Flow
3. Submits training-data Merkle root + TEE attestation
4. Mints a Genesis INFT with a royalty schema
   ↓
   Genesis Agent #001 (parents: [], generation: 0)
```

### 2. Fork (Single-Parent Fine-tune)

```
1. Pick a parent INFT from the MEKAR Explorer
2. Pay the license fee (configurable)
3. Submit new training data
4. 0G Compute TEE runs training:
   - Decrypts the parent weights inside the enclave
   - Trains on the new data
   - Returns child weights + attestation
5. Smart contract verifies the attestation → mints child INFT
   ↓
   Child Agent #042 (parents: [1], generation: 1)
```

### 3. Compose (Multi-Parent Merge)

```
1. Pick multiple parent INFTs
2. Choose a composition strategy (LoRA merge, distillation, ensemble)
3. TEE executes the merge with attestation
4. Alignment Nodes verify there is no drift
5. Mint the composed INFT
   ↓
   Composed Agent #156 (parents: [42, 78], generation: 2)
```

### 4. Inference & Royalty Distribution

```
End User → Pay 1 $0G to use Agent #156

RoyaltyVault.sol distributes atomically:
├── Owner of #156         → 0.50 $0G  (50%)
├── Owner of #42 (parent) → 0.125 $0G (12.5%)
├── Owner of #78 (parent) → 0.125 $0G (12.5%)
├── Owner of #1 (genesis) → 0.15 $0G  (15%)
└── Training contributors → 0.03 $0G  (3%)

Plus: compute provider fee + protocol fee
```

---

## 🛡️ Anti-Wrapping Defense

A 5-layer protection against clone laundering:

1. **TEE Training Attestation** — proves real training compute occurred
2. **Weight Delta Threshold** — rejects mints with insufficient weight change
3. **Behavioral Fingerprint Probe** — detects output similarity to existing INFTs
4. **Challenge Period + Stake** — 30-day window for community challenges with slashing
5. **Reputation System** — repeat offenders are blocked

---

## 🌐 Live Demo

**Production URL:** [https://mekar.vercel.app](https://mekar.vercel.app)

| Page | Path | What it does |
|---|---|---|
| Landing | `/` | Project pitch + 0G stack showcase |
| **Explorer** | `/explorer` | D3 lineage tree of all on-chain agents |
| **Agent Detail** | `/agent/[id]` | Individual agent + inference payment UI |
| Mint | `/mint` | Genesis / Fork / Compose flows |
| Dashboard | `/dashboard` | User's agents + royalty earnings |

## 🎬 Demo Video

> Demo video link will be added.

## 📊 Live Deployment (0G Galileo Testnet — Chain 16602)

| Contract | Address | Explorer |
|---|---|---|
| **MekarRegistry** | `0x66b2F33bF34081b48046e713457fa3912363E779` | [view ↗](https://chainscan-galileo.0g.ai/address/0x66b2F33bF34081b48046e713457fa3912363E779) |
| **AgentINFT** (ERC-7857) | `0xA00A7641FEE39753fFdd1cECA5b73336a68699e3` | [view ↗](https://chainscan-galileo.0g.ai/address/0xA00A7641FEE39753fFdd1cECA5b73336a68699e3) |
| **RoyaltyVault** | `0x1D62B1D60375D325C3362073e12806A7DF20FBDa` | [view ↗](https://chainscan-galileo.0g.ai/address/0x1D62B1D60375D325C3362073e12806A7DF20FBDa) |
| **TrainingDataRegistry** | `0xdBE4397f3e4CCafDA7bfbeD264448577249513e8` | [view ↗](https://chainscan-galileo.0g.ai/address/0xdBE4397f3e4CCafDA7bfbeD264448577249513e8) |

### Live Lineage Tree (4 Agents, 3 Inferences Settled)

```
Genesis #1 (gen 0)
  ├── Fork #2 — medical (gen 1)
  │     │
  │     └─┐
  └── Fork #3 — legal (gen 1)
            │
            └── Compose #4 — medical+legal (gen 2)
                    ↓
                3 inferences paid + royalty distributed
```

**On-chain proof (Galileo):**
- Inference #1 settlement: [`0xd4c0...51d3b`](https://chainscan-galileo.0g.ai/tx/0xd4c01777f7908c7b175e1720eab800e32d5f16aab44fe0543c4cb8974a451d3b)
- Inference #2 settlement: [`0x07fd...28635`](https://chainscan-galileo.0g.ai/tx/0x07fd3503a1d55ce8348c536f850ca32d6ca9ee24e9f87ba56b36c3537e328635)

Each settlement tx contains **4 RoyaltyPaid events** showing automatic distribution to:
- Agent #4 owner (50%)
- Agent #2 parent (12.5%)
- Agent #3 parent (12.5%)
- Agent #1 grandparent (15% — deduplicated despite 2 paths)
- Plus: training contributor share, compute provider fee, protocol fee

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

## 🏆 Hackathon

Built for the **0G APAC Hackathon 2026** — Track 3 (Agentic Economy & Autonomous Applications)

#0GHackathon #BuildOn0G

@0G_labs @0g_CN @0g_Eco @HackQuest_
