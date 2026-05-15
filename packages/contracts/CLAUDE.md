# MEKAR Contracts Package

## Architecture

| # | Contract | Status | Purpose |
|---|---|---|---|
| 1 | `MekarRegistry.sol` | Deployed | Master registry, lineage graph traversal, metadata pointer KV |
| 2 | `AgentINFT.sol` | Deployed | ERC-7857 + mintGenesis/Fork/Compose, alignment field, mode enum |
| 3 | `RoyaltyVault.sol` | Deployed | Receive fees, walk lineage, atomic BFS distribution, treasury sweep |
| 4 | `TrainingDataRegistry.sol` | Deployed | Merkle root anchor for training data + contributor splits |
| 5 | `AlignmentAuditor.sol` | Deployed | Single-auditor allowlist, pushes alignment scores to AgentINFT |
| 6 | `AlignmentMultiAuditor.sol` | Ready, not deployed | k-of-n threshold auditor (Phase 2 governance upgrade) |
| 7 | `MekarMultisig.sol` | Ready, not deployed | Generic k-of-n multisig for Ownable contract ownership transfer |

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

- **56 unit tests across 3 suites, 100% passing**
  - `MEKARTest` — 33 (core protocol: mint genesis/fork/compose,
    royalty distribution, alignment-weighted payout, burned-ancestor
    fallback, escrow refund, alignment auth, multi-path dedup,
    gas-deep settlement)
  - `AlignmentMultiAuditorTest` — 11 (threshold voting, double-vote
    revert, withdraw, fresh-proposal per (id, score) pair)
  - `MekarMultisigTest` — 12 (propose / confirm / execute lifecycle,
    revoke, value forwarding, target revert propagation, self-only
    governance, threshold floor on signer removal)
- Branch coverage on royalty distribution
- Edge cases: dedup multi-path ancestors, refund timeout, alignment
  auth, Q2/Q4/Q5 fixes (treasury sweep, alignment slash, burned
  ancestor try/catch)

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
