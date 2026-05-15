#!/usr/bin/env bash
#
# MEKAR — Aristotle MAINNET deployment (chain 16661).
#
# Deploys all FIVE contracts fresh — unlike the testnet script which
# reuses an already-deployed TrainingDataRegistry, mainnet starts
# empty so everything is deployed here.
#
# This spends REAL $0G. Fund the deployer wallet first:
#   - Deployment alone:  ~0.05 OG
#   - Comfortable buffer: 0.2 OG total
# See docs/MAINNET_FUNDING.md for the full breakdown.
#
# Usage:
#   1. Put DEPLOYER_PRIVATE_KEY in .env (the wallet must hold ≥0.1 OG mainnet)
#   2. bash scripts/deploy-mainnet.sh
#   3. Copy the printed addresses into Vercel env vars (see checklist at end)

set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY not set in .env"; exit 1
fi

# Aristotle mainnet.
RPC="https://evmrpc.0g.ai"
CHAIN_ID=16661
EXPLORER="https://chainscan.0g.ai"

# Derive the deployer address from the key so the script is wallet-agnostic.
DEPLOYER=$(cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY")

cd packages/contracts

echo "═══════════════════════════════════════════════"
echo "  MEKAR — Aristotle MAINNET deploy (chain 16661)"
echo "  Deployer: $DEPLOYER"
echo "═══════════════════════════════════════════════"

# Pre-flight: balance check. Abort early if the wallet is too thin to
# cover the ~0.05 OG deployment — better than failing mid-deploy with
# three contracts up and two missing.
BAL=$(cast balance "$DEPLOYER" --rpc-url $RPC)
echo "[pre-flight] deployer balance: $BAL wei"
# 0.06 OG = 6e16 wei — minimum to comfortably cover 5 deploys + wire-up.
MIN="60000000000000000"
if [ "$(echo "$BAL < $MIN" | bc 2>/dev/null || echo 0)" = "1" ]; then
  echo "ERROR: deployer balance below ~0.06 OG. Fund the wallet first."
  echo "       See docs/MAINNET_FUNDING.md"
  exit 1
fi

# Helper: deploy + verify code present.
deploy_verified() {
  # IMPORTANT: this function sets the GLOBAL `DEPLOYED_ADDR` and does
  # NOT echo the address. The earlier version had callers capture the
  # address via `$(deploy_verified ... | tail -1)` — that runs the
  # function in a SUBSHELL, which (a) swallows every progress line and
  # (b) means a `forge create` whose own verification misreports
  # "contract was not deployed" still left the script believing the
  # deploy failed, OR a FAIL message got captured as if it were an
  # address. Setting a global from the current shell avoids the
  # subshell entirely; the caller checks the return code.
  local label="$1"; local contract="$2"; shift 2
  DEPLOYED_ADDR=""
  echo "[deploy] $label …"
  local out
  out=$(forge create --rpc-url $RPC \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --evm-version cancun --legacy --broadcast \
        $contract --constructor-args "$@" 2>&1)
  local addr
  addr=$(echo "$out" | grep "Deployed to:" | grep -oE '0x[a-fA-F0-9]{40}')
  # `forge create` sometimes prints "Deployed to:" but then its own
  # post-deploy code check is too impatient and exits non-zero with
  # "contract was not deployed" even though the tx WAS mined. So we
  # don't trust forge's exit code — we re-verify the code ourselves
  # below, with a longer backoff.
  if [ -z "$addr" ]; then
    echo "       FAIL: no address in forge output"; echo "$out"; return 1
  fi
  local i code
  for i in 2 3 4 5 6 8 12 16; do
    sleep $i
    code=$(cast code "$addr" --rpc-url $RPC 2>&1 | head -c 6)
    if [ "$code" != "0x" ] && [[ "$code" =~ ^0x[a-fA-F0-9] ]]; then
      echo "       $label = $addr"
      DEPLOYED_ADDR="$addr"
      return 0
    fi
  done
  echo "       FAIL: $label has no code at $addr after retry"; return 1
}

# Each deploy runs in the CURRENT shell (no subshell), so a failure
# return aborts the script via `|| exit 1` — and the recovered
# address is read straight from the global.

# 1. TrainingDataRegistry — deployed FRESH on mainnet (no deps).
deploy_verified "TrainingDataRegistry" \
  contracts/TrainingDataRegistry.sol:TrainingDataRegistry $DEPLOYER || exit 1
TRAINING="$DEPLOYED_ADDR"

# 2. AgentINFT
deploy_verified "AgentINFT" \
  contracts/AgentINFT.sol:AgentINFT $DEPLOYER || exit 1
AGENT_INFT="$DEPLOYED_ADDR"

# 3. MekarRegistry
deploy_verified "MekarRegistry" \
  contracts/MekarRegistry.sol:MekarRegistry $DEPLOYER || exit 1
REGISTRY="$DEPLOYED_ADDR"

# 4. RoyaltyVault
deploy_verified "RoyaltyVault" \
  contracts/RoyaltyVault.sol:RoyaltyVault $DEPLOYER $AGENT_INFT $REGISTRY $TRAINING || exit 1
VAULT="$DEPLOYED_ADDR"

# 5. AlignmentAuditor
deploy_verified "AlignmentAuditor" \
  contracts/AlignmentAuditor.sol:AlignmentAuditor $DEPLOYER $AGENT_INFT || exit 1
AUDITOR="$DEPLOYED_ADDR"

cd ../..

echo ""
echo "──────────────────────────────────────────────"
echo "  Wire-up"
echo "──────────────────────────────────────────────"

send_verify() {
  local label="$1"; shift
  local tx
  tx=$(cast send --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy \
       --async --gas-limit 500000 "$@" 2>&1)
  if [[ ! "$tx" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
    echo "       [$label] BROADCAST FAIL: $tx"; return 1
  fi
  local i status
  for i in 2 3 4 5 6; do
    sleep $i
    status=$(cast receipt $tx --rpc-url $RPC 2>/dev/null | grep -E "^status" | awk '{print $2}')
    if [ "$status" = "1" ]; then echo "       [$label] OK"; return 0; fi
    if [ "$status" = "0" ]; then echo "       [$label] REVERTED"; return 1; fi
  done
  echo "       [$label] TIMEOUT — check $EXPLORER/tx/$tx"; return 1
}

send_verify "AgentINFT.setRegistry"           $AGENT_INFT "setRegistry(address)" $REGISTRY
send_verify "AgentINFT.setAlignmentAuditor"   $AGENT_INFT "setAlignmentAuditor(address)" $AUDITOR
send_verify "Registry.setAgentInftContract"   $REGISTRY "setAgentInftContract(address)" $AGENT_INFT
send_verify "Registry.setRoyaltyVaultContract" $REGISTRY "setRoyaltyVaultContract(address)" $VAULT
send_verify "Registry.setTrainingDataRegistry" $REGISTRY "setTrainingDataRegistry(address)" $TRAINING
send_verify "AlignmentAuditor.approveAuditor" $AUDITOR "approveAuditor(address)" $DEPLOYER

# Capture the deploy block so the frontend's event-scan hooks start
# from the right anchor instead of scanning from genesis.
DEPLOY_BLOCK=$(cast block-number --rpc-url $RPC)

mkdir -p packages/contracts/deployments
cat > packages/contracts/deployments/aristotle-mainnet.json <<EOF
{
  "network": "0G-Aristotle-Mainnet",
  "chainId": $CHAIN_ID,
  "deployer": "$DEPLOYER",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployBlock": $DEPLOY_BLOCK,
  "evmVersion": "cancun",
  "solcVersion": "0.8.24",
  "contracts": {
    "TrainingDataRegistry": {"address": "$TRAINING"},
    "AgentINFT": {"address": "$AGENT_INFT"},
    "MekarRegistry": {"address": "$REGISTRY"},
    "RoyaltyVault": {"address": "$VAULT"},
    "AlignmentAuditor": {"address": "$AUDITOR"}
  }
}
EOF

echo ""
echo "═══════════════════════════════════════════════"
echo "  MAINNET deployment complete — chain $CHAIN_ID"
echo "═══════════════════════════════════════════════"
echo "TrainingDataRegistry: $TRAINING"
echo "AgentINFT:            $AGENT_INFT"
echo "MekarRegistry:        $REGISTRY"
echo "RoyaltyVault:         $VAULT"
echo "AlignmentAuditor:     $AUDITOR"
echo "Deploy block:         $DEPLOY_BLOCK"
echo ""
echo "──────────────────────────────────────────────"
echo "  NEXT: set these in Vercel env (Production)"
echo "──────────────────────────────────────────────"
echo "NEXT_PUBLIC_NETWORK=mainnet"
echo "NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID"
echo "NEXT_PUBLIC_RPC_URL=$RPC"
echo "NEXT_PUBLIC_EXPLORER_URL=$EXPLORER"
echo "NEXT_PUBLIC_REGISTRY_ADDRESS=$REGISTRY"
echo "NEXT_PUBLIC_AGENT_INFT_ADDRESS=$AGENT_INFT"
echo "NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=$VAULT"
echo "NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=$TRAINING"
echo "NEXT_PUBLIC_ALIGNMENT_AUDITOR_ADDRESS=$AUDITOR"
echo "NEXT_PUBLIC_VAULT_DEPLOY_BLOCK=$DEPLOY_BLOCK"
echo ""
echo "Also set the server-side var (Production, not NEXT_PUBLIC):"
echo "ZG_GALILEO_RPC=$RPC"
echo "ZG_GALILEO_STORAGE_INDEXER=https://indexer-storage.0g.ai"
echo ""
echo "Then: vercel --prod   (or push to trigger a redeploy)"
