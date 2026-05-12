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
| Substantial commits during hackathon | ✅ (30+ commits, multi-day iteration) |
| **0G testnet contract addresses** | ✅ Galileo (16602) — 5 contracts, all verified |
| **0G Explorer with verifiable on-chain activity** | ✅ 5 agents × 4 wallets, 14 inferences settled |
| **0G component integration proof** | ✅ Chain + ERC-7857 + Storage (real upload) + Alignment |
| README + architecture | ✅ |
| Demo video ≤ 3 min | ⏳ |
| Public X post + hashtags + tags | ⏳ |

---

## 📍 Contract Addresses (0G Galileo Testnet — Chain 16602)

> v2 deployment with Q2/Q4/Q5 honesty fixes (replaces earlier v1 attempt).

```
AgentINFT (ERC-7857):  0x2B429feAe5d2732fF126F964D5786C0c51A844f3
MekarRegistry:         0x5466826BdFcc7f26F03D1E43bAA40E43d7700f92
RoyaltyVault:          0x49eCE891AeA76aad967A83B53DC160328036BABc
AlignmentAuditor:      0x4C399b1f2DBD4028d39E21A512E90930375910eB
TrainingDataRegistry:  0xdBE4397f3e4CCafDA7bfbeD264448577249513e8
```

**Explorer:** https://chainscan-galileo.0g.ai

---

## 🔌 0G Components Integrated (live vs Phase 2)

| Component | Status | Evidence |
|---|---|---|
| **0G Chain (Galileo 16602)** | ✅ Live | 5 contracts deployed + wired, 14 settled inferences |
| **INFT (ERC-7857)** | ✅ Live | `AgentINFT.sol` mint/fork/compose flows, on-chain `tokenURI` returns base64 JSON |
| **0G Storage (Log tier)** | ✅ Live | Real `Indexer.upload()` via `@0gfoundation/0g-ts-sdk` — agent #5 minted with actual rootHash anchored on the Flow contract |
| **Alignment Nodes** | ✅ Live (single-auditor demo) | `AlignmentAuditor.flagAgent` lowered agent #3 to 50% → ancestor share scales accordingly |
| **0G Storage (Specialized Flow + ECIES)** | 🟡 Phase 2 | Pointer plumbing in place; encryption layer is next |
| **0G Compute (TEE inference)** | 🟡 Phase 2 | Backend stub wires `@0glabs/0g-serving-broker` shape; needs broker account |
| **Data Serving Network** | 🟡 Phase 2 | Provider registry + escrow flow built; auto-billing → spec hook |

---

## 🌳 Live Lineage on Galileo

```
  Genesis #1 (gen 0, deployer, alignment 100%)
    ├── Fork #2 (gen 1, alice, alignment 100%)
    └── Fork #3 (gen 1, bob, alignment 50% ← slashed by AlignmentAuditor)
          ↓ both parents
          Compose #4 (gen 2, carol)
                ↓
            3 inferences settled — cascade across 4 wallets

  Genesis #5 (gen 0, deployer)
    weightsPointer = real 0G Storage root anchored via Indexer.upload()
    3 inferences settled (incl. recovered escrow)
```

**5 agents across 4 distinct wallets** (deployer + 3 ephemeral test wallets
funded from faucet). Cascade demos work across single-parent (`#2`, `#3`),
multi-parent compose (`#4`), and genesis-only (`#5`) shapes.

---

## 💰 Royalty Cascade — Verified Math

**14 inference settlements across the lineage.** Treasury accrual matches the
expected mechanic to the **wei**, verified across three independent rounds.

| Round | Settlements | Treasury delta | Expected (math) | Match |
|---|---:|---:|---:|---|
| Initial seed (against #4) | 3 | 6.975e14 wei | 6.975e14 | ✅ exact |
| Top-up (against #2, #3, #5) | 10 | +3.0e15 wei | 3.0e15 | ✅ exact |
| Stuck-escrow recovery (against #5) | 1 | +5.7e14 wei | 5.7e14 | ✅ exact |
| **Total accrued** | **14** | **4.9675e15 wei** | — | ✅ |

Royalty default schema (per inference base):

| Recipient | Generation | Share |
|---|---|---|
| Direct owner | 0 | 50% |
| Parents | 1 | 25% (split equally) |
| Grandparents | 2 | 15% (deduplicated) |
| Gen 3+ | 3+ | 7% (deduplicated, capped at depth 10) |
| Training contributors | — | 3% |
| Protocol fee | — | +10% on top |
| Compute provider | — | +10% on top |

**Push-based distribution** — recipients receive OG **automatically** at settle
time, no claim button. Alice's wallet went from 5e15 (faucet seed) to 4.94e15
(after spending ~1e15 on mint gas and receiving ~1e15 in royalty) without
ever calling a `claim` function.

---

## ✅ FAQ Honesty Audit

Each landing-page FAQ claim is mapped to its implementation + on-chain
evidence. No marketing-only language.

| FAQ | Claim | Where it lives | Evidence |
|---|---|---|---|
| Q1 | Royalty cascade on inference | `RoyaltyVault._distributeRoyalty` BFS walk | 14 settlements paying out to 4 wallets |
| Q2 | Bounded depth (10), atomic, treasury fallback | Final sweep `(fee - distributed) → protocolFeesAccrued` | Treasury growth = expected math, wei-perfect |
| Q3 | Encrypted weights, hash-only on chain | `Indexer.upload()` → rootHash → `weightsPointer` | Agent #5 mint + anchor tx (see below) |
| Q4 | Alignment audits cut royalty share | Per-ancestor share scaled by `alignmentHealth/10000` | Bob (50%) earns half of Alice (100%) on gen-1 tier |
| Q5 | Burned ancestor → treasury fallback | `try/catch` on `ownerOf` + `getParents` | Unit tests `test_Q5_SettleSurvives_*` + push fallback in `_safeTransfer` |

### Sample on-chain proof (Q3 loop)

| Step | Tx |
|---|---|
| 0G Flow anchor (upload) | [`0x973f...34b2`](https://chainscan-galileo.0g.ai/tx/0x973ff6949b0289b197351587d439b393e39891a58a613e8701e798be2e1134b2) |
| INFT mint #5 | [`0xfe01...709c`](https://chainscan-galileo.0g.ai/tx/0xfe012939690e97c13cbeb734be0c0edb59b5f7db956f3c66d357e3f8d321709c) |
| `getLineage(5).weightsPointer` | `0xd056682f7056b0d15309101fd3f98d8051dfd6b4cff3cd739be6bc7a70075fc8` |

The on-chain pointer **matches the rootHash returned by 0G Storage to the
byte** — the data really is anchored, the contract really references it.

### Sample on-chain proof (Q1+Q2+Q4+Q5)

Stuck-escrow recovery via `settleInference` —
[`0xe999...96bb`](https://chainscan-galileo.0g.ai/tx/0xe99986c000a6f81c3aabe70c843907c0b587f559bb279f9e1c021892a01d96bb).
This single tx demonstrates: BFS cascade across genesis-only lineage (Q1),
Q2 sweep into treasury for missing generations (`5.7e14` wei accrued), and
the push-based `_safeTransfer` pattern that would fall back to treasury if
the recipient were burned (Q5).

---

## 📦 Repository

```
mekar/
├── packages/
│   ├── contracts/    # Solidity 0.8.24 + Foundry (5 contracts, 33 tests)
│   ├── frontend/     # Next.js 15 + wagmi v2 + D3 (landing/explorer/mint/dashboard)
│   └── backend/      # Express + @0gfoundation/0g-ts-sdk (real Storage uploads)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOY_GUIDE.md
│   ├── HACKATHON_SUBMISSION.md ← this file
│   ├── HACKQUEST_FORM.md
│   ├── DEMO_VIDEO_SCRIPT.md
│   └── X_POST_DRAFT.md
└── scripts/
    ├── deploy-v2-fix.sh        # verified-code re-deploy (Galileo RPC quirk safe)
    └── multi-wallet-seed.sh    # generates 3 fresh wallets + e2e cascade demo
```

**Test coverage:** **33/33 forge unit tests passing**, including Q2/Q4/Q5 fix
coverage:

- `test_Q5_SettleSurvives_BurnedAncestor`
- `test_Q5_SettleSurvives_RevertingOwner` (treasury fallback for unrecoverable owner)
- `test_Q2_UndistributedClosesToProtocol` (deep-gen consolidation)
- `test_Q4_AncestorShareScalesByAlignment` (50% align → 50% of slot)
- `test_AlignmentAuditor_OnlyApprovedCanFlag` (auditor allowlist)

---

## 🎯 Why MEKAR Matters (One Paragraph)

AI today looks like the music industry in 1999 — no copyright rail. NYT vs
OpenAI ($7.5B claim), Getty vs Stability ($1.7B), EU AI Act enforcement
begins May 2026. Open-source AI is dying without a royalty rail (Stability
AI bankrupt). MEKAR is the **missing royalty rail** — built natively on
0G's INFT (ERC-7857) primitive, which no other chain has. Every AI agent
has a verifiable lineage, every inference automatically pays its ancestors,
and alignment is audited by Alignment Nodes that produce real economic
penalty (verified on-chain). EU AI Act compliance + AI creator economy
in a single protocol, atomic per inference.

---

## 🔗 Links

- **Live demo:** [https://mekar.vercel.app](https://mekar.vercel.app)
  - Explorer: https://mekar.vercel.app/explorer (D3 lineage tree, 5 agents)
  - Agent #4 (composed): https://mekar.vercel.app/agent/4
  - Mint flow: https://mekar.vercel.app/mint (real 0G Storage upload in Step 2)
- **Repo:** github.com/PugarHuda/mekar
- **Demo video:** (recording)
- **X post:** (publishing)

---

## 🚀 Live Verification Path (for judges)

Reviewers can verify the project's claims in **3 steps**:

1. **Visit** https://mekar.vercel.app/explorer — see the 5-agent lineage tree
   with bloom previews, names, and focus phrases for each agent.
2. **Click any bloom** → slideover shows owner address, alignment health
   (note bob's #3 at 50%), and parent links. Try the **/mint flow** and
   upload a tiny file in Step 2 — the rootHash that comes back is real, gas
   really gets paid to anchor it on the Flow contract, and you can mint with
   that pointer.
3. **Cross-reference**
   [chainscan-galileo.0g.ai/address/0x2B429feAe5d2732fF126F964D5786C0c51A844f3](https://chainscan-galileo.0g.ai/address/0x2B429feAe5d2732fF126F964D5786C0c51A844f3)
   to see all mint + settlement transactions. The `RoyaltyVault`
   [`0x49eC...BABc`](https://chainscan-galileo.0g.ai/address/0x49eCE891AeA76aad967A83B53DC160328036BABc)
   has 14 `RoyaltyPaid` events and a `protocolFeesAccrued` that matches
   the FAQ math wei-for-wei.

---

## #0GHackathon #BuildOn0G

@0G_labs @0g_CN @0g_Eco @HackQuest_
