#!/usr/bin/env bash
#
# Seed MEKAR demo lineage on Galileo testnet via cast.
# Run from monorepo root: bash scripts/seed-galileo.sh
#

set -e

# Load .env
export $(grep -v '^#' .env | xargs)

RPC="https://evmrpc-testnet.0g.ai"
DEPLOYER="0xA30930a4b4978b970C61CB7e27c67328471C60b7"

TRAINING="0xdBE4397f3e4CCafDA7bfbeD264448577249513e8"
AGENT_INFT="0xA00A7641FEE39753fFdd1cECA5b73336a68699e3"
REGISTRY="0x66b2F33bF34081b48046e713457fa3912363E779"
VAULT="0x1D62B1D60375D325C3362073e12806A7DF20FBDa"

NOW=$(date +%s)

# Helper: random bytes32
hash() {
  echo -n "$1-$NOW" | cast keccak
}

WEIGHTS_GENESIS=$(hash "weights-genesis")
TRAIN_GENESIS=$(hash "train-genesis")
TEE_GENESIS=$(hash "tee-genesis")

echo "═══════════════════════════════════════════════"
echo "  MEKAR Seed — Galileo Testnet"
echo "═══════════════════════════════════════════════"
echo "Deployer:  $DEPLOYER"
echo ""

# Step 1: Register training dataset
echo "[1/8] Register training dataset"
cast send $TRAINING \
  "registerDataset(bytes32,bytes32,bytes32)" \
  $TRAIN_GENESIS \
  $(hash "storage-ptr") \
  $TEE_GENESIS \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1 | grep -E "(status|transactionHash)" | head -2
echo ""

# Step 2: Mint Genesis
echo "[2/8] Mint Genesis agent (#1)"
# Schema tuple: (directOwner, gen1, gen2, gen3plus, training, maxGen)
# = (5000, 2500, 1500, 700, 300, 10)
cast send $AGENT_INFT \
  "mintGenesis(bytes32,bytes32,bytes32,(uint16,uint16,uint16,uint16,uint16,uint16),uint8)" \
  $WEIGHTS_GENESIS \
  $TRAIN_GENESIS \
  $TEE_GENESIS \
  "(5000,2500,1500,700,300,10)" \
  1 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1 | grep -E "(status|transactionHash)" | head -2
echo ""

# Step 3: Mint Fork #1 (medical)
echo "[3/8] Mint Fork #1 — medical (token #2)"
cast send $AGENT_INFT \
  "mintFork(uint256,bytes32,bytes32,bytes32)" \
  1 \
  $(hash "weights-medical") \
  $(hash "train-medical") \
  $(hash "tee-medical") \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1 | grep -E "(status|transactionHash)" | head -2
echo ""

# Step 4: Mint Fork #2 (legal)
echo "[4/8] Mint Fork #2 — legal (token #3)"
cast send $AGENT_INFT \
  "mintFork(uint256,bytes32,bytes32,bytes32)" \
  1 \
  $(hash "weights-legal") \
  $(hash "train-legal") \
  $(hash "tee-legal") \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1 | grep -E "(status|transactionHash)" | head -2
echo ""

# Step 5: Mint Compose (#4)
echo "[5/8] Mint Compose — medical+legal (token #4)"
cast send $AGENT_INFT \
  "mintCompose(uint256[],bytes32,bytes32,bytes32,uint8)" \
  "[2,3]" \
  $(hash "weights-compose") \
  $(hash "train-compose") \
  $(hash "tee-compose") \
  0 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1 | grep -E "(status|transactionHash)" | head -2
echo ""

# Step 6: Register provider
echo "[6/8] Register compute provider (stake 0.1 0G)"
cast send $VAULT \
  "registerProvider(address,uint256)" \
  $DEPLOYER \
  100000000000000000 \
  --value 100000000000000000 \
  --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1 | grep -E "(status|transactionHash)" | head -2
echo ""

# Step 7: Get inference price
echo "[7/8] Pay + settle inferences (token #4)"
PRICE=$(cast call $VAULT "getInferencePrice(uint256)" 4 --rpc-url $RPC | sed 's/^0x//' | tr -d '\n')
PRICE_DEC=$(echo $((16#$PRICE)))
echo "  → Inference price: $PRICE_DEC wei"

for i in 1 2 3; do
  echo ""
  echo "  Inference #$i:"
  RESULT=$(cast send $VAULT \
    "payInference(uint256)" \
    4 \
    --value $PRICE_DEC \
    --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1)
  PAY_TX=$(echo "$RESULT" | grep transactionHash | awk '{print $2}')
  echo "    pay tx:    $PAY_TX"

  # Get requestId from receipt logs
  LOGS=$(cast receipt $PAY_TX --rpc-url $RPC 2>&1 | grep -A1 "topic1" | head -1)
  REQ_ID=$(cast logs --address $VAULT --from-block latest --to-block latest \
    "InferenceRequested(bytes32,uint256,address,uint256)" \
    --rpc-url $RPC 2>&1 | grep "topic1" | tail -1 | awk '{print $2}')

  if [ -z "$REQ_ID" ]; then
    # Fallback: read from event topic
    REQ_ID=$(cast receipt $PAY_TX --rpc-url $RPC --json 2>&1 | grep -o '"topics":\[[^]]*\]' | head -1 | grep -oE '0x[a-f0-9]{64}' | sed -n '2p')
  fi

  echo "    requestId: $REQ_ID"

  if [ -n "$REQ_ID" ]; then
    SETTLE_RESULT=$(cast send $VAULT \
      "settleInference(bytes32,bytes32,bytes)" \
      $REQ_ID \
      $(hash "output-$i") \
      "0x1234abcd" \
      --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY --legacy 2>&1 | grep -E "(status|transactionHash)" | head -2)
    echo "    settle:    $SETTLE_RESULT"
  fi
done

echo ""
echo "[8/8] Verify state"
TOTAL=$(cast call $REGISTRY "totalAgents()" --rpc-url $RPC | sed 's/^0x//')
TOTAL_DEC=$(echo $((16#$TOTAL)))
echo "  Total agents minted: $TOTAL_DEC"
echo ""
echo "═══════════════════════════════════════════════"
echo "  Seed Complete"
echo "═══════════════════════════════════════════════"
echo ""
echo "View on explorer:"
echo "  https://chainscan-galileo.0g.ai/address/$AGENT_INFT"
echo "  https://chainscan-galileo.0g.ai/address/$VAULT"
