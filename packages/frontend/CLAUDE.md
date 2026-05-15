# MEKAR Frontend Package

A Next.js 15 dApp to explore the lineage tree, mint INFTs, pay for inference,
and view royalty distribution.

## Stack

- Next.js 15 (App Router)
- TypeScript strict
- Tailwind CSS + custom MEKAR theme
- wagmi v2 + viem + RainbowKit (wallet)
- D3.js (lineage tree visualization)
- Framer Motion (animations)
- Sonner (toasts)
- Zustand (state, ready for use)

## Pages

| Path | Purpose |
|---|---|
| `/` | Landing page — pitch + explainer |
| `/explorer` | Lineage tree (D3 force graph; mobile: list view at <768px) |
| `/agent/[id]` | Agent detail + inference payment UI + owner edit panel |
| `/mint` | 3-step form: Genesis, Fork, Compose (with 0G Storage upload) |
| `/dashboard` | User's agents + earnings stats + sparkline |
| `/trending` | Leaderboard from real RoyaltyPaid event aggregates |
| `/docs` | Developer reference — 10 sections, sticky API-docs sidebar |
| `/brand` | Logo download hub (SVG + PNG variants) |
| `/slides` | Internal pitch deck (noindex) |

## Key Files

```
src/
├── app/
│   ├── layout.tsx              # Root layout, providers
│   ├── page.tsx                # Landing
│   ├── explorer/page.tsx       # Lineage tree explorer
│   ├── agent/[id]/page.tsx     # Agent detail + inference
│   ├── dashboard/page.tsx      # User's agents + earnings
│   └── mint/page.tsx           # Mint flows
├── components/
│   ├── Header.tsx              # Top nav + ConnectButton
│   ├── NetworkBanner.tsx       # Wrong-network warning + switcher
│   ├── InferencePay.tsx        # One-click inference payment + provider register
│   └── LineageTree.tsx         # D3 force-directed graph
├── hooks/
│   ├── useLineageData.ts       # Fetch all agents from chain via wagmi
│   └── useAgent.ts             # Fetch a single agent + descendants + price
├── lib/
│   ├── chains.ts               # 0G Galileo + Aristotle config
│   ├── wagmi.ts                # RainbowKit config
│   └── utils.ts                # cn(), formatOG(), etc.
└── contracts/
    ├── addresses.ts            # Contract addresses from env
    └── abis.ts                 # Minimal ABIs for wagmi reads/writes
```

## Run

```bash
cd packages/frontend
pnpm install
pnpm dev   # → http://localhost:3000
```

You need `.env.local` (or root `.env`) with:
```
NEXT_PUBLIC_AGENT_INFT_ADDRESS=0x...
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=0x...
NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<from cloud.walletconnect.com>
```

## Conventions

- **Server Components by default**, mark `"use client"` only when needed
- Use `wagmi` hooks (`useReadContract`, `useWriteContract`) — don't call ethers directly
- D3 in `useEffect` with cleanup
- Toast on tx submit + tx confirm + tx error
- Show explorer link on every tx hash

## Branding

- Primary: `mekar-green` (#10b981)
- Genesis nodes = green
- Fork nodes = darker emerald
- Composed nodes = gold (#f59e0b)
- Bad alignment = rose

## Vercel Deployment

Deployed to https://mekar.vercel.app via Vercel CLI:

- Linked from `packages/frontend` (not from monorepo root)
- Build command: `next build`
- Install command: `npm install --legacy-peer-deps` (bypasses pnpm workspace)
- Environment variables: 8 `NEXT_PUBLIC_*` set in production
- Region: `sin1` (Singapore)

## TODO Next

- [ ] Real-time event subscription for live tree updates
- [ ] Royalty stream animation on payment success
- [ ] Open Graph image for social sharing
- [ ] Mobile-responsive sheets
- [ ] Inference response display (when backend integrates real 0G Compute)
