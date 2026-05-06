# Stitch Handoff Plan

> What we've prepped while waiting for design output.

## What's Ready

### 1. Procedural Bloom Generator
`packages/frontend/src/lib/bloom.ts`

- Pure-TS function, no dependencies
- Maps lineage shape → flower archetype:
  - 0 parents → **lotus** (gold)
  - 1 parent → **jasmine** (pink)
  - 2+ parents → **marigold** (orange-gold)
- TokenId seeds petal angle, width variance, hue rotation
- Deterministic — same agent always renders the same bloom
- Output: standalone SVG string

`packages/frontend/src/components/Bloom.tsx`
- React wrapper, renders via `data:` URI (no XSS surface)
- Drop-in component: `<Bloom tokenId={4} parentCount={2} size={120} />`

### 2. Public Bloom API
`/api/bloom/{id}.svg` — returns the procedural bloom for any agent ID
- Looks up parent count + alignment health on-chain
- Falls back to defaults if RPC unavailable
- Cached 5min/24h via `Cache-Control`
- Used by `tokenURI` so MetaMask + OpenSea show the bloom

Live: https://mekar.vercel.app/api/bloom/4.svg

### 3. tokenURI on AgentINFT
`packages/contracts/contracts/AgentINFT.sol`
- Inline JSON metadata via `data:application/json;base64,...`
- Image URL points to the bloom API
- Attributes: Generation, Bloom variant, Parents, Mode, Alignment, Token Id
- 28/28 Foundry tests pass
- Will need redeployment to apply

### 4. Theme Stylesheet (Indonesian Garden)
`packages/frontend/src/styles/theme-mekar.css`
- Loaded but **not active** until `<html data-theme="mekar">` is set
- Defines all Indonesian Garden palette CSS variables
- Adds `.font-display`, `.font-display-italic`, `.font-editorial` typography utilities
- Hand-drawn `.divider-botanical` class (inline SVG)

### 5. Documentation
- `docs/STITCH_HANDOFF.md` (this file) — migration plan
- `docs/DEMO_VIDEO_SCRIPT.md` — shot-by-shot 3-min storyboard
- `docs/X_POST_DRAFT.md` — single-tweet + 8-tweet thread + quote-tweet variants
- `docs/HACKQUEST_FORM.md` — every submission field copy-paste ready

## What Needs the Stitch Output

After Stitch returns visual designs, the integration plan:

### Phase A — Brand assets (≤30 min)
- [ ] Replace `/public/icon.svg` with logo from Stitch
- [ ] Replace `/public/og.svg` with social card from Stitch
- [ ] Add Cormorant Garamond + Manrope to `app/layout.tsx` (next/font/google)
- [ ] Activate theme: set `<html data-theme="mekar" lang="en">`

### Phase B — Color palette (≤30 min)
- [ ] Update `tailwind.config.ts` with new HSL tokens
- [ ] Update `app/globals.css` `:root` and `.dark` variables to match `theme-mekar.css`
- [ ] Replace `mekar-green/emerald/gold` references with semantic `primary/accent` everywhere

### Phase C — Landing page (≤2 hours)
- [ ] Rebuild hero with asymmetric layout: serif H1 left, large bloom illustration right
- [ ] Replace problem grid with editorial pull-quote treatment
- [ ] Replace 4-step grid with vertical timeline + botanical bullets
- [ ] Replace 0G stack chips with pressed-flower botanical chart
- [ ] Add subtle line-art jasmine + frangipani backgrounds via inline SVG

### Phase D — Explorer (≤3 hours)
- [ ] Replace D3 default circles with `<Bloom>` SVG nodes
- [ ] Replace edge straight lines with curved botanical vines (D3 link bundle)
- [ ] Add leaf decorations along edges
- [ ] Update tooltip to look like a botanical specimen card

### Phase E — Agent detail (≤2 hours)
- [ ] Hero: large `<Bloom size={400} />` for the current agent
- [ ] Lineage breadcrumb: small bloom thumbnails for parents/children (already wired)
- [ ] Section cards: cream paper texture, hand-drawn dividers
- [ ] Inference payment card: tea-ceremony tray styling

### Phase F — Mint + Dashboard (≤2 hours)
- [ ] Mint: convert tabs to 3-step wizard with progress indicator
- [ ] Dashboard: rename to "My Garden", botanical infographics for stats
- [ ] Royalty earnings chart styled as harvest tray

### Phase G — Components (≤1 hour)
- [ ] Custom buttons (no ShadCN defaults)
- [ ] Custom Connect Wallet skin (override RainbowKit theme)
- [ ] Empty states: sketched empty pot illustration
- [ ] Loading states: animated bud opening (CSS keyframes)

### Phase H — Cleanup
- [ ] Remove unused Lucide icons; use Stitch icon set
- [ ] Replace remaining `mekar-green`/`mekar-gold` literals with theme tokens
- [ ] Drop `--font-jetbrains-mono` if Stitch picks a different mono
- [ ] Audit responsiveness on 360px / 768px / 1280px

## Estimated Total Integration Time

~10 hours for a full visual overhaul once designs are in. Phase A/B unblock the rest.

## Smart Contract Re-deploy Plan

The new `tokenURI` ships only after a redeploy. Steps:
1. Save current addresses for fallback (already in `deployments/galileo-testnet.json`)
2. Run `forge create` on the updated `AgentINFT.sol` only
3. Optional: deploy a fresh full set if we want clean lineage IDs
4. Update `.env` + Vercel env vars
5. Re-run `bash scripts/seed-galileo.sh` if redeploying full set

## Risks / Things to Watch

- **Cormorant Garamond load weight** — could push initial paint by ~80ms. Use `next/font` with `display: swap` and preload only the weights actually used.
- **Custom Bloom SVGs** — generated 600×600 SVGs are ~6 KB each. Fine for inline use but cache aggressively if the API is hit at scale.
- **D3 force layout vs flower nodes** — physics-driven layout will collide with petal shapes. May need to add radius padding to `forceCollide`.
- **MetaMask SVG support** — `tokenURI` returns inline JSON with an external image URL. MetaMask + OpenSea support this; older wallets may not render the bloom. Acceptable trade-off.

## Time Hold

While waiting for Stitch:
- Smart contracts: ✅ tokenURI added, 28 tests pass
- Bloom generator: ✅ done
- Bloom API: ✅ deployed
- Demo video script: ✅ done
- X post drafts: ✅ done
- HackQuest copy: ✅ done

Ready to ship the moment new designs land.
