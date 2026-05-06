# Handoff: Mekar — AI Lineage Protocol on 0G

## Overview
Mekar is a botanical-themed dApp for an AI lineage + royalty-cascade protocol built on the 0G modular stack. Every AI agent is an INFT (ERC-7857) whose mint requires declaring parent agents, creating an immutable family tree. Inference payments split recursively up the lineage so every ancestor earns from every descendant's queries — forever.

The product surface is 6 pages: Landing, Explorer (lineage garden), Trending (leaderboard), Mint (4-step wizard), Agent profile, Dashboard, Manifesto.

## About the Design Files
The HTML files in this bundle are **design references** — prototypes showing intended look, copy, and behavior. They are NOT production code to copy directly.

Your task is to **recreate these designs in the target codebase's environment**. If starting fresh, recommended stack:
- **Frontend**: Next.js + React + TypeScript + TailwindCSS
- **Smart contracts**: Solidity (ERC-7857 INFT extension) deployed on 0G Chain
- **Storage**: 0G Storage SDK for model weights & training cards
- **Compute**: 0G Compute SDK for inference routing
- **DA**: 0G DA for lineage event publishing

## Fidelity
**High-fidelity.** Pixel-perfect mockups with final colors, typography, spacing, and interactions. Recreate UI pixel-perfectly — but adapt to React/Tailwind component patterns; do not ship the raw HTML.

## Locked Design Decisions (user-approved tweaks)
The user has finalized these tweak settings. Use these as the *only* visual direction:

- **Palette**: `cream` (warm paper background, cocoa ink) — see tokens below
- **Typography pairing**: Cormorant Garamond (display, italic) + Manrope (body) + JetBrains Mono (mono)
- **Density**: `default` (standard padding/spacing)
- **Bloom illustration style**: `woodcut` block-print (bold outlines + transverse hatching strokes on every petal/leaf)
- **Hero centerpiece**: `woodcut` (matches bloom style)
- **Season**: `day` (default cream palette)

Do NOT expose other palette/style options to end users by default. The Tweaks panel in the prototypes is a design exploration tool — it does not need to ship to production.

## Design Tokens

### Colors (cream palette — locked)
```
--bg:       #f6f4ef   /* warm paper */
--bg-alt:   #ebe5d5   /* subtle card / row */
--ink:      #1a1410   /* primary text */
--ink-soft: #6b5d4a   /* secondary text, captions */
--cocoa:    #2a1f15   /* heavy ink, borders */
--rule:     rgba(42,31,21,0.12)   /* dividers */

/* Accent / brand */
--primary:  #d97757   /* coral — CTAs, primary accents */
--gold:     #c89b3c   /* gold — earnings, highlights */
--coral:    #d97757   /* alias of primary */
--sage:     #6b8e5a   /* success, growth */
--lilac:    #9b7eb8   /* compose / secondary */
--ink-blue: #2a4a6b   /* depth accents */

/* Bloom kinds */
genesis bloom: gold petals + coral inner + sage stem
fork bloom:    coral petals + lilac inner + sage stem
compose bloom: lilac petals + gold inner + sage stem
```

### Typography
```
--display: 'Cormorant Garamond', serif   /* italic for h1/h2 */
--body:    'Manrope', system-ui, sans-serif
--mono:    'JetBrains Mono', monospace

Type scale (clamp for fluid):
h1: clamp(48px, 8vw, 92px)   italic 500
h2: clamp(36px, 5vw, 56px)   italic 500
h3: 32px                     italic 500
lede: 22px italic            display
body: 16-17px / 1.6-1.7      body
small/mono: 11-13px          mono uppercase letter-spacing 0.05-0.06em
```

### Spacing & layout
```
container: max-width 1200px, horizontal padding 24px
section padding: 72-80px vertical
card radius: 4-6px
button radius: 4px / pill (999px) for chips
border weight: 1-1.5px (cocoa for emphasis, rule for hairlines)
```

## Pages / Screens

### 1. Landing (`Landing.html` → `app.jsx`)
Sections: Nav · Hero (woodcut bloom centerpiece + headline) · Problem (3 cards re: AI lineage) · How it works (4 numbered steps) · Stats (live counters) · Explorer preview (mini lineage tree) · Royalty cascade (donut split + radial flow) · 0G Stack (5-layer diagram) · FAQ (7 collapsible items) · CTA · Footer.

### 2. Explorer (`Explorer.html` → `explorer.jsx`)
Pan/zoomable lineage garden. Tree-layout of agents drawn as woodcut blooms. Search bar, filter pills (All/Genesis/Forks/Composed), zoom controls. Click a bloom → opens slideover drawer with agent detail. Active link in nav: Explorer.

### 3. Trending (`Trending.html` → `trending.jsx`)
4 view modes: Top earners · Fastest growing · Most forked · Freshly bloomed. Filter pills, podium top-3, leaderboard table with mini sparkline bars per row. Stats strip (24h volume, total inferences, growth %).

### 4. Mint (`Mint.html` → `mint.jsx`)
4-step wizard:
1. **Choose lineage** — Genesis / Fork / Compose. Compose mode shows merge-ratio slider (SLERP α 5–95%) between two parent dropdowns.
2. **Upload weights** — drop zone + staged progress (Hashing → Pinning to 0G Storage → Verifying chunks on DA → Manifest sealed) with animated dot indicators.
3. **Name & price** — name, description, license (Apache-2.0/MIT/CC-BY/CC-BY-SA/CC0/Mekar-Commercial), per-inference price, royalty %.
4. **Mint** — spinning bloom → success state with block #.
Right rail: live preview bloom + royalty split bar.

### 5. Agent profile (`Agent.html` → `agent.jsx`)
Top: bloom + name + lineage strip (ancestors → this agent → descendants). Stats grid (total inferences + sparkline, lifetime earnings + sparkline). Try-it sandbox (prompt input → simulated response with cost + royalty split). Recent inferences table — **rows clickable** → opens transaction detail modal with: tx hash + 0G Explorer link, block, caller, prompt hash, gas, royalty cascade breakdown per ancestor with bar chart.

### 6. Dashboard (`Dashboard.html` → `dashboard.jsx`)
KPI strip with garden-bed sparkline. Tabs: My blooms (cards) · Royalty streams (table) · Activity feed (live stream — new entries slide in every 2.4s with golden flash, items age "just now → 1s → 3s → 8s…").

### 7. Manifesto (`Manifesto.html` → `manifesto.jsx`)
Long-form narrative. 7 sections: I. The forgetting · II. The proposal · III. Why botany · IV. Built on 0G · V. Royalty as oxygen · VI. What we will not do · VII. The garden grows. CTA at end.

## Interactions & Behavior

### Bloom illustrations
The signature visual element. Render via SVG. The `flowers.jsx` file contains the woodcut renderer — it draws:
- Closed scallop silhouette (5 outer + 5 inner lobes)
- Radial spoke hatching from center on every petal
- Bold outline (1.6–1.8px stroke)
- Center stamen + golden coin

Variants by `kind`: genesis / fork / compose / logo (mini, no stem) / hero (large with code-token fill option).

### Lineage tree (Explorer)
- Procedurally laid out by depth × siblings
- Pan: drag background; Zoom: scroll-wheel + +/− buttons
- Curves between parent/child use quadratic Beziers
- Hover bloom: `transform: rotateY(8deg) scale(1.04)` (subtle 3D)
- Click bloom: opens `AgentSlideover` drawer (right side, 480px wide)

### Activity feed (Dashboard)
- New entries push to top with slide-in animation + 200ms golden flash
- Time labels age live (setInterval 1s)
- Live indicator: green pulsing dot

### Transaction modal (Agent)
- Backdrop `rgba(15,12,9,0.5)` + `backdrop-filter: blur(4px)`
- Modal slides up 20px on open
- Royalty split rows: each row has bar fill behind text proportional to share %
- Server (60%) row uses gold accent; ancestor/data/protocol rows use coral

### Upload progress (Mint step 2)
- Trigger: when `files.length > 0`
- 4 stages, each ~900ms apart
- Active dot pulses with box-shadow ring
- Done dots fill solid + checkmark

### Merge ratio slider (Mint step 1, Compose mode)
- Dual-color track (gold/coral on left, primary/lilac on right)
- Center divider follows thumb
- Labels: Parent A name · "SLERP α = 0.50" · Parent B name

## State Management
- **Wallet**: viem/wagmi for 0G Chain connection
- **Agent registry**: indexed by agent ID, queried via 0G Chain RPC + cached subgraph
- **Lineage**: derived from on-chain parent arrays; build tree client-side
- **Royalty splits**: computed contract-side (atomic), surfaced via event logs
- **Live activity**: WebSocket to 0G DA event stream

## 0G Integration Points
1. **0G Storage** — pin model weights + tokenizer + config + training card. Store CID in INFT metadata.
2. **0G Compute** — route inference requests; verify execution proof.
3. **0G Chain** — INFT contract (ERC-7857 + lineage extension), royalty splitter contract, atomic settlement.
4. **0G DA** — publish lineage events (Mint, Fork, Compose, Inference).

## Smart Contract Surface (sketch)
```solidity
interface IMekarBloom is IERC7857 {
    function mint(
        bytes32 modelHash,
        bytes32[] calldata parents,
        uint16[] calldata mergeWeights,  // for compose
        uint256 priceWei,
        uint8 royaltyBps,
        bytes32 license
    ) external returns (uint256 tokenId);

    function inference(uint256 tokenId, bytes32 promptHash) external payable;
    // emits InferenceServed; triggers cascade split
}

interface IRoyaltyCascade {
    function settle(uint256 tokenId, uint256 amount) external;
    // 60/30/7/3 split: server / ancestors (depth-weighted) / data / protocol
}
```

## Files in this bundle
- `Landing.html`, `Explorer.html`, `Trending.html`, `Mint.html`, `Agent.html`, `Dashboard.html`, `Manifesto.html` — entry HTML
- `app.jsx` — landing page React tree
- `explorer.jsx`, `trending.jsx`, `mint.jsx`, `agent.jsx`, `dashboard.jsx`, `manifesto.jsx` — per-page components
- `flowers.jsx` — bloom SVG renderer (woodcut, ink, watercolor, geometric, batik variants — woodcut is locked)
- `shared-nav.jsx` — Nav + Footer shared across pages
- `mekar-tweaks.jsx` — design exploration panel (do not ship)
- `tweaks-panel.jsx` — generic tweaks framework (do not ship)
- `styles.css` — full token + component CSS (~3500 lines)

## Implementation order (suggested)
1. Stand up Next.js + Tailwind, port design tokens to `tailwind.config.ts`
2. Recreate `flowers.jsx` as a typed React component (`<Bloom kind seed size />`)
3. Build `<Nav />` + `<Footer />` shared layout
4. Page-by-page: Landing → Explorer → Agent → Mint → Dashboard → Trending → Manifesto
5. Wire smart contracts on 0G testnet
6. Replace mock data with real chain reads
7. Hook 0G Storage upload to Mint step 2
8. Hook 0G Compute to Agent try-it sandbox

— Generated for Mekar handoff · Cream / Cormorant / Woodcut tweak set locked
