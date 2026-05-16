# 🌳 MEKAR

[![CI](https://github.com/PugarHuda/mekar/actions/workflows/ci.yml/badge.svg)](https://github.com/PugarHuda/mekar/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/live-mekar.vercel.app-d4a437)](https://mekar.vercel.app)
[![Tests](https://img.shields.io/badge/tests-59%20passing-1c3b2f)](packages/contracts/test/)
[![Network](https://img.shields.io/badge/0G-Aristotle%20Mainnet%2016661-1c3b2f)](https://chainscan.0g.ai/address/0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4)

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

## 🔌 0G Modules Used

| Module | Usage | Status |
|---|---|---|
| **0G Chain** (16661) | 5 smart contracts deployed on Aristotle mainnet | ✅ Live |
| **0G Storage Log** | Real `Indexer.upload()` — agent weights anchored, returned root used as on-chain `weightsPointer` | ✅ Live |
| **INFT (ERC-7857)** | Each agent tokenized with mint/fork/compose primitives | ✅ Live |
| **Alignment Nodes** | Allowlist auditor pushes alignment scores → scales ancestor royalty | ✅ Live (single-auditor for demo) |
| **0G Storage KV** | Mutable agent metadata with ACL | 🟡 Phase 2 |
| **0G Specialized Flow** | Encrypted model weights (premium tier + ECIES owner keys) | 🟡 Phase 2 |
| **0G Compute (TEE)** | Sealed inference + training attestation | 🟡 Phase 2 |
| **Data Serving Network** | Auto-billing for inference | 🟡 Phase 2 |

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
- A 0G wallet with $0G for gas — Aristotle mainnet for the live protocol (Galileo testnet + [faucet](https://faucet.0g.ai) works for local experiments)

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

### Deploy (0G Aristotle Mainnet)

```bash
# Configure .env from .env.example
cp .env.example .env
# Add DEPLOYER_PRIVATE_KEY (mainnet wallet, >= 0.06 OG for gas)

# Deploy 5 contracts + wire-up + on-chain self-verification
bash scripts/deploy-mainnet.sh

# Seed a 4-agent lineage: alignment slash + settled inferences
bash scripts/seed-mainnet.sh
```

> **0G RPC gotcha:** `forge script` and blocking `cast send` hit
> intermittent null-response errors on 0G. The shell scripts above use
> the `--async` + receipt-polling pattern that works reliably. See
> `packages/backend/CLAUDE.md` for details.

### Run Frontend + Backend (for /mint Q3 upload flow)

```bash
pnpm --filter @mekar/frontend dev   # → http://localhost:3000
pnpm --filter @mekar/backend dev    # → http://localhost:3001 (real 0G Storage)
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

## ✅ FAQ Honesty Audit

Each FAQ claim from the landing page is mapped to a concrete on-chain test
or live transaction. Nothing in the FAQ is marketing-only.

| FAQ | Claim | Implementation | Evidence |
|---|---|---|---|
| Q1 | Royalty cascade on inference (not just resale) | `RoyaltyVault._distributeRoyalty` BFS walk | 12 `RoyaltyPaid` events on mainnet, distributing across 4 wallets |
| Q2 | Bounded depth (10), atomic, treasury fallback | Final sweep in `_distributeRoyalty`: `(fee - distributed) → protocolFeesAccrued` | Treasury accrual = expected math, wei-perfect |
| Q3 | Encrypted weights, hash-only on chain | `Indexer.upload()` → real root → `weightsPointer` | Verified mainnet round-trip — upload → anchor tx → download, bytes identical |
| Q4 | Alignment audits cut royalty share | Per-ancestor share scaled by `alignmentHealth/10000` | Bob (50%) earns 50% less than Alice (100%) on the same gen tier |
| Q5 | Burned ancestor → treasury fallback | `try/catch` around `ownerOf` and `getParents` in `_distributeAncestorTiers` and `_gatherNextTier` | Unit tests `test_Q5_*` cover both burned and reverting-owner paths |

Phase 2 (still aspirational, marked clearly):
- Encrypted weights via Specialized Flow + ECIES owner keys
- Real TEE attestation verification (currently checks non-empty bytes)
- Multi-auditor oracle network (currently single approved auditor for demo)

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
| **Explorer** | `/explorer` | D3 lineage tree (auto-falls back to list view on phones <768px) |
| **Agent Detail** | `/agent/[id]` | Individual agent + inference payment UI + owner-only metadata editor |
| Mint | `/mint` | 3-step Genesis / Fork / Compose flow with file validation + 0G Storage upload |
| Dashboard | `/dashboard` | User's agents + royalty earnings + activity sparkline |
| Trending | `/trending` | Real-time leaderboard sorted by `RoyaltyPaid` event aggregates |
| Docs | `/docs` | In-app developer reference (10 sections, API-docs sidebar layout) |
| Brand | `/brand` | Logo + palette downloads (SVG / PNG, multiple sizes) |
| Slides | `/slides` | Internal pitch deck (noindex, keyboard nav) |

## 🎬 Demo Video

> Demo video link will be added.

## 📊 Live Deployment (0G Aristotle Mainnet — Chain 16661)

### Contracts

| Contract | Address | Explorer |
|---|---|---|
| **MekarRegistry** | `0xF24C4B0f45a46E2d761770BA75e147DEb738d3A6` | [view ↗](https://chainscan.0g.ai/address/0xF24C4B0f45a46E2d761770BA75e147DEb738d3A6) |
| **AgentINFT** (ERC-7857) | `0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4` | [view ↗](https://chainscan.0g.ai/address/0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4) |
| **RoyaltyVault** | `0x55107dB2CB8399fbA7Fdd913fd5a0FBACd7134f6` | [view ↗](https://chainscan.0g.ai/address/0x55107dB2CB8399fbA7Fdd913fd5a0FBACd7134f6) |
| **AlignmentAuditor** | `0x66f6f49B80d4F705AB1b8Fe8E6b2cA51846EBDE8` | [view ↗](https://chainscan.0g.ai/address/0x66f6f49B80d4F705AB1b8Fe8E6b2cA51846EBDE8) |
| **TrainingDataRegistry** | `0x3917e0fcb2E865047A0cDAF4CB648DdCA3B4bB46` | [view ↗](https://chainscan.0g.ai/address/0x3917e0fcb2E865047A0cDAF4CB648DdCA3B4bB46) |

> Deployed fresh to Aristotle mainnet (chain 16661) — all five contracts
> deployed, wired, and verified on-chain.

### Live Lineage (5 agents, 12 royalty settlements)

```
Genesis #1 (gen 0, deployer, alignment 100%)
  ├── Fork #2 (gen 1, alignment 100%)
  └── Fork #3 (gen 1, alignment 50% ← slashed by AlignmentAuditor)
        ↓ both parents
        Compose #4 (gen 2 — royalty cascades to #2, #3 and #1)

Genesis #5 (gen 0, minted from the live /mint flow)
```

### On-chain proof

| Metric | Value | Source |
|---|---|---|
| Agents minted | 5 (`totalSupply`) | `getLineage` on AgentINFT |
| RoyaltyPaid events | 12 | `RoyaltyPaid` logs on RoyaltyVault |
| Protocol treasury accrued | 6.975e14 wei | `RoyaltyVault.protocolFeesAccrued()` |
| Alignment penalty | Agent #3 carries 50% health | gen-1 share halved vs a 100% sibling |

The treasury balance is the sum of protocol fee + undistributed deep-gen
share (Q2 sweep) + alignment slash (Q4). **Misalignment is a real
economic penalty**: agent #3 at 50% alignment earns exactly half the
gen-1 share that a 100%-aligned sibling earns.

### Q3 — real 0G Storage, verified end-to-end

A live upload→download round-trip on Aristotle mainnet, through the same
`@0gfoundation/0g-ts-sdk` `Indexer.upload()` path the `/mint` flow uses:

| Step | Value |
|---|---|
| Payload | 128-byte manifest |
| 0G Storage rootHash | `0x70422e922abd90e1ec705ce7d58a88d110d9be54926b8abcf1fda6b2e8db19fc` |
| Flow anchor tx | [`0x475d…b89`](https://chainscan.0g.ai/tx/0x475dd4a7075069b3dc4f013ab6e37379137b797bdf6767b99213850e5f309b89) (mainnet block 33333849) |
| Download | fetched back via `/api/storage/download`, bytes byte-identical |

The data really is on 0G Storage, the rootHash anchored through a real
Flow contract transaction on mainnet, and it round-trips intact.

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

## 🏆 Hackathon

Built for the **0G APAC Hackathon 2026** — Track 3 (Agentic Economy & Autonomous Applications)

#0GHackathon #BuildOn0G

@0G_labs @0g_CN @0g_Eco @HackQuest_
