# MEKAR Deploy Guide

## Prerequisites

1. **MetaMask or any EVM wallet** with a private key
2. **Test $0G tokens** from the faucet
3. **Foundry** installed (`forge --version`)

## Step 1: Set Up the Wallet

Generate a fresh wallet (or reuse an existing one):

```bash
# Generate a new wallet (dev only — DO NOT use this on mainnet)
cast wallet new

# Output:
# Address:     0x...
# Private key: 0x...
```

**Save the private key in `.env` at the project root:**

```bash
# In: F:/Hackathons/Hackathon 0g V2/.env
DEPLOYER_PRIVATE_KEY=0x<your-private-key-here>
```

## Step 2: Get Test Tokens

1. Open https://faucet.0g.ai
2. Connect your wallet (MetaMask) to the 0G Galileo Testnet:
   - Network Name: `0G-Galileo-Testnet`
   - RPC: `https://evmrpc-testnet.0g.ai`
   - Chain ID: `16602`
   - Symbol: `0G`
   - Explorer: `https://chainscan-galileo.0g.ai`
3. Request faucet tokens (0.1 0G/day per wallet)
4. Verify your balance:
   ```bash
   cast balance 0xYOUR_ADDRESS --rpc-url https://evmrpc-testnet.0g.ai
   ```

## Step 3: Compile + Test

```bash
cd packages/contracts

# Compile
forge build

# Run all tests (33 tests, all must pass — includes Q2/Q4/Q5 fix coverage)
forge test
```

## Step 4: Deploy (use the shell helper)

`forge script` and naive `cast send` both hit intermittent `null-response`
errors on Galileo RPC. The verified-deploy script handles both gotchas:

1. Each `forge create` is followed by a `cast code` check to confirm bytecode
   landed — silent no-op deploys (which happened in early attempts) get
   caught immediately.
2. All `cast send` calls use `--async` + receipt polling with backoff.

From the monorepo root:

```bash
bash scripts/deploy-v2-fix.sh
```

The script deploys:
- `AgentINFT` (ERC-7857 with mint/fork/compose)
- `MekarRegistry`
- `RoyaltyVault`
- `AlignmentAuditor` (new in v2 — allowlist-gated alignment scoring)

then wires everything up and writes the addresses to
`packages/contracts/deployments/galileo-testnet-v2.json` and
`packages/frontend/.env.production`.

> `TrainingDataRegistry` is **reused from the previous deployment**
> (`0xdBE4397f...513e8`) — no state shared with AgentINFT or Registry, so
> the new contracts can plug into the existing one without conflict.

## Step 5: Save Deployment Addresses

`deploy-v2-fix.sh` already populates `packages/frontend/.env.production`.
For local backend dev, copy the same values into root `.env`:

```bash
NEXT_PUBLIC_AGENT_INFT_ADDRESS=0x...
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=0x...
NEXT_PUBLIC_ALIGNMENT_AUDITOR_ADDRESS=0x...
NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=0xdBE4397f3e4CCafDA7bfbeD264448577249513e8
```

For Vercel production, set these via `vercel env add ... production` —
**Vercel dashboard env vars override `.env.production`** during build, so
syncing the repo file alone is not enough.

## Step 6: Seed Demo Data (multi-wallet cascade)

```bash
bash scripts/multi-wallet-seed.sh
```

It will:
- Generate 3 fresh ephemeral wallets (alice, bob, carol)
- Fund each with 0.005 OG from the deployer
- Register a training dataset
- Mint Genesis #1 (deployer)
- Alice forks #1 → token #2
- Bob forks #1 → token #3
- Carol composes [#2, #3] → token #4
- Slash agent #3 alignment to 50% via AlignmentAuditor.flagAgent
- Register deployer as a compute provider (0.001 OG stake)
- Pay + settle 3 inferences against #4, distributing royalty across all 4 wallets

The private keys for the 3 generated wallets are written to
`.test-wallets.json` at the repo root (gitignored).

## Step 7: Verify on Explorer

Visit https://chainscan-galileo.0g.ai/address/<your-contract-address>

You should see:
- The contract deployment transaction
- Mint transactions (genesis, forks, compose)
- Inference payments + royalty distribution events

## Troubleshooting

### "insufficient funds"
- Top up via https://faucet.0g.ai
- Wait 24 hours if you've hit the daily limit

### "nonce too low"
- Reset MetaMask account (Settings → Advanced → Reset Account)
- Or clear local state

### "EIP-1559 not supported"
- Make sure you pass the `--legacy` flag

### "Chain 16602 not supported" (forge script)
- Use `scripts/deploy-v2-fix.sh` which calls `forge create` per contract
- Make sure `evm_version = "cancun"` is set in `foundry.toml`

### `cast send` returns "server returned a null response..."
- Galileo RPC sometimes drops the receipt fetch while the tx is still mined.
  Use `--async --gas-limit 800000`, then poll `cast receipt <tx>` with
  backoff. See `scripts/multi-wallet-seed.sh:send_and_wait()` for the pattern.

### `forge create` returns "Deployed to: 0x…" but address has no code
- This happens silently when the broadcast didn't land on-chain.
  Use `scripts/deploy-v2-fix.sh` which calls `cast code` after each deploy
  to verify the bytecode actually landed; abort + retry otherwise.

### Vercel prod still shows old contract addresses after redeploy
- Vercel dashboard env vars **override** `.env.production` at build time.
  Updating the repo file alone isn't enough.

```bash
vercel env rm  NEXT_PUBLIC_AGENT_INFT_ADDRESS production --yes
echo "0xNEW…" | vercel env add NEXT_PUBLIC_AGENT_INFT_ADDRESS production
vercel --prod  # trigger fresh build with new env
```

### Backend `/health` returns old contract addresses after `.env` update
- `tsx watch` does **not** hot-reload `.env` (only source files).
  Kill the node process and restart:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
pnpm --filter @mekar/backend dev
```

### Compile error related to transfer lock
- Run `forge clean && forge build`

## Rollback (Disaster Recovery)

There is no upgrade pattern in the MVP. If a contract is wrong:
1. Redeploy with new addresses
2. Update the frontend `.env` with the new addresses
3. The old contract stays on-chain but is unused

## Production Mainnet Deploy

After the testnet has been validated:

```bash
# Audit first (Slither, Mythril, manual review)
# Top up the mainnet wallet with real $0G
# Deploy with a multi-sig owner

forge create --rpc-url https://evmrpc.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --evm-version cancun --legacy --broadcast \
  contracts/AgentINFT.sol:AgentINFT \
  --constructor-args $MULTISIG_OWNER
```
