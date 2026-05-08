# MEKAR — Project Memory for Claude Code

> AI Genealogy & Royalty Protocol on 0G — built for the 0G APAC Hackathon

## Overview

MEKAR is **Spotify-style royalty for AI agents**. Every AI agent registered as an INFT (ERC-7857) gets a verifiable on-chain lineage tree. When the agent is used, royalty automatically flows back to ancestors (parents, grandparents, training data contributors).

**Tagline:** *Every AI has a lineage. Every inference pays its ancestors.*

**Track:** 3 (Agentic Economy & Autonomous Applications)

## Why this exists

- The AI industry has no royalty rail (creators are not paid for derivatives)
- The EU AI Act 2026 mandates training data provenance
- Lawsuit chaos (NYT vs OpenAI, Getty vs Stability, etc.)
- Open source AI is dying without economic sustainability (Stability AI bankrupt)

MEKAR is the missing infrastructure — analogous to how Spotify saved the music industry from the post-Napster era.

## Architecture (High-Level)

```
USER LAYER
├── Creator Dashboard      (mint genesis, configure royalty)
├── Fine-tuner Studio      (fork existing INFTs)
└── End User UI            (use agent, pay inference fee)

PROTOCOL LAYER  (5 contracts shipped)
├── MekarRegistry.sol      (master registry, lineage graph)
├── AgentINFT.sol          (ERC-7857 + mintGenesis/Fork/Compose, alignment field)
├── RoyaltyVault.sol       (BFS distribution, alignment-weighted, treasury sweep)
├── TrainingDataRegistry   (Merkle root anchoring + contributor splits)
└── AlignmentAuditor.sol   (allowlist-gated proxy that pushes alignment scores)

0G INFRASTRUCTURE
├── 0G Chain (16602/16661) (smart contracts)
├── 0G Storage Log         (genealogy events, training data hashes)
├── 0G Storage KV          (mutable metadata)
├── 0G Specialized Flow    (encrypted weights — premium tier)
├── 0G Compute (TEE)       (sealed inference + training attestation)
├── 0G Data Serving        (auto-billing for inference)
└── Alignment Nodes        (drift/bias monitoring)
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Smart Contracts | Solidity 0.8.24 + Foundry + OpenZeppelin |
| Frontend | Next.js 15 + TypeScript + Tailwind + shadcn/ui + wagmi v2 + viem + RainbowKit + D3.js |
| Backend | Node.js 20 + TypeScript + Express |
| 0G SDKs | `@0gfoundation/0g-ts-sdk`, `@0glabs/0g-serving-broker` |
| Test | Foundry (forge test) |
| Deploy | Vercel (frontend), Railway (backend) |

## Repository Structure

```
mekar/
├── packages/
│   ├── contracts/          # Solidity smart contracts (Foundry)
│   ├── frontend/           # Next.js app
│   └── backend/            # API service for 0G SDK ops
├── docs/                   # Architecture, design notes, demo plan
├── scripts/                # Deploy, seed, demo helpers
├── 0g-whitepaper.pdf       # Reference (Sept 2025)
├── package.json            # Root workspace config
├── pnpm-workspace.yaml
└── CLAUDE.md               # This file
```

## Key Decisions Made (so far)

1. **Track 3 chosen** — literal match with the official track description (revenue-sharing, AI marketplace, Agent-as-a-Service)
2. **Foundry over Hardhat** — faster, native fuzz testing, more popular in Web3 dev community
3. **Galileo testnet first**, then Aristotle mainnet
4. **No custom token** — use $0G for inference fees
5. **Tier-based participation:**
   - Tier 1 (Strict): encrypted weights, INFT registration enforced via TEE
   - Tier 2 (Voluntary): open weights, license-based attribution
   - Tier 3 (Audit-only): wrap existing models, no royalty
6. **5-layer wrapping defense:** TEE attestation → weight delta → behavioral fingerprint → challenge period → reputation

## 0G Galileo Testnet Configuration

```
Chain Name:   0G-Galileo-Testnet
Chain ID:     16602
RPC:          https://evmrpc-testnet.0g.ai
Explorer:     https://chainscan-galileo.0g.ai
Storage:      https://indexer-storage-testnet-turbo.0g.ai
Faucet:       https://faucet.0g.ai
Gas Token:    0G
EVM Version:  cancun (required by 0G)

System Contracts:
  Flow:       0x22E03a6A89B950F1c82ec5e74F8eCa321a105296
  Mine:       0x00A9E9604b0538e06b268Fb297Df333337f9593b
  Reward:     0xA97B57b4BdFEA2D0a25e535bd849ad4e6C440A69
```

## Royalty Schema (Default)

```
Inference fee distribution:
  Direct owner          50%
  Generation 1 parents  25% (split equally)
  Generation 2          15%
  Generation 3+          7%
  Training contributors  3%
  ──────────────────────
  Total                100%

  Plus:
  Compute provider fee  +10% on top
  MEKAR protocol fee    +10% on top
```

Configurable per genesis agent at mint time.

## Submission Requirements (Hackathon)

- [x] Project info + 30-word description
- [x] Public GitHub repo with substantial commits
- [x] 0G testnet contract addresses + Explorer links
- [ ] Demo video ≤ 3 minutes (YouTube)
- [x] README with architecture, modules, deploy steps
- [ ] Public X post with #0GHackathon #BuildOn0G + tags

## How to Run

```bash
# Install
pnpm install

# Compile contracts
cd packages/contracts && forge build

# Run tests (33 tests, all passing — includes Q2/Q4/Q5 fix coverage)
forge test

# Deploy to 0G Galileo (foundry's chain detection breaks on 16602; use shell)
bash scripts/deploy-v2-fix.sh

# Multi-wallet seed — generates 3 fresh wallets, funds them, mints a 4-agent
# lineage, slashes one with AlignmentAuditor, runs 3 settle inferences
bash scripts/multi-wallet-seed.sh

# Run frontend
pnpm --filter @mekar/frontend dev

# Run backend (required for real 0G Storage uploads from /mint)
pnpm --filter @mekar/backend dev
```

## Conventions

- **Language:** Code, comments, and documentation in English.
- **Commits:** Conventional commits (feat/fix/docs/chore)
- **Solidity:** Solidity 0.8.24, OpenZeppelin 5.x, NatSpec comments
- **TypeScript:** Strict mode, ESM

## Whitepaper References

The whitepaper is used to justify 0G primitive choices:
- **Section 2:** Multi-consensus shared staking → enables infinite scale
- **Section 3:** 3-layer storage (Log + KV + Transaction Processing) → tiering strategy
- **Section 4-5:** PoRA mining → backbone of the Storage layer
- **Data Serving Network** (mentioned p.5) → service registration + auto-billing

## Active Hackathon Context

- **Submission deadline:** May 16, 2026 23:59 UTC+8
- **Total prize pool:** $150K
- **Target prize tier:** Top 3 ($20K-$45K) or Excellence ($3.7K)
- **APAC focus:** Indonesian creator economy + EU AI Act compliance
- **Live deployment:** https://mekar.vercel.app
