# Mainnet Deploy Runbook — Mekar on 0G Aristotle

Step-by-step to move Mekar from Galileo testnet to Aristotle mainnet
(chain 16661). Follow top to bottom.

> **Cost:** deployment ≈ 0.05 OG. Fund the deployer wallet with
> **0.2 OG** for a comfortable margin (covers deploy + demo mints +
> storage anchors). See `MAINNET_FUNDING.md` for the full breakdown.

---

## 1. Fund the deployer wallet

The deployer wallet signs every contract deploy + every 0G Storage
anchor. It needs **real mainnet OG**.

```bash
# Find your deployer address from the key:
cast wallet address --private-key $DEPLOYER_PRIVATE_KEY
```

Send ≥ 0.2 OG to that address on Aristotle mainnet. The deploy script
pre-flight-checks the balance and aborts early if it's under ~0.06 OG.

---

## 2. Deploy the 5 contracts

```bash
# DEPLOYER_PRIVATE_KEY must be in .env at the repo root.
bash scripts/deploy-mainnet.sh
```

The script deploys **all five** contracts fresh (mainnet starts empty —
unlike the testnet script which reuses an existing TrainingDataRegistry),
wires them together, verifies code is present after each deploy, and
prints:

- the 5 contract addresses
- the deploy block (for the frontend's event-scan anchor)
- the exact env vars to paste into Vercel

It also writes `packages/contracts/deployments/aristotle-mainnet.json`.

---

## 3. Update Vercel environment variables

The frontend reads contract addresses + network at runtime. Vercel
dashboard env vars **override** `.env.production` at build time — so
the addresses must be set in the Vercel dashboard, not just the file.

In **Vercel → Project → Settings → Environment Variables** (Production
scope), set everything the script printed:

```
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CHAIN_ID=16661
NEXT_PUBLIC_RPC_URL=https://evmrpc.0g.ai
NEXT_PUBLIC_EXPLORER_URL=https://chainscan.0g.ai
NEXT_PUBLIC_REGISTRY_ADDRESS=0x<from script>
NEXT_PUBLIC_AGENT_INFT_ADDRESS=0x<from script>
NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=0x<from script>
NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=0x<from script>
NEXT_PUBLIC_ALIGNMENT_AUDITOR_ADDRESS=0x<from script>
NEXT_PUBLIC_VAULT_DEPLOY_BLOCK=<from script>
```

Server-side vars (Production scope, **without** the `NEXT_PUBLIC_`
prefix — these power the `/api/storage/*` routes):

```
ZG_GALILEO_RPC=https://evmrpc.0g.ai
ZG_GALILEO_STORAGE_INDEXER=https://indexer-storage-turbo.0g.ai
DEPLOYER_PRIVATE_KEY=0x<your mainnet deployer key>
```

> The env keys still carry the `GALILEO` name for backwards
> compatibility — the value is what matters, point them at mainnet.

---

## 4. Redeploy the frontend

```bash
vercel --prod
```

…or push to `main` to trigger an automatic redeploy. The new build
picks up the mainnet env vars.

---

## 5. Verify

- [ ] Open https://mekar.vercel.app — the NetworkBanner should expect
      chain **16661**, not 16602.
- [ ] Connect a wallet on Aristotle mainnet — no "wrong network" banner.
- [ ] `/explorer` loads (will be empty until the first mainnet mint).
- [ ] Mint one genesis agent — confirms the contracts + RPC wiring.
- [ ] Check the mint tx on https://chainscan.0g.ai.
- [ ] Update the contract-address tables in `README.md` and
      `docs/HACKQUEST_FORM.md` with the mainnet addresses.

---

## 6. Update submission docs

The HackQuest form has a Testnet/Mainnet toggle — flip it to **Mainnet**
and paste the new addresses + `https://chainscan.0g.ai` links.

Update these files with the mainnet addresses:
- `README.md` — the "Live Deployment" contract table
- `docs/HACKQUEST_FORM.md` — the deployment-details block
- The in-app `/docs` page — the contract-addresses section

---

## Rollback

If anything is wrong, the testnet deployment is untouched — flip the
Vercel env vars back (`NEXT_PUBLIC_NETWORK=galileo` + the Galileo
addresses) and redeploy. Nothing about the mainnet deploy is
destructive to the testnet one; they are fully independent.
