#!/usr/bin/env bash
#
# MEKAR multi-wallet seed — proves the royalty cascade on Aristotle mainnet by
# minting agents from 4 different wallets and watching $0G flow.
#
# Lineage:
#   deployer  → genesis (#1, alignment 100%)
#   alice (A) → fork    (#2, child of #1)
#   bob   (B) → fork    (#3, child of #1, will be slashed to 50% to demo Q4)
#   carol (C) → compose (#4, parents [#2, #3])
#
# After mint: deployer becomes provider, pays 3 inferences against #4,
# settles each. The cascade must distribute to all four wallets.
#
# Uses cast --async because Galileo RPC sometimes returns null on receipt
# fetch when blocked. We poll receipts ourselves with backoff.

set -e

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo "ERROR: DEPLOYER_PRIVATE_KEY not set"; exit 1
fi

RPC="https://evmrpc.0g.ai"
DEPLOYER="0xA30930a4b4978b970C61CB7e27c67328471C60b7"

# Load v2 deployment addresses
DEPLOY_JSON=packages/contracts/deployments/aristotle-mainnet.json
extract_addr() {
  # $1 = contract name; pulls address from the matching JSON line
  grep "\"$1\"" $DEPLOY_JSON | grep -oE '0x[a-fA-F0-9]{40}' | head -1
}

AGENT_INFT=$(extract_addr "AgentINFT")
REGISTRY=$(extract_addr "MekarRegistry")
VAULT=$(extract_addr "RoyaltyVault")
TRAINING=$(extract_addr "TrainingDataRegistry")
AUDITOR=$(extract_addr "AlignmentAuditor")

echo "═══════════════════════════════════════════════"
echo "  MEKAR Multi-wallet Seed — Aristotle Mainnet"
echo "═══════════════════════════════════════════════"
echo "AgentINFT:        $AGENT_INFT"
echo "Registry:         $REGISTRY"
echo "Vault:            $VAULT"
echo "Training:         $TRAINING"
echo "AlignmentAuditor: $AUDITOR"
echo ""

# ─────────────────────────────────────────────────────────────────────
# Helper: send + wait for receipt with retries (Galileo RPC quirks)
# ─────────────────────────────────────────────────────────────────────
# Args: $1 = label, $2 = private key, $3+ = cast send args (target + sig + values + flags)
# Echoes the tx hash on success; returns 1 on failure.
send_and_wait() {
  local label="$1"
  local key="$2"
  shift 2

  local tx
  tx=$(cast send --rpc-url $RPC --private-key $key --legacy --async --gas-limit 800000 "$@" 2>&1)
  if [[ ! "$tx" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
    echo "       [$label] BROADCAST FAIL: $tx" >&2
    return 1
  fi

  # Poll receipt with backoff
  local i status
  for i in 1 2 3 4 5 6; do
    sleep $i
    status=$(cast receipt $tx --rpc-url $RPC 2>/dev/null | grep -E "^status" | awk '{print $2}')
    if [ "$status" = "1" ]; then
      echo "$tx"
      return 0
    elif [ "$status" = "0" ]; then
      echo "       [$label] REVERTED tx=$tx" >&2
      return 1
    fi
  done

  echo "       [$label] TIMEOUT waiting for receipt tx=$tx" >&2
  return 1
}

# ─────────────────────────────────────────────────────────────────────
# 1. Generate 3 fresh wallets
# ─────────────────────────────────────────────────────────────────────
echo "[1/9] Generate 3 fresh wallets…"
WALLETS_FILE=".test-wallets.json"
echo "{" > $WALLETS_FILE
echo "  \"network\": \"galileo\"," >> $WALLETS_FILE
echo "  \"deployedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> $WALLETS_FILE
echo "  \"wallets\": {" >> $WALLETS_FILE

declare -A ADDRESSES
declare -A KEYS
NAMES=(alice bob carol)
for idx in "${!NAMES[@]}"; do
  name=${NAMES[$idx]}
  OUT=$(cast wallet new 2>&1)
  ADDR=$(echo "$OUT" | grep -i "Address:" | grep -oE '0x[a-fA-F0-9]{40}')
  KEY=$(echo "$OUT" | grep -i "Private key:" | grep -oE '0x[a-fA-F0-9]{64}')
  ADDRESSES[$name]=$ADDR
  KEYS[$name]=$KEY
  echo "       $name → $ADDR"
  COMMA=","
  if [ "$idx" = "$((${#NAMES[@]} - 1))" ]; then COMMA=""; fi
  cat >> $WALLETS_FILE <<EOF
    "$name": {"address": "$ADDR", "privateKey": "$KEY"}$COMMA
EOF
done
echo "  }" >> $WALLETS_FILE
echo "}" >> $WALLETS_FILE
echo "       saved → $WALLETS_FILE (gitignored)"
echo ""

# ─────────────────────────────────────────────────────────────────────
# 2. Fund each wallet with 0.02 OG
# ─────────────────────────────────────────────────────────────────────
echo "[2/9] Fund each wallet with 0.02 OG…"
for name in alice bob carol; do
  if send_and_wait "fund-$name" $DEPLOYER_PRIVATE_KEY \
       ${ADDRESSES[$name]} --value 20000000000000000 >/dev/null; then
    echo "       $name funded"
  else
    echo "       fund-$name FAILED, abort"; exit 1
  fi
done
echo ""

# ─────────────────────────────────────────────────────────────────────
# 3. Register training dataset (deployer)
# ─────────────────────────────────────────────────────────────────────
echo "[3/9] Register training dataset (deployer)…"
NOW=$(date +%s)
TRAINING_ROOT=$(echo -n "indomedical-corpus-v2-$NOW" | cast keccak)
STORAGE_PTR=$(echo -n "0g-storage-v2-$NOW" | cast keccak)
TEE_PROOF=$(echo -n "tee-attest-v2-$NOW" | cast keccak)
if send_and_wait "registerDataset" $DEPLOYER_PRIVATE_KEY \
     $TRAINING "registerDataset(bytes32,bytes32,bytes32)" \
     $TRAINING_ROOT $STORAGE_PTR $TEE_PROOF >/dev/null; then
  echo "       OK"
else
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────
# 4. Genesis mint by deployer (#1)
# ─────────────────────────────────────────────────────────────────────
echo "[4/9] Genesis mint (deployer → token #1)…"
GEN_W=$(echo -n "genesis-w-$NOW" | cast keccak)
if send_and_wait "mintGenesis" $DEPLOYER_PRIVATE_KEY \
     $AGENT_INFT \
     "mintGenesis(bytes32,bytes32,bytes32,(uint16,uint16,uint16,uint16,uint16,uint16),uint8)" \
     $GEN_W $TRAINING_ROOT $TEE_PROOF \
     "(5000,2500,1500,700,300,10)" 1 >/dev/null; then
  echo "       OK token #1 → $DEPLOYER"
else
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────
# 5. Alice forks #1 → mint #2
# ─────────────────────────────────────────────────────────────────────
echo "[5/9] Alice forks #1 → token #2…"
ALICE_W=$(echo -n "alice-w-$NOW" | cast keccak)
ALICE_T=$(echo -n "alice-t-$NOW" | cast keccak)
ALICE_A=$(echo -n "alice-a-$NOW" | cast keccak)
if send_and_wait "alice-mintFork" ${KEYS[alice]} \
     $AGENT_INFT "mintFork(uint256,bytes32,bytes32,bytes32)" \
     1 $ALICE_W $ALICE_T $ALICE_A >/dev/null; then
  echo "       OK token #2 → ${ADDRESSES[alice]}"
else
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────
# 6. Bob forks #1 → mint #3
# ─────────────────────────────────────────────────────────────────────
echo "[6/9] Bob forks #1 → token #3…"
BOB_W=$(echo -n "bob-w-$NOW" | cast keccak)
BOB_T=$(echo -n "bob-t-$NOW" | cast keccak)
BOB_A=$(echo -n "bob-a-$NOW" | cast keccak)
if send_and_wait "bob-mintFork" ${KEYS[bob]} \
     $AGENT_INFT "mintFork(uint256,bytes32,bytes32,bytes32)" \
     1 $BOB_W $BOB_T $BOB_A >/dev/null; then
  echo "       OK token #3 → ${ADDRESSES[bob]}"
else
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────
# 7. Carol composes [#2, #3] → mint #4
# ─────────────────────────────────────────────────────────────────────
echo "[7/9] Carol composes [#2, #3] → token #4…"
CAROL_W=$(echo -n "carol-w-$NOW" | cast keccak)
CAROL_T=$(echo -n "carol-t-$NOW" | cast keccak)
CAROL_A=$(echo -n "carol-a-$NOW" | cast keccak)
if send_and_wait "carol-mintCompose" ${KEYS[carol]} \
     $AGENT_INFT "mintCompose(uint256[],bytes32,bytes32,bytes32,uint8)" \
     "[2,3]" $CAROL_W $CAROL_T $CAROL_A 0 >/dev/null; then
  echo "       OK token #4 → ${ADDRESSES[carol]}"
else
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────
# 8. Slash Bob's agent (#3) alignment to 50% — demo Q4 economic penalty
# ─────────────────────────────────────────────────────────────────────
echo "[8/9] Flag agent #3 alignment → 50% (demo Q4)…"
if send_and_wait "flagAgent" $DEPLOYER_PRIVATE_KEY \
     $AUDITOR "flagAgent(uint256,uint16,string)" \
     3 5000 "demo-bias-drift" >/dev/null; then
  echo "       OK alignment(#3)=5000 (50%)"
else
  exit 1
fi
echo ""

# ─────────────────────────────────────────────────────────────────────
# 9. Provider stake + 3 inferences against #4
# ─────────────────────────────────────────────────────────────────────
echo "[9/9] Register provider + 3 inferences against #4…"
if send_and_wait "registerProvider" $DEPLOYER_PRIVATE_KEY \
     $VAULT "registerProvider(address,uint256)" \
     $DEPLOYER 1000000000000000 \
     --value 1000000000000000 >/dev/null; then
  echo "       provider staked 0.001 OG"
else
  exit 1
fi

PRICE_HEX=$(cast call $VAULT "getInferencePrice(uint256)" 4 --rpc-url $RPC | sed 's/^0x//' | tr -d '\n')
PRICE_DEC=$(printf "%d" "0x$PRICE_HEX")
echo "       inference price = $PRICE_DEC wei"

for i in 1 2 3; do
  PAY_TX=$(send_and_wait "pay-$i" $DEPLOYER_PRIVATE_KEY \
       $VAULT "payInference(uint256)" 4 --value $PRICE_DEC) || continue

  # Extract requestId from receipt logs (first indexed topic of InferenceRequested)
  RECEIPT_JSON=$(cast receipt $PAY_TX --rpc-url $RPC --json 2>&1)
  REQ_ID=$(echo "$RECEIPT_JSON" | grep -oE '"topics":\[[^]]+\]' | head -1 | grep -oE '"0x[a-f0-9]{64}"' | sed -n '2p' | tr -d '"')

  if [ -z "$REQ_ID" ]; then
    echo "       inference $i: failed to extract reqId from $PAY_TX"
    continue
  fi

  OUTPUT_HASH=$(echo -n "output-$i-$NOW" | cast keccak)
  if SETTLE_TX=$(send_and_wait "settle-$i" $DEPLOYER_PRIVATE_KEY \
       $VAULT "settleInference(bytes32,bytes32,bytes)" \
       $REQ_ID $OUTPUT_HASH "0x1234abcd"); then
    echo "       inference $i settled (req=$REQ_ID)"
  else
    echo "       inference $i settle FAILED"
  fi
done

echo ""
echo "═══════════════════════════════════════════════"
echo "  Verification — wallet balances (wei)"
echo "═══════════════════════════════════════════════"
echo "deployer (genesis #1, also provider):"
echo "  $(cast balance $DEPLOYER --rpc-url $RPC)"
echo "alice (fork #2, alignment 100%):"
echo "  $(cast balance ${ADDRESSES[alice]} --rpc-url $RPC)"
echo "bob (fork #3, alignment 50% slashed):"
echo "  $(cast balance ${ADDRESSES[bob]} --rpc-url $RPC)"
echo "carol (compose #4, current owner):"
echo "  $(cast balance ${ADDRESSES[carol]} --rpc-url $RPC)"
echo ""
echo "Treasury (protocolFeesAccrued):"
echo "  $(cast call $VAULT 'protocolFeesAccrued()(uint256)' --rpc-url $RPC)"
echo ""
echo "View on chain:"
echo "  AgentINFT: https://chainscan.0g.ai/address/$AGENT_INFT"
echo "  Vault:     https://chainscan.0g.ai/address/$VAULT"
