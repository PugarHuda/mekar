# Demo Video Script — Mekar (≤ 3:00, MANDATORY)

The hackathon-mandatory demo video. Must show: core functionality, the
user flow, and **how the 0G component is actually used**. Slide-only or
concept-only videos are rejected — this is a screen recording of the
live app.

## Recording setup

- Record `https://mekar.vercel.app` at 1920×1080, browser zoom 100%.
- Connect the deployer wallet `0xA3…60b7` — it is a **registered compute
  provider**, so "Try it" runs the full pay→settle cascade live.
- Narrate in **English** (judges review in EN/ZH).
- The 0G Storage anchor takes 10–40s — **speed that clip up to ~2s in
  editing** (a normal jump-cut). Do not wait on camera.
- Hard limit: **3:00**. Aim for 2:50. Going over risks disqualification.

## Shot list

| # | Time | Screen / action | Voiceover (read aloud) |
|---|---|---|---|
| 1 | 0:00–0:14 | Landing page, slow scroll of the hero. Lower-third: "Mekar — AI royalty on 0G". | "AI today looks like the music industry before Spotify. When your model gets forked or fine-tuned, you earn nothing. Mekar is the missing royalty rail — and it's live on 0G mainnet." |
| 2 | 0:14–0:40 | Click **Explorer**. D3 lineage tree renders. Hover a node (tooltip), trace a parent→child edge. | "Every AI model registers as an INFT — an intelligent NFT on 0G Chain — with a verifiable lineage. This graph is real on-chain data: genesis models, forks, and a composed agent merged from two parents." |
| 3 | 0:40–1:20 | Click **Mint**. Step 1 pick Genesis. Step 2: fill "Training data summary", click **load sample** (Lotus-Base manifest), click **Upload to 0G Storage** — *[speed up the anchor wait]* — show the returned rootHash. Step 3: name + royalty split. | "To register a model you anchor its weights — or a manifest — on 0G Storage. This is not a mock: the file goes through the 0G SDK, anchored by a real Flow-contract transaction, and the returned rootHash becomes the agent's on-chain weightsPointer. You set the royalty split, name it, mint." |
| 4 | 1:20–2:08 | An agent detail page. Show the lineage strip + royalty cascade card (50/25/15/7/3). Scroll to **Try it**, type a prompt, click **Pay & run inference** → confirm `payInference` in wallet → confirm `settleInference` → "✓ Royalty cascade settled". New row in the settlement log. | "Here's the core. When anyone uses an agent they pay through Mekar's RoyaltyVault. The fee escrows, then settles — and in one atomic transaction the royalty cascades up the whole lineage: fifty percent to the owner, twenty-five to the parents, on down to the training-data contributors." |
| 5 | 2:08–2:38 | Open `chainscan.0g.ai` on the settle tx → expand logs → `RoyaltyPaid` events. Cut to the RoyaltyVault address page showing multiple `RoyaltyPaid`. | "And it's verifiable. Here on the 0G explorer is that exact transaction — the RoyaltyPaid events, recipients, amounts. Thirteen royalty settlements have already flowed across four wallets on mainnet. Real money, real lineage, real chain." |
| 6 | 2:38–2:54 | Dashboard — agents + earnings sparkline. Quick cut to `/docs` section 8 (Live vs Phase 2). | "Creators see their earnings on the dashboard. To be clear — Mekar settles the royalty rail; the model's actual inference runs on 0G Compute, which is our next milestone. The payment layer is live today." |
| 7 | 2:54–3:00 | Landing page / logo, URL on screen. | "Mekar. Every AI has a lineage. Every inference pays its ancestors. Live on 0G mainnet." |

VO is ~300 words — comfortably under 3:00 with room for the visuals to breathe.

## Do / don't

- DO show a real 0G Storage rootHash and a real `chainscan.0g.ai` page —
  that is the "how 0G is used" proof judges look for.
- DO keep the honesty line in shot 6 — claiming live AI inference would
  be false and judges will check.
- DON'T record a live upload wait — pre-upload or jump-cut.
- DON'T exceed 3:00.
