# MEKAR — Demo Video Script

> Length: 3:00 (sub-3-minute, hackathon spec)
> Style: Live screen recording + voiceover
> Mood: Editorial calm with confident momentum
> Resolution: 1920×1080
> Tools: OBS Studio (or QuickTime), DaVinci Resolve (free), Loom (for hosting)

---

## Pre-Production Checklist

- [ ] Wallet funded with at least 0.2 OG via faucet
- [ ] All 5 contracts deployed (v2 with Q2/Q4/Q5 fixes) on Galileo
- [ ] 5 agents seeded across 4 wallets via `multi-wallet-seed.sh`
- [ ] Backend running locally (`pnpm --filter @mekar/backend dev`) for the
      Q3 upload demo at /mint
- [ ] Production frontend live at https://mekar.vercel.app (v2 env)
- [ ] MetaMask switched to 0G Galileo Testnet (chain 16602)
- [ ] Browser zoom level 100%, hide bookmarks bar
- [ ] Clear Chrome cache + history before recording (clean state)
- [ ] Open in incognito to avoid extension noise
- [ ] Pre-load https://chainscan-galileo.0g.ai for fast switching
- [ ] Two browser windows side-by-side: one mekar.vercel.app, one chainscan
- [ ] Voiceover script practiced 3× before recording

---

## Scene-by-Scene Breakdown

### Scene 1 — Hook (0:00–0:25)

**Visual:**
- Black screen, then quick montage of news headlines fading in/out:
  - "NYT files $7.5B suit against OpenAI"
  - "Getty Images sues Stability AI for $1.7B"
  - "EU AI Act enforcement begins May 2026"
  - "Stability AI files for bankruptcy"
- Each headline holds for ~3 seconds
- Headlines are real — screenshot from actual articles or recreated

**Voiceover:**
> "AI today is in a copyright crisis. Lawsuits worth billions. New regulations every month. Open-source AI is dying because creators don't get paid. Sound familiar? It's the music industry circa 1999 — before Spotify."

**B-roll:** Quick cuts of court documents, EU AI Act PDF, news graphics.

---

### Scene 2 — Concept Reveal (0:25–0:45)

**Visual:**
- Cut to white/cream background
- A single bud animates open into a stylized 5-petal flower (the MEKAR logo)
- Wordmark "MEKAR" types in below in serif font

**Voiceover:**
> "Mekar — Indonesian for 'to bloom.' A Spotify-style royalty rail for AI agents on 0G blockchain. Every AI has a verifiable lineage. Every inference automatically pays its ancestors."

**Tagline overlay:** *"Every AI has a lineage. Every inference pays its ancestors."*

---

### Scene 3 — Live Demo: Explorer (0:45–1:25)

**Visual:**
- Browser window opens https://mekar.vercel.app
- Pan to landing page hero (briefly, ~3 seconds)
- Click "Explore Lineage Tree" → navigates to /explorer
- The lineage tree renders with 5 real on-chain agents across 4 wallets
- Cursor moves slowly:
  - Hover over Genesis #1 → "Lotus-Base, gen 0, alignment 100%, owner: deployer"
  - Hover over Fork #2 → "Jasmine-Translator, gen 1, owner: alice"
  - Hover over Fork #3 → **"alignment 50% — slashed by AlignmentAuditor"** (visual cue: red tint or warning glyph)
  - Hover over Compose #4 → "merges #2 + #3, owner: carol"
  - Brief hover over Genesis #5 → "weightsPointer anchored on 0G Storage"

**Voiceover:**
> "Here's our lineage explorer. Five real on-chain agents across four wallets on 0G Galileo. Each bloom shows the agent's name and what it specialises in. Notice agent #3 — its alignment was flagged down to 50% by the Alignment Auditor, which we'll see affect royalty in a moment."

**Cut to chainscan tab:** Quick view of AgentINFT contract page showing the mint + RoyaltyPaid transactions.

---

### Scene 4 — Live Inference + Royalty Distribution (1:25–2:05)

**Visual:**
- Click on Compose Agent #4 in the explorer → opens /agent/4
- Pan down to the "Run Inference" card on the right sidebar
- Click "Pay & Run Inference" button (price: 0.0012 OG)
- MetaMask popup appears, click confirm
- Wait briefly for confirmation (4–8 seconds)
- Toast appears: "Payment confirmed"
- Switch to chainscan tab, paste the tx hash
- Highlight the events list — show RoyaltyPaid events firing:
  - **Carol** (agent #4 owner) — 50%
  - **Alice** (parent #2, alignment 100%) — full gen-1 share
  - **Bob** (parent #3, alignment 50%) — **half the gen-1 share** (Q4 visible)
  - **Deployer** (gen-2 grandparent #1) — 15%, deduplicated despite 2 paths

**Voiceover:**
> "Watch this. I'll pay 0.0012 OG to use the composed agent. Single transaction. The smart contract walks the lineage tree, deduplicates ancestors, and atomically distributes royalty. Carol the owner gets 50. Alice and Bob each split 25 — but Bob's share is halved because his alignment was flagged. That's not a future feature — it's happening live on chain right now. No claim button. The OG lands in their wallets the instant settle confirms."

**On-screen overlay during the events list:** the breakdown numbers in serif typography, with Bob's halved amount highlighted in coral.

---

### Scene 5 — Q3 Storage + 0G Stack Reality (2:05–2:40)

**Visual:**
- Open a second tab: https://mekar.vercel.app/mint
- Click "Fork" mode → ParentCard grid shows bloom + name + focus for each parent
- Click any parent → continue to Step 2
- Drop a small text file into the upload input (or skip → upload manifest JSON)
- Hit "Upload to 0G Storage" — spinner shows briefly
- Result panel appears with **rootHash** + **anchor tx hash** + size
- Cut to chainscan, paste anchor tx — show the Flow contract receipt
- Brief overlay: a 4-row stack diagram:
  - ⛓ 0G Chain (16602) — 5 contracts live
  - 🌳 INFT (ERC-7857) — mint/fork/compose live
  - 📦 0G Storage Log — `Indexer.upload()` live (this anchor right here)
  - 🛡 Alignment Auditor — score scales royalty live
  - (faded) 🟡 Specialized Flow + TEE + Data Serving — Phase 2

**Voiceover:**
> "And it's not just contracts. When you mint, the agent's weights actually upload to 0G Storage through the official SDK. The root hash you see here is anchored on the Flow contract — that exact same hash is the agent's pointer on chain. The Specialized Flow encryption and TEE-sealed inference are Phase 2; everything you've just seen is shipped."

---

### Scene 6 — Vision Close (2:40–3:00)

**Visual:**
- Final shot: a wide-angle of the lineage tree growing in real time (sped up, with multiple new flowers blooming)
- MEKAR wordmark animates in at center
- Tagline below
- URL: **mekar.vercel.app**
- Hashtag bar: #0GHackathon · #BuildOn0G

**Voiceover:**
> "Mekar. The royalty rail for the agentic era. Every AI has a lineage. Every inference pays its ancestors. Built natively on 0G."

**Last frame holds for 3 seconds with URL + hashtag.**

---

## Voiceover Notes

- Tone: confident, calm, slightly editorial — *not* a hype-bro startup pitch
- Pace: ~150 words per minute (currently script has ~280 words for ~3 minutes — adjust if needed)
- Pauses: respect the visuals. Don't talk over the live tx confirmation moment.
- Fillers to avoid: "kind of", "sort of", "y'know"

## Music

Background instrumental — calm, slightly cinematic. Suggested:
- Anything from **Kevin MacLeod**'s *Ambient* or *Cinematic* sets (CC0)
- Or YouTube Audio Library's "Inspiring Corporate" category — but pick a slow, sparse track
- Volume: ducked to ~15% during voiceover, swell to ~40% during transitions

## On-Screen Captions

Add subtitles. Many hackathon judges watch on mute first.

## Export Settings

- Format: MP4
- Resolution: 1920×1080
- Frame rate: 30fps
- Bitrate: 8–10 Mbps (looks crisp, file ~250MB)
- Upload to YouTube as "unlisted" first, then promote to public on submission day

## After Recording

- [ ] Upload to YouTube (or Loom — but YouTube is more permanent)
- [ ] Title: "MEKAR — Spotify Royalty for AI Agents on 0G | 0G APAC Hackathon"
- [ ] Description: copy from `docs/HACKATHON_SUBMISSION.md` + repo link + live demo link
- [ ] Add chapters: 0:00 Hook · 0:25 Reveal · 0:45 Explorer · 1:30 Live Demo · 2:15 0G Stack · 2:40 Close
- [ ] Tag: #0G #BuildOn0G #AI #Web4 #INFT #ERC7857 #Hackathon
- [ ] Pin a comment with: GitHub link, live demo, contract addresses
