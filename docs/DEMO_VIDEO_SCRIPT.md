# MEKAR — Demo Video Script

> Length: 3:00 (sub-3-minute, hackathon spec)
> Style: Live screen recording + voiceover
> Mood: Editorial calm with confident momentum
> Resolution: 1920×1080
> Tools: OBS Studio (or QuickTime), DaVinci Resolve (free), Loom (for hosting)

---

## Pre-Production Checklist

- [ ] Wallet funded with at least 0.2 0G via faucet
- [ ] All 4 contracts already deployed and seeded with 4 agents on Galileo
- [ ] Production frontend live at https://mekar.vercel.app
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

### Scene 3 — Live Demo: Explorer (0:45–1:30)

**Visual:**
- Browser window opens https://mekar.vercel.app
- Pan to landing page hero (briefly, ~3 seconds)
- Click "Explore Lineage Tree" → navigates to /explorer
- The lineage tree renders with 4 real on-chain agents (Genesis, 2 forks, 1 compose)
- Cursor moves slowly to highlight each node:
  - Hover over Genesis #1 → tooltip: "Generation 0, Voluntary mode, 100% health"
  - Hover over Fork #2 → "Medical fine-tune, parent #1"
  - Hover over Compose #4 → "Multi-parent: #2 and #3"

**Voiceover:**
> "Here's our lineage explorer. Four agents minted on 0G Galileo testnet, all real. Genesis at the top. Two forks branching off. And a composed agent merging both forks. Every link is cryptographically verifiable on-chain."

**Cut to chainscan tab:** Quick view of the AgentINFT contract page showing real transactions.

---

### Scene 4 — Live Inference + Royalty Distribution (1:30–2:15)

**Visual:**
- Click on Compose Agent #4 in the explorer → opens /agent/4
- Pan down to the "Run Inference" card on the right sidebar
- Click "Pay & Run Inference" button (price: 0.0012 0G)
- MetaMask popup appears, click confirm
- Wait briefly for confirmation (4–8 seconds)
- Toast appears: "Payment confirmed"
- Switch to chainscan tab, paste the tx hash
- Highlight the events list — show 4 RoyaltyPaid events firing:
  - Agent #4 owner receives 50%
  - Agent #2 parent receives 12.5%
  - Agent #3 parent receives 12.5%
  - Agent #1 grandparent receives 15% (deduplicated despite 2 paths)

**Voiceover:**
> "Watch this. I'll pay 0.0012 0G to use the composed agent. Single transaction. The smart contract walks the lineage tree, deduplicates ancestors, and atomically distributes royalty. The owner gets 50%, both parents split 25%, the genesis grandparent gets 15% — even though the lineage walks two paths to it. No middleman. No off-chain calculation. All on-chain proof."

**On-screen overlay during the events list:** the breakdown numbers in serif typography.

---

### Scene 5 — Behind the Scenes: 0G Stack (2:15–2:40)

**Visual:**
- Cut to architecture diagram (use the one from docs/ARCHITECTURE.md, animated)
- Highlight each 0G component as it's mentioned:
  - 0G Chain (16602) — contracts deployed here
  - 0G Storage — encrypted weights
  - 0G Compute (TEE) — sealed inference attestations
  - INFT (ERC-7857) — flagship 0G primitive
  - Alignment Nodes — drift detection
- Static text appears: "6 0G modules integrated"

**Voiceover:**
> "MEKAR uses six 0G modules natively — Chain, Storage, Compute, INFT, Alignment Nodes, and the Data Serving Network. The flagship is ERC-7857 — 0G's intelligent NFT standard. We don't just store an address. We carry the agent's encrypted weights, training data Merkle root, and TEE attestation — all on-chain."

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
