# 🌳 MEKAR

[![CI](https://github.com/PugarHuda/mekar/actions/workflows/ci.yml/badge.svg)](https://github.com/PugarHuda/mekar/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/live-mekar.vercel.app-d4a437)](https://mekar.vercel.app)
[![Tests](https://img.shields.io/badge/tests-56%20passing-1c3b2f)](packages/contracts/test/)
[![Network](https://img.shields.io/badge/0G-Galileo%20Testnet%2016602-1c3b2f)](https://chainscan-galileo.0g.ai/address/0x2B429feAe5d2732fF126F964D5786C0c51A844f3)

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
| **0G Chain** (16602) | 5 smart contracts deployed on Galileo testnet | ✅ Live |
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

# Deploy 4 contracts + wire-up + write addresses to env
bash scripts/deploy-v2-fix.sh

# Multi-wallet seed: 3 fresh wallets, 4-agent lineage, alignment slash, 3 inferences
bash scripts/multi-wallet-seed.sh
```

> **Galileo gotcha:** `forge script` and `cast send` (blocking) hit
> intermittent null-response errors. The shell scripts above use the
> `--async` + receipt-polling pattern that works reliably. See
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
| Q1 | Royalty cascade on inference (not just resale) | `RoyaltyVault._distributeRoyalty` BFS walk | 14 settlements distributing across 4 wallets |
| Q2 | Bounded depth (10), atomic, treasury fallback | Final sweep in `_distributeRoyalty`: `(fee - distributed) → protocolFeesAccrued` | Treasury accrual = expected math, wei-perfect |
| Q3 | Encrypted weights, hash-only on chain | `Indexer.upload()` → real root → `weightsPointer` | Agent #5 — anchor tx + on-chain pointer match |
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

## 📊 Live Deployment (0G Galileo Testnet — Chain 16602)

### Contracts (v2 — with Q2/Q4/Q5 fixes)

| Contract | Address | Explorer |
|---|---|---|
| **MekarRegistry** | `0x5466826BdFcc7f26F03D1E43bAA40E43d7700f92` | [view ↗](https://chainscan-galileo.0g.ai/address/0x5466826BdFcc7f26F03D1E43bAA40E43d7700f92) |
| **AgentINFT** (ERC-7857) | `0x2B429feAe5d2732fF126F964D5786C0c51A844f3` | [view ↗](https://chainscan-galileo.0g.ai/address/0x2B429feAe5d2732fF126F964D5786C0c51A844f3) |
| **RoyaltyVault** | `0x49eCE891AeA76aad967A83B53DC160328036BABc` | [view ↗](https://chainscan-galileo.0g.ai/address/0x49eCE891AeA76aad967A83B53DC160328036BABc) |
| **AlignmentAuditor** | `0x4C399b1f2DBD4028d39E21A512E90930375910eB` | [view ↗](https://chainscan-galileo.0g.ai/address/0x4C399b1f2DBD4028d39E21A512E90930375910eB) |
| **TrainingDataRegistry** | `0xdBE4397f3e4CCafDA7bfbeD264448577249513e8` | [view ↗](https://chainscan-galileo.0g.ai/address/0xdBE4397f3e4CCafDA7bfbeD264448577249513e8) |

### Live Lineage (5 Agents across 4 Wallets, 14 Inferences Settled)

```
Genesis #1 (gen 0, deployer, alignment 100%)
  ├── Fork #2 (gen 1, alice, alignment 100%)
  └── Fork #3 (gen 1, bob, alignment 50% ← slashed by AlignmentAuditor)
        ↓ both parents
        Compose #4 (gen 2, carol)
                ↓
            3 inferences settled — cascade flows to all 4 wallets

Genesis #5 (gen 0, deployer)
  - weightsPointer = real 0G Storage Merkle root anchored via Indexer.upload()
  - 3 inferences settled (incl. one recovered from a stuck escrow)
```

### On-chain proof

| Round | Settlements | Treasury accrued | Math match |
|---|---:|---:|---|
| Multi-wallet seed (#4) | 3 | 6.975e14 wei | ✅ exact wei |
| Top-up rounds (#2, #3, #5) | 10 | +3e15 wei | ✅ exact wei |
| Stuck-escrow recovery | 1 | +5.7e14 wei | ✅ exact wei |
| **Total** | **14** | **4.9675e15 wei** | ✅ |

Treasury delta consistently matches the FAQ claim: protocol fee + Q2 sweep
(undistributed deep-gen) + Q4 alignment slash → all consolidate into the
treasury. **Misalignment is a real economic penalty**: bob (50% align)
gets exactly half the gen-1 share alice (100%) gets when their forks are
referenced as ancestors.

Sample settlement tx: [`0xe999...96bb`](https://chainscan-galileo.0g.ai/tx/0xe99986c000a6f81c3aabe70c843907c0b587f559bb279f9e1c021892a01d96bb)
(stuck-escrow recovery, also doubles as a clean Q5 fallback example).

Q3 evidence — Agent #5 was minted with a real 0G Storage root anchored
through the SDK:

| Step | Tx |
|---|---|
| 0G Flow anchor | [`0x973f...34b2`](https://chainscan-galileo.0g.ai/tx/0x973ff6949b0289b197351587d439b393e39891a58a613e8701e798be2e1134b2) |
| INFT mint | [`0xfe01...709c`](https://chainscan-galileo.0g.ai/tx/0xfe012939690e97c13cbeb734be0c0edb59b5f7db956f3c66d357e3f8d321709c) |
| `getLineage(5).weightsPointer` | `0xd056682f7056b0d15309101fd3f98d8051dfd6b4cff3cd739be6bc7a70075fc8` |

The pointer on chain matches the rootHash returned by the storage upload
to the byte — the data really is on 0G Storage, the contract really
references it.

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

## 🏆 Hackathon

Built for the **0G APAC Hackathon 2026** — Track 3 (Agentic Economy & Autonomous Applications)

#0GHackathon #BuildOn0G

@0G_labs @0g_CN @0g_Eco @HackQuest_
