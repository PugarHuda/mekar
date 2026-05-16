# Mainnet Funding Estimate — Mekar on 0G Aristotle

> How much real `$0G` should the deployer wallet hold before switching
> from Galileo testnet to Aristotle mainnet?

This document quantifies the real-`$0G` exposure for each operational
path so the team can fund the deployer wallet with a defensible
buffer instead of guessing.

---

## 1. Constants & assumptions

All numbers are derived from the gas budgets verified on Galileo
testnet (`forge test --gas-report`) — same EVM, same opcodes, same
gas costs apply on Aristotle.

| Constant | Value | Source |
|---|---|---|
| Aristotle gas price | **4 gwei** (default observed) | 0G docs |
| `$0G` per gas at 4 gwei | `4e-9 OG` | 4 × 10⁻⁹ |
| Storage Flow anchor tx | **~30 micro-OG / upload** | observed on Galileo |
| Average payload (manifest) | ~2 KB | Mekar manifest size |

All ranges below use the **upper bound** of the gas budget from
`forge test --gas-report` so the estimate is conservative.

---

## 2. Per-operation cost table

### Contract deployment (one-time)

| Contract | Gas | Cost @ 4 gwei |
|---|---:|---:|
| `TrainingDataRegistry` | ~1.2M | **0.0048 OG** |
| `AgentINFT` | ~3.6M | **0.0144 OG** |
| `MekarRegistry` | ~1.8M | **0.0072 OG** |
| `RoyaltyVault` | ~2.2M | **0.0088 OG** |
| `AlignmentAuditor` | ~0.9M | **0.0036 OG** |
| Wire-up txs (5 × setX) | ~0.5M | **0.0020 OG** |
| **Deployment subtotal** | **~10.2M** | **~0.041 OG** |

### User actions (per-tx)

| Action | Gas | Cost @ 4 gwei | Who pays |
|---|---:|---:|---|
| `mintGenesis` | <350k | **0.0014 OG** | minter wallet |
| `mintFork` | <750k | **0.0030 OG** | minter wallet |
| `mintCompose` (8-parent worst case) | <1.6M | **0.0064 OG** | minter wallet |
| `payInference` + cascade (5-deep) | <600k | **0.0024 OG** | end user wallet |
| `flagAgent` (alignment slash) | ~75k | **0.0003 OG** | auditor wallet |
| `transferFrom` (ownership) | ~70k | **0.0003 OG** | current owner |
| `updateMetadata` | ~50k | **0.0002 OG** | agent owner |

### 0G Storage anchor (per upload)

| Operation | Cost |
|---|---:|
| Single `Indexer.upload()` (any size ≤50 MB) | **~30 micro-OG** = **0.00003 OG** |
| Chunked upload (per chunk) | **~0.00003 OG** |
| 32 MB chunked (10 chunks + manifest = 11 anchors) | **~0.00033 OG** |

**Important:** the storage anchor tx is signed by the **deployer
wallet** (`DEPLOYER_PRIVATE_KEY` env on the Vercel function), NOT the
end user's wallet. The user's wallet only pays for the mint tx itself.
This means *every upload your users make burns deployer-wallet $0G*.

---

## 3. Funding tiers — what to pre-fund

### Tier A — bootstrap only (you + small team)

> 1 deploy + ~50 demos / week

| Item | Cost | Per month |
|---|---:|---:|
| Deployment | 0.041 OG | one-time |
| Storage anchors (200 uploads/month) | 0.006 OG | — |
| Buffer for redeploys / fixes | 0.1 OG | — |
| **Total bootstrap fund** | | **~0.15 OG** |

**Verdict:** **0.2 OG** is comfortably safe for the first month
of post-mainnet operation with a small audience.

### Tier B — public launch (1,000 unique users / week)

> Assume 50% upload weights, 70% mint, 30% pay-inference
> = ~500 uploads, ~700 mints, ~300 payments per week

| Item | Per week | Per month (4×) |
|---|---:|---:|
| Storage anchors (500/week) | 0.015 OG | 0.060 OG |
| (Mints + pays paid by users — zero deployer cost) | — | — |
| Buffer for misc gas (auditor flags, owner ops) | 0.005 OG | 0.020 OG |
| Vercel KV / BotID infra fees (USD, not 0G) | — | — |
| **Total per month** | | **~0.08 OG** |

**Verdict:** **0.5 OG** comfortably covers 6 months at this volume
without top-ups.

### Tier C — heavy adoption (10,000 unique users / week)

> One-third hit upload path, all hit at least one read.
> ~3,000 uploads per week.

| Item | Per week | Per month (4×) |
|---|---:|---:|
| Storage anchors (3,000/week) | 0.09 OG | 0.36 OG |
| Chunked uploads (10% are >32 MB, avg 5 chunks) | 0.06 OG | 0.24 OG |
| Buffer (alignment flags, owner ops) | 0.02 OG | 0.08 OG |
| **Total per month** | | **~0.68 OG** |

**Verdict:** **5 OG** is a 6-month runway at heavy adoption.
Top-ups become a regular ops task — set up an alert when the
deployer balance drops below 1 OG.

---

## 4. Safe pre-funding recommendation

| Phase | Pre-fund | Coverage |
|---|---:|---|
| **Submission demo** | **0.2 OG** | First month, ~200 demo uploads |
| **Public launch (gradual)** | **0.5 OG** | 6 months @ 1k users/week |
| **Heavy adoption** | **5 OG** | 6 months @ 10k users/week |

**Hard ceiling: never hold more than ~5 OG on the deployer wallet
at once.** A hot wallet with `DEPLOYER_PRIVATE_KEY` baked into the
Vercel function is fundamentally a single key — capping the balance
caps the damage if it's ever leaked. Top up monthly from a cold
multisig (use `MekarMultisig.sol` once deployed).

---

## 5. Hardening checklist before going live

These are NOT funding items but mitigate the risk that funded $0G
gets drained faster than expected:

- [x] **Upload rate limit** (6/min/IP via `lib/rateLimit.ts`) —
      caps an attacker at ~0.18 OG/hour/IP.
- [x] **Upload size cap** (50 MB request body) — prevents one
      request from forcing a multi-chunk Flow anchor.
- [x] **Origin allowlist** on `/api/storage/upload` — rejects
      requests from non-Mekar domains.
- [x] **Vercel BotID** — blocks confidently-bot traffic before
      it reaches the rate limiter.
- [ ] **Vercel KV** — pre-provisioned for production. Current
      in-memory fallback resets on cold start, which is fine for
      single-instance demo but leaky for multi-region prod.
- [ ] **Alert on deployer balance < 0.5 OG** — set up via
      Vercel cron + small API route polling `eth_getBalance`.
- [ ] **Rotate `DEPLOYER_PRIVATE_KEY` quarterly** — generate
      fresh wallet, transfer balance from cold storage, update
      Vercel env, redeploy.

---

## 6. Mainnet config switch — environment vars

Switching from Galileo to Aristotle is **env-only**. No contract
code change is needed; deploy the same Solidity to the new RPC.

```bash
# .env.production (or Vercel env vars)
NEXT_PUBLIC_NETWORK=aristotle
NEXT_PUBLIC_CHAIN_ID=16661
NEXT_PUBLIC_RPC_URL=https://evmrpc.0g.ai
NEXT_PUBLIC_EXPLORER_URL=https://chainscan.0g.ai
NEXT_PUBLIC_REGISTRY_ADDRESS=0x<new mainnet address>
NEXT_PUBLIC_AGENT_INFT_ADDRESS=0x<new mainnet address>
NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=0x<new mainnet address>
NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=0x<new mainnet address>
NEXT_PUBLIC_ALIGNMENT_AUDITOR_ADDRESS=0x<new mainnet address>
NEXT_PUBLIC_VAULT_DEPLOY_BLOCK=<aristotle deploy block>

# Server-only — fund this wallet with the amount from Tier A/B/C above.
DEPLOYER_PRIVATE_KEY=0x<aristotle hot wallet>
ZG_GALILEO_RPC=https://evmrpc.0g.ai
ZG_GALILEO_STORAGE_INDEXER=https://indexer-storage-turbo.0g.ai
```

---

## 7. TL;DR

| Scenario | Pre-fund deployer wallet with |
|---|---|
| Just submit + demo for hackathon | **0.2 OG** |
| Launch publicly + low traffic | **0.5 OG** |
| Heavy adoption / partnerships | **5 OG** (refill monthly) |

The rate limit + size cap + origin allowlist already in place mean
an attacker can't realistically drain more than ~0.2 OG/hour from a
single rotating-IP pool. The conservative funding above gives a
comfortable safety margin without exposing the hot wallet to
catastrophic loss.
