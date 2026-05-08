#!/usr/bin/env bash
#
# MEKAR — top up the royalty cascade with inferences against multiple
# agents so explorer + dashboard shows real activity, not just the
# 3-against-#4 sample from the initial seed.
#
# Cascade depths exercised:
#   #2 (alice fork)    → alice + deployer (genesis)         · gen-1 cascade
#   #3 (bob fork, 50%) → bob (slashed) + deployer (genesis) · gen-1 + Q4 slash
#   #5 (deployer solo) → deployer + 3% training fallback    · genesis-only
#
# Each agent gets 2 inferences. Total: 6 settlements, ~0.012 OG.
# All cast send calls go through the --async + receipt-polling pattern
# documented in packages/backend/CLAUDE.md.

set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY not set"; exit 1
fi

RPC="https://evmrpc-testnet.0g.ai"
DEPLOYER="0xA30930a4b4978b970C61CB7e27c67328471C60b7"

DEPLOY_JSON=packages/contracts/deployments/galileo-testnet-v2.json
extract_addr() {
  grep "\"$1\"" $DEPLOY_JSON | grep -oE '0x[a-fA-F0-9]{40}' | head -1
}
AGENT_INFT=$(extract_addr "AgentINFT")
VAULT=$(extract_addr "RoyaltyVault")

echo "═══════════════════════════════════════════════"
echo "  MEKAR — Top up royalty cascade data"
echo "═══════════════════════════════════════════════"
echo "Vault:     $VAULT"
echo "AgentINFT: $AGENT_INFT"
echo ""

# Reusable async-send + receipt-poll helper (matches multi-wallet-seed.sh)
send_and_wait() {
  local label="$1"; local key="$2"; shift 2
  local tx
  tx=$(cast send --rpc-url $RPC --private-key $key --legacy --async --gas-limit 800000 "$@" 2>&1)
  if [[ ! "$tx" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
    echo "       [$label] BROADCAST FAIL: $tx" >&2
    return 1
  fi
  local i status
  for i in 2 3 4 5 6; do
    sleep $i
    status=$(cast receipt $tx --rpc-url $RPC 2>/dev/null | grep -E "^status" | awk '{print $2}')
    if [ "$status" = "1" ]; then echo "$tx"; return 0; fi
    if [ "$status" = "0" ]; then echo "       [$label] REVERTED tx=$tx" >&2; return 1; fi
  done
  echo "       [$label] TIMEOUT tx=$tx" >&2
  return 1
}

# Sanity: provider stake should already exist from earlier seed
echo "Verifying provider stake…"
STAKE=$(cast call $VAULT "providerStake(address)(uint256)" $DEPLOYER --rpc-url $RPC | awk '{print $1}')
echo "       deployer stake = $STAKE wei"
if [ "$STAKE" = "0" ]; then
  echo "       Re-staking 0.001 OG…"
  send_and_wait "registerProvider" $DEPLOYER_PRIVATE_KEY \
    $VAULT "registerProvider(address,uint256)" $DEPLOYER 1000000000000000 \
    --value 1000000000000000 >/dev/null || exit 1
fi
echo ""

# Treasury before
TREAS_BEFORE=$(cast call $VAULT "protocolFeesAccrued()(uint256)" --rpc-url $RPC | awk '{print $1}')
echo "Treasury before:  $TREAS_BEFORE wei"
echo ""

NOW=$(date +%s)

run_inference() {
  local label="$1"
  local target="$2"
  local i="$3"

  PRICE_HEX=$(cast call $VAULT "getInferencePrice(uint256)" $target --rpc-url $RPC | sed 's/^0x//' | tr -d '\n')
  PRICE_DEC=$(printf "%d" "0x$PRICE_HEX")

  PAY_TX=$(send_and_wait "pay-$label-$i" $DEPLOYER_PRIVATE_KEY \
    $VAULT "payInference(uint256)" $target --value $PRICE_DEC) || return 1

  RECEIPT_JSON=$(cast receipt $PAY_TX --rpc-url $RPC --json 2>&1)
  REQ_ID=$(echo "$RECEIPT_JSON" | grep -oE '"topics":\[[^]]+\]' | head -1 | grep -oE '"0x[a-f0-9]{64}"' | sed -n '2p' | tr -d '"')
  if [ -z "$REQ_ID" ]; then echo "       [$label-$i] failed to extract reqId"; return 1; fi

  OUTPUT=$(echo -n "out-$label-$i-$NOW" | cast keccak)
  send_and_wait "settle-$label-$i" $DEPLOYER_PRIVATE_KEY \
    $VAULT "settleInference(bytes32,bytes32,bytes)" $REQ_ID $OUTPUT "0x1234abcd" \
    >/dev/null && echo "       [$label-$i] settled (req=$REQ_ID)" \
    || { echo "       [$label-$i] settle FAIL"; return 1; }
}

echo "── 2 inferences against agent #2 (alice fork, gen 1) ──"
for i in 1 2; do run_inference "alice2" 2 $i; done
echo ""

echo "── 2 inferences against agent #3 (bob fork, slashed 50%) ──"
for i in 1 2; do run_inference "bob3" 3 $i; done
echo ""

echo "── 2 inferences against agent #5 (deployer solo genesis with Q3 pointer) ──"
for i in 1 2; do run_inference "solo5" 5 $i; done
echo ""

# Treasury after
TREAS_AFTER=$(cast call $VAULT "protocolFeesAccrued()(uint256)" --rpc-url $RPC | awk '{print $1}')
DELTA=$((TREAS_AFTER - TREAS_BEFORE))
echo "═══════════════════════════════════════════════"
echo "  Royalty top-up complete"
echo "═══════════════════════════════════════════════"
echo "Treasury before:  $TREAS_BEFORE wei"
echo "Treasury after:   $TREAS_AFTER wei"
echo "Delta:            $DELTA wei"
echo ""
echo "Wallet balances:"
echo "  deployer (provider + genesis #1, owns #5):"
echo "    $(cast balance $DEPLOYER --rpc-url $RPC) wei"

# Multi-wallet from .test-wallets.json (if present)
if [ -f .test-wallets.json ]; then
  for name in alice bob carol; do
    addr=$(grep -A1 "\"$name\"" .test-wallets.json | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
    if [ -n "$addr" ]; then
      bal=$(cast balance $addr --rpc-url $RPC)
      echo "  $name ($addr): $bal wei"
    fi
  done
fi
