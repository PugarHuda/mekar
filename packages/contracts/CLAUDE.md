# MEKAR Contracts Package

## Architecture

7 core contracts (MVP focuses on the first 4):

| # | Contract | Status | Purpose |
|---|---|---|---|
| 1 | `MekarRegistry.sol` | MVP | Master registry, lineage graph traversal |
| 2 | `AgentINFT.sol` | MVP | ERC-7857 extension, encrypted weights, parent linkage |
| 3 | `RoyaltyVault.sol` | MVP | Receive fees, walk lineage, atomic distribution |
| 4 | `TrainingDataRegistry.sol` | MVP | Merkle root anchor for training data |
| 5 | `ForkFactory.sol` | Phase 2 | Single-parent fork helper |
| 6 | `ComposeFactory.sol` | Phase 2 | Multi-parent merge with strategy enum |
| 7 | `AlignmentAuditor.sol` | Phase 3 | Lineage health scoring |

## Conventions

- **Solidity 0.8.24** with `viaIR: true` to avoid stack-too-deep in RoyaltyVault
- **`evm_version = "cancun"`** required by 0G Galileo / Aristotle
- **OpenZeppelin 5.x** for ERC721, Ownable, ReentrancyGuard
- **NatSpec required** on every public/external function
- **Events for every state change** — mainnet visibility is critical for the demo
- **ReentrancyGuard on every payable function**
- **Custom errors > require strings** (for both gas and readability)

## Deployment Order

```
1. TrainingDataRegistry  (no deps)
2. AgentINFT             (depends on TrainingDataRegistry)
3. MekarRegistry         (depends on AgentINFT)
4. RoyaltyVault          (depends on MekarRegistry, AgentINFT)
```

## Royalty Math

Default schema (basis points = bp, 100 bp = 1%):
```
DIRECT_OWNER_BPS    = 5000   // 50%
GEN1_BPS            = 2500   // 25% (split among parents)
GEN2_BPS            = 1500   // 15% (split among grandparents)
GEN3PLUS_BPS        = 700    // 7%  (split among further ancestors)
TRAINING_BPS        = 300    // 3%  (split among contributors)
                    ─────
                    10000   // 100%

Plus on top of fee:
COMPUTE_PROVIDER_BPS = 1000   // 10%
PROTOCOL_FEE_BPS     = 1000   // 10%
```

## Gas Budget Targets

- `mintGenesis`: < 350k gas
- `mintFork`: < 750k gas (includes lineage update)
- `mintCompose`: < 1.6m gas (multi-parent BFS)
- `payInference + distribute`: < 600k gas (5-deep lineage)

## Test Coverage

- **25 unit tests, 100% passing**
- Branch coverage on royalty distribution
- Edge cases: dedup multi-path ancestors, refund timeout, alignment auth

## Deployment Notes (0G Galileo)

`forge script` had chain-detection issues for chain 16602. Workaround:

```bash
# Use forge create for each contract individually
forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --evm-version cancun --legacy --broadcast \
  contracts/AgentINFT.sol:AgentINFT \
  --constructor-args $YOUR_ADDRESS

# Then wire up via cast send
cast send $REGISTRY "setAgentInftContract(address)" $AGENT_INFT \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY --legacy
```

See `scripts/seed-galileo.sh` for the full seed flow.
