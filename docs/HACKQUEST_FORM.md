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
1. 0G Chain (Galileo testnet, chain 16602) — all 4 smart contracts deployed
2. INFT / ERC-7857 — flagship 0G innovation; AgentINFT.sol extends it for composition
3. 0G Storage Specialized Flow — encrypted weights pointer + training data Merkle root
4. 0G Storage Log Layer — permanent genealogy event log
5. 0G Compute (TEE) — sealed inference + training attestations
6. Alignment Nodes — lineage health audit hook (updateAlignmentHealth)
7. Data Serving Network — provider registry + auto-billing settlement flow
```

---

## Code Repository
```
[GITHUB URL — fill in after `git init` + first push]
```

The repo includes:
- `packages/contracts/` — 4 Solidity contracts + 25 Foundry tests, 100% passing
- `packages/frontend/` — Next.js 15 dApp with lineage explorer and inference UI
- `packages/backend/` — Express service wrapping 0G Storage and Compute SDKs
- `docs/` — architecture, deploy guide, demo script, hackathon submission notes
- `scripts/seed-galileo.sh` — reproducible end-to-end seeding script

Substantial commits during the hackathon period (every contract, page, and integration was authored during the event).

---

## 0G Integration Proof

### Mainnet Contract Address
> Note: deployed to **0G Galileo Testnet (chain 16602)** as the active demo network. Mainnet (Aristotle, chain 16661) deployment ready, pending audit.

```
TrainingDataRegistry: 0xdBE4397f3e4CCafDA7bfbeD264448577249513e8
AgentINFT (ERC-7857): 0xA00A7641FEE39753fFdd1cECA5b73336a68699e3
MekarRegistry:        0x66b2F33bF34081b48046e713457fa3912363E779
RoyaltyVault:         0x1D62B1D60375D325C3362073e12806A7DF20FBDa
```

### 0G Explorer Links Showing On-Chain Activity
```
AgentINFT (4 agents minted):
https://chainscan-galileo.0g.ai/address/0xA00A7641FEE39753fFdd1cECA5b73336a68699e3

RoyaltyVault (3 inference settlements with full distribution):
https://chainscan-galileo.0g.ai/address/0x1D62B1D60375D325C3362073e12806A7DF20FBDa

Sample settlement tx (4 RoyaltyPaid events in one transaction):
https://chainscan-galileo.0g.ai/tx/0xd4c01777f7908c7b175e1720eab800e32d5f16aab44fe0543c4cb8974a451d3b
```

### Components Integrated
```
✓ 0G Chain (smart contract deployment + interaction)
✓ 0G Storage (Specialized Flow + Log Layer references)
✓ 0G Compute (TEE attestation field on every mint and settlement)
✓ INFT / ERC-7857 (AgentINFT extends with composition primitive)
✓ Privacy / TEE features (sealed inference architecture, attestation hash on-chain)
✓ Alignment Nodes (health score hook)
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
[GITHUB README URL]
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
2. NATIVE 0G EXPLOIT: Uses ERC-7857 (0G's flagship innovation) as a genuine composition primitive — not an identity badge
3. WHITE SPACE: No comparable project across the entire 0G ecosystem
4. LIVE PROOF: 4 agents minted, 3 inference settlements, all verifiable on Galileo testnet right now
5. PRODUCTION POLISH: deployed to Vercel, OG image + sitemap + responsive design + 25 unit tests passing
6. FOUNDATION DARLING: ERC-7857 was announced by 0G; MEKAR is the literal use case the announcement described
7. PUBLIC GOOD: addresses creator economy + EU compliance — aligns with 0G's "AI as public good" mission
```
