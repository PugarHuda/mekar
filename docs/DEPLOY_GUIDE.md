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

## Step 3: Deploy MEKAR Contracts

`forge script` has chain-detection issues for chain 16602 on some platforms.
Use `forge create` for each contract instead:

```bash
cd packages/contracts

# Compile
forge build

# Run all tests (25 tests, all must pass)
forge test

# Deploy each contract individually
DEPLOYER=$(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY)

forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --evm-version cancun --legacy --broadcast \
  contracts/TrainingDataRegistry.sol:TrainingDataRegistry \
  --constructor-args $DEPLOYER

forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --evm-version cancun --legacy --broadcast \
  contracts/AgentINFT.sol:AgentINFT \
  --constructor-args $DEPLOYER

forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --evm-version cancun --legacy --broadcast \
  contracts/MekarRegistry.sol:MekarRegistry \
  --constructor-args $DEPLOYER

forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --evm-version cancun --legacy --broadcast \
  contracts/RoyaltyVault.sol:RoyaltyVault \
  --constructor-args $DEPLOYER $AGENT_INFT $REGISTRY $TRAINING_REGISTRY
```

## Step 4: Wire Up Contracts

```bash
# AgentINFT.setRegistry
cast send $AGENT_INFT "setRegistry(address)" $REGISTRY \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY --legacy

# Registry references
cast send $REGISTRY "setAgentInftContract(address)" $AGENT_INFT --rpc-url ... --legacy
cast send $REGISTRY "setRoyaltyVaultContract(address)" $VAULT --rpc-url ... --legacy
cast send $REGISTRY "setTrainingDataRegistry(address)" $TRAINING --rpc-url ... --legacy
```

## Step 5: Save Deployment Addresses

Copy the addresses from your output into `.env`:

```bash
NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_AGENT_INFT_ADDRESS=0x...
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=0x...
```

## Step 6: Seed Demo Data

A bash helper is provided that runs the full seed flow via `cast send`:

```bash
bash scripts/seed-galileo.sh
```

It will:
- Register a training dataset
- Mint Genesis #1
- Mint Forks #2 (medical) and #3 (legal)
- Mint Compose #4 (medical+legal)
- Register the deployer as a compute provider
- Pay + settle 3 inferences (triggering full royalty distribution)

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
- Use `forge create` per contract (workaround documented above)
- Make sure `evm_version = "cancun"` is set in `foundry.toml`

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
