# HackQuest Submission — Copy-Paste Ready

Every field below maps to the official HackQuest submission form for the 0G APAC Hackathon (Track 3).

---

## Project Name
```
MEKAR
```

## One-Sentence Description (≤30 words)
```
Spotify-style royalty for AI agents on 0G — every agent has a verifiable on-chain lineage; every inference automatically pays parents, grandparents, and training data contributors.
```
(28 words)

## Short Summary

### What does the project do?
```
MEKAR turns every AI agent into an INFT (ERC-7857) that records its full genealogy on the 0G blockchain — parent agents, training data Merkle roots, and TEE training attestations. When the agent is invoked, an on-chain RoyaltyVault walks the lineage tree and atomically distributes inference fees to all ancestors in a single transaction: 50% to the direct owner, 25% split among generation-1 parents, 15% to grandparents, 7% to deeper ancestors, and 3% to original training data contributors. Multi-path ancestors (common in compose/merge agents) are deduplicated so they're paid once, not once per path.
```

### What problem does it solve?
```
The AI industry is in a provenance crisis. NYT vs OpenAI ($7.5B), Getty vs Stability ($1.7B), 10K artists vs Midjourney, EU AI Act enforcement starting May 2026 — and no infrastructure to attribute or compensate AI creators when their work is used downstream. Open-source AI is economically unsustainable (Stability AI bankrupt 2024). MEKAR provides the missing royalty rail: a cryptographic, automatic, on-chain answer that turns derivative AI into a Spotify-like creator economy.
```

### Which 0G components are used?
```
LIVE (real integration, verified on-chain):
1. 0G Chain (Galileo testnet, chain 16602) — 5 smart contracts deployed
2. INFT / ERC-7857 — AgentINFT extends with mint/fork/compose composition
3. 0G Storage Log — real Indexer.upload() via @0gfoundation/0g-ts-sdk;
   the rootHash returned is anchored as `weightsPointer` on chain (Q3)
4. Alignment Nodes — AlignmentAuditor contract; score directly scales
   ancestor royalty share, slashing is a real economic penalty (Q4)

PHASE 2 (plumbing in place, real wiring next):
5. 0G Storage Specialized Flow — premium permanence + ECIES encryption
6. 0G Compute (TEE) — backend stub uses @0glabs/0g-serving-broker shape
7. Data Serving Network — provider registry + escrow built, auto-billing next
```

---

## Code Repository
```
https://github.com/PugarHuda/mekar
```

The repo includes:
- `packages/contracts/` — 5 Solidity contracts + 33 Foundry tests, all passing
- `packages/frontend/` — Next.js 15 dApp with lineage explorer, mint flow, dashboard
- `packages/backend/` — Express service wrapping 0G Storage SDK (real upload)
- `docs/` — architecture, deploy guide, demo script, hackathon submission notes
- `scripts/deploy-v2-fix.sh` — verified-code re-deploy (Galileo RPC-quirk safe)
- `scripts/multi-wallet-seed.sh` — generates 3 fresh wallets + end-to-end cascade demo

30+ commits during the hackathon period, multi-day iteration covering contract
hardening (Q2/Q4/Q5 fixes), real 0G Storage integration, multi-wallet seeding,
and frontend UX (D3 explorer, parent picker, dashboard).

---

## 0G Integration Proof

### Contract Addresses
> Deployed to **0G Aristotle Mainnet (chain 16661)** — the active network.
> All five contracts deployed fresh + wired + verified.
> (Galileo testnet deployment also exists, used during development.)

```
AgentINFT (ERC-7857):  0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4
MekarRegistry:         0xF24C4B0f45a46E2d761770BA75e147DEb738d3A6
RoyaltyVault:          0x465291f35A3DC723B81349CBeBB296Cbf57AAAa3
AlignmentAuditor:      0x66f6f49B80d4F705AB1b8Fe8E6b2cA51846EBDE8
TrainingDataRegistry:  0x3917e0fcb2E865047A0cDAF4CB648DdCA3B4bB46
```

### 0G Explorer Links (Aristotle Mainnet)
```
AgentINFT (ERC-7857 INFT — mint/fork/compose):
https://chainscan.0g.ai/address/0x0e8e941c363dc1C06DD0bC02395B775dE94B48a4

MekarRegistry (lineage graph + metadata):
https://chainscan.0g.ai/address/0xF24C4B0f45a46E2d761770BA75e147DEb738d3A6

RoyaltyVault (atomic royalty cascade + treasury sweep):
https://chainscan.0g.ai/address/0x465291f35A3DC723B81349CBeBB296Cbf57AAAa3

AlignmentAuditor (alignment-weighted royalty slashing):
https://chainscan.0g.ai/address/0x66f6f49B80d4F705AB1b8Fe8E6b2cA51846EBDE8

TrainingDataRegistry (Merkle root anchor for training data):
https://chainscan.0g.ai/address/0x3917e0fcb2E865047A0cDAF4CB648DdCA3B4bB46
```

### Components Integrated (with honesty audit)
```
✓ 0G Chain — 5 contracts deployed, wired, and exercised
✓ 0G Storage Log — REAL Indexer.upload() with on-chain rootHash anchor (Q3 live)
✓ INFT / ERC-7857 — composition primitive (mint/fork/compose) all working
✓ Alignment Auditor — score affects royalty distribution (Q4 live)
✓ Royalty cascade — 14 settlements with wei-perfect math (Q1 + Q2 sweep)
✓ Burned-ancestor safety — try/catch fallback to treasury (Q5)

🟡 0G Storage Specialized Flow + ECIES encryption — Phase 2
🟡 0G Compute (TEE sealed inference) — backend stub, broker account next
🟡 Multi-auditor oracle network — single-auditor for demo
```

---

## Demo Video
```
[YOUTUBE URL — fill in after recording]
```
- Length: ≤3 minutes
- Shows: lineage explorer, live inference payment, on-chain royalty distribution events on chainscan, full architecture overview

---

## README / Documentation
```
https://github.com/PugarHuda/mekar#readme
```

The README includes:
- Project overview + problem statement
- 4-section architecture diagram
- 0G modules used (with explanations)
- Live deployment addresses + explorer links
- Lineage example with 4 seeded agents
- Royalty distribution math worked example
- 5-layer anti-wrapping defense
- Reproduction steps for judges
- Test account / faucet instructions

Additional docs in `/docs/`:
- `ARCHITECTURE.md` — full system + data flow
- `DEPLOY_GUIDE.md` — step-by-step reproduction
- `HACKATHON_SUBMISSION.md` — submission notes

---

## Public X Post
```
[X POST URL — fill in after publishing]
```

Post includes:
- ✓ Project name (MEKAR)
- ✓ Demo screenshot / clip
- ✓ Hashtags `#0GHackathon` `#BuildOn0G`
- ✓ Tags `@0G_labs` `@0g_CN` `@0g_Eco` `@HackQuest_`

---

## Optional Bonus Materials

### Frontend Demo Link
```
https://mekar.vercel.app
```

Direct paths to highlight:
```
https://mekar.vercel.app/explorer       — lineage tree visualization
https://mekar.vercel.app/agent/4        — composed agent + inference UI
https://mekar.vercel.app/dashboard      — user's earnings (My Garden)
https://mekar.vercel.app/mint           — Genesis / Fork / Compose flows
```

### Pitch Deck
```
[PITCH DECK URL — optional, fill in if recorded]
```

### Tutorial / Technical Write-Up
The `docs/ARCHITECTURE.md` doubles as a technical write-up showing how 0G integration works — lineage data flow, royalty math, multi-path deduplication, anti-wrapping defense layers.

---

## Track Selection
```
Track 3: Agentic Economy & Autonomous Applications
```

**Why Track 3?**
The track description explicitly calls for:
- Financial Rails (revenue-sharing, automated billing) — MEKAR's core flow
- AI Commerce (AI-driven marketplaces, Agent-as-a-Service platforms) — every agent is a payable service
- Operational Tools (DAO infrastructure for AI) — multi-tier governance ready

MEKAR is a literal embodiment of all three sub-directions in Track 3.

---

## Team
```
Solo builder
```

---

## Why MEKAR Should Win

```
1. ZEITGEIST FIT: AI lawsuits + EU AI Act enforcement = perfect 2026 timing
2. NATIVE 0G EXPLOIT: Uses ERC-7857 (0G's flagship innovation) as a genuine
   composition primitive — not an identity badge
3. WHITE SPACE: No comparable project across the entire 0G ecosystem
4. LIVE PROOF: 5 agents across 4 wallets, 14 inference settlements, alignment
   slashing demonstrated on-chain (bob 50% earns half of alice 100%) — all
   verifiable on Galileo right now
5. HONEST AUDIT: every landing-page FAQ claim maps to a code path + on-chain
   tx hash; treasury math is wei-perfect across three independent rounds
6. PRODUCTION POLISH: Vercel deploy + OG image + responsive design + 33 unit
   tests + real 0G Storage upload + multi-wallet demo script
7. FOUNDATION DARLING: ERC-7857 was announced by 0G; MEKAR is the literal use
   case the announcement described — and one of the first projects to wire
   the storage Indexer.upload SDK end-to-end with actual on-chain anchors
8. PUBLIC GOOD: addresses creator economy + EU compliance — aligns with 0G's
   "AI as public good" mission
```
