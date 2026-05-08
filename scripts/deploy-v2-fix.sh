#!/usr/bin/env bash
#
# MEKAR v2 — Re-deploy with verified-code checks.
# Earlier attempt produced predicted addresses with no actual code (Galileo
# RPC hiccup). This version verifies cast code after every deploy and aborts
# loud if anything is wrong.

set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY not set"; exit 1
fi

RPC="https://evmrpc-testnet.0g.ai"
DEPLOYER="0xA30930a4b4978b970C61CB7e27c67328471C60b7"
TRAINING="0xdBE4397f3e4CCafDA7bfbeD264448577249513e8"

cd packages/contracts

echo "═══════════════════════════════════════════════"
echo "  MEKAR v2 — Verified Re-deployment"
echo "═══════════════════════════════════════════════"

# Helper: deploy + verify code present
# args: $1 label, $2 contract path:name, $3+ constructor args
deploy_verified() {
  local label="$1"
  local contract="$2"
  shift 2

  echo "[deploy] $label …"
  local out
  out=$(forge create --rpc-url $RPC \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --evm-version cancun --legacy --broadcast \
        $contract \
        --constructor-args "$@" 2>&1)

  local addr
  addr=$(echo "$out" | grep "Deployed to:" | grep -oE '0x[a-fA-F0-9]{40}')
  local txh
  txh=$(echo "$out" | grep "Transaction hash:" | grep -oE '0x[a-fA-F0-9]{64}')

  if [ -z "$addr" ] || [ -z "$txh" ]; then
    echo "       FAIL: could not parse deploy output"
    echo "$out"
    return 1
  fi

  # Wait for code with backoff
  local i code
  for i in 2 3 4 5 6; do
    sleep $i
    code=$(cast code $addr --rpc-url $RPC 2>&1 | head -c 6)
    if [ "$code" != "0x" ] && [[ "$code" =~ ^0x[a-fA-F0-9] ]]; then
      echo "       $label = $addr (tx $txh)"
      echo "$addr"
      return 0
    fi
  done

  echo "       FAIL: $label deployed to $addr but no code present after retry"
  return 1
}

# 1. AgentINFT
AGENT_INFT=$(deploy_verified "AgentINFT" \
  contracts/AgentINFT.sol:AgentINFT $DEPLOYER | tail -1)
[ -z "$AGENT_INFT" ] && exit 1

# 2. MekarRegistry
REGISTRY=$(deploy_verified "MekarRegistry" \
  contracts/MekarRegistry.sol:MekarRegistry $DEPLOYER | tail -1)
[ -z "$REGISTRY" ] && exit 1

# 3. RoyaltyVault
VAULT=$(deploy_verified "RoyaltyVault" \
  contracts/RoyaltyVault.sol:RoyaltyVault $DEPLOYER $AGENT_INFT $REGISTRY $TRAINING | tail -1)
[ -z "$VAULT" ] && exit 1

# 4. AlignmentAuditor
AUDITOR=$(deploy_verified "AlignmentAuditor" \
  contracts/AlignmentAuditor.sol:AlignmentAuditor $DEPLOYER $AGENT_INFT | tail -1)
[ -z "$AUDITOR" ] && exit 1

cd ../..

echo ""
echo "──────────────────────────────────────────────"
echo "  Wire-up"
echo "──────────────────────────────────────────────"

# Helper: send tx async + verify status=1
send_verify() {
  local label="$1"; shift
  local tx
  tx=$(cast send --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy \
       --async --gas-limit 500000 "$@" 2>&1)
  if [[ ! "$tx" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
    echo "       [$label] BROADCAST FAIL: $tx"; return 1
  fi
  local i status
  for i in 2 3 4 5; do
    sleep $i
    status=$(cast receipt $tx --rpc-url $RPC 2>/dev/null | grep -E "^status" | awk '{print $2}')
    if [ "$status" = "1" ]; then echo "       [$label] OK"; return 0; fi
    if [ "$status" = "0" ]; then echo "       [$label] REVERTED"; return 1; fi
  done
  echo "       [$label] TIMEOUT"
  return 1
}

send_verify "AgentINFT.setRegistry" \
  $AGENT_INFT "setRegistry(address)" $REGISTRY

send_verify "AgentINFT.setAlignmentAuditor" \
  $AGENT_INFT "setAlignmentAuditor(address)" $AUDITOR

send_verify "Registry.setAgentInftContract" \
  $REGISTRY "setAgentInftContract(address)" $AGENT_INFT

send_verify "Registry.setRoyaltyVaultContract" \
  $REGISTRY "setRoyaltyVaultContract(address)" $VAULT

send_verify "AlignmentAuditor.approveAuditor(deployer)" \
  $AUDITOR "approveAuditor(address)" $DEPLOYER

# Save artifacts
mkdir -p packages/contracts/deployments
cat > packages/contracts/deployments/galileo-testnet-v2.json <<EOF
{
  "network": "0G-Galileo-Testnet",
  "chainId": 16602,
  "deployer": "$DEPLOYER",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "evmVersion": "cancun",
  "solcVersion": "0.8.24",
  "version": "v2",
  "fixes": ["Q2 undistributed-to-treasury", "Q4 alignment-weighted share", "Q5 burned-ancestor try/catch"],
  "contracts": {
    "TrainingDataRegistry": {"address": "$TRAINING", "reused": true},
    "AgentINFT": {"address": "$AGENT_INFT"},
    "MekarRegistry": {"address": "$REGISTRY"},
    "RoyaltyVault": {"address": "$VAULT"},
    "AlignmentAuditor": {"address": "$AUDITOR"}
  }
}
EOF

cat > packages/frontend/.env.production <<EOF
NEXT_PUBLIC_NETWORK=galileo
NEXT_PUBLIC_CHAIN_ID=16602
NEXT_PUBLIC_RPC_URL=https://evmrpc-testnet.0g.ai
NEXT_PUBLIC_EXPLORER_URL=https://chainscan-galileo.0g.ai
NEXT_PUBLIC_REGISTRY_ADDRESS=$REGISTRY
NEXT_PUBLIC_AGENT_INFT_ADDRESS=$AGENT_INFT
NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS=$VAULT
NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS=$TRAINING
NEXT_PUBLIC_ALIGNMENT_AUDITOR_ADDRESS=$AUDITOR
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
EOF

echo ""
echo "═══════════════════════════════════════════════"
echo "  Deployment Complete (verified)"
echo "═══════════════════════════════════════════════"
echo "AgentINFT:        $AGENT_INFT"
echo "MekarRegistry:    $REGISTRY"
echo "RoyaltyVault:     $VAULT"
echo "AlignmentAuditor: $AUDITOR"
echo "TrainingRegistry: $TRAINING (reused)"
