# MEKAR — Developer Quickstart Recipes

> Copy-paste runnable starters for the most common ways developers
> integrate MEKAR into their own products.

This complements [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md) (the
reference). If you've never touched MEKAR before, read the guide first
for context. If you know what you want to build, pick a recipe below
and adapt.

---

## Table of contents

1. [5-minute "hello MEKAR" with cast](#1-5-minute-hello-mekar-with-cast)
2. [Pay-per-inference Express bot (Node)](#2-pay-per-inference-express-bot-node)
3. [Discord slash command using a MEKAR agent](#3-discord-slash-command-using-a-mekar-agent)
4. [Indexer dashboard — royalty analytics in 80 lines](#4-indexer-dashboard--royalty-analytics-in-80-lines)
5. [React Native mobile inference](#5-react-native-mobile-inference)
6. [Error handling patterns that actually work](#6-error-handling-patterns-that-actually-work)
7. [Gas + fee accounting reference](#7-gas--fee-accounting-reference)
8. [TypeScript types you can copy](#8-typescript-types-you-can-copy)

---

## 1. 5-minute "hello MEKAR" with cast

Verify your wallet can pay an inference and trigger the royalty cascade:

```bash
# Prerequisites
#   - foundry installed (cast)
#   - wallet PK in $PK with ≥ 0.002 OG on Galileo testnet (https://faucet.0g.ai)

RPC=https://evmrpc-testnet.0g.ai
VAULT=0x49eCE891AeA76aad967A83B53DC160328036BABc

# Read the current inference price for agent #4 (Carol's compose)
PRICE=$(cast call $VAULT "getInferencePrice(uint256)(uint256)" 4 --rpc-url $RPC | awk '{print $1}')
echo "Inference price: $PRICE wei"

# Pay it — escrow opens, requestId is emitted as the first indexed topic of InferenceRequested
cast send $VAULT "payInference(uint256)" 4 \
  --value $PRICE \
  --rpc-url $RPC \
  --private-key $PK \
  --legacy \
  --async
```

That's it. You've paid into MEKAR's escrow; a registered compute
provider can now `settleInference(...)` to release royalty across the
lineage. If you also want to settle (you must be a registered provider
first via `vault.registerProvider`), use the pattern in `scripts/seed-more-royalty.sh`.

---

## 2. Pay-per-inference Express bot (Node)

A minimal server that wraps a MEKAR agent invocation as a REST endpoint.
Your end user POSTs, your service pays MEKAR, then returns the response.

```ts
// server.ts
import express from "express";
import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const zg = defineChain({
    id: 16602,
    name: "0G-Galileo-Testnet",
    nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
    rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
});

const VAULT = "0x49eCE891AeA76aad967A83B53DC160328036BABc" as const;
const account = privateKeyToAccount(process.env.PK as `0x${string}`);

const wallet = createWalletClient({ account, chain: zg, transport: http() });
const pub = createPublicClient({ chain: zg, transport: http() });

const app = express();
app.use(express.json());

app.post("/inference/:agentId", async (req, res) => {
    const agentId = BigInt(req.params.agentId);
    try {
        // 1. Read the live price (it can change if the agent owner updates basePrice)
        const price = await pub.readContract({
            address: VAULT,
            abi: [parseAbiItem("function getInferencePrice(uint256) view returns (uint256)")],
            functionName: "getInferencePrice",
            args: [agentId],
        });

        // 2. Pay into escrow — royalty fires later on settleInference
        const hash = await wallet.writeContract({
            address: VAULT,
            abi: [parseAbiItem("function payInference(uint256) payable returns (bytes32)")],
            functionName: "payInference",
            args: [agentId],
            value: price,
        });

        // 3. Pluck requestId from the receipt's first event topic
        const receipt = await pub.waitForTransactionReceipt({ hash });
        const requestId = receipt.logs[0]?.topics[1];

        res.json({ ok: true, txHash: hash, requestId, paid: price.toString() });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.listen(3001, () => console.log("MEKAR bot up on :3001"));
```

Run it: `PK=0x… node --experimental-strip-types server.ts`

In production you'd also run the inference yourself (TEE on 0G Compute
or a regular GPU server), then have a registered provider wallet call
`settleInference` with the response hash + attestation.

---

## 3. Discord slash command using a MEKAR agent

Glue MEKAR to Discord so a `/ask` command pays an agent on chain and
posts the response back to the channel.

```ts
// discord-bot.ts
import { Client, GatewayIntentBits, SlashCommandBuilder } from "discord.js";
import { createWalletClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const VAULT = "0x49eCE891AeA76aad967A83B53DC160328036BABc" as const;
const AGENT_ID = 4n;   // pick your favourite MEKAR agent

const account = privateKeyToAccount(process.env.PK as `0x${string}`);
const wallet = createWalletClient({
    account,
    chain: { id: 16602, name: "0G", nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 }, rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } } } as any,
    transport: http(),
});

const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.on("interactionCreate", async (i) => {
    if (!i.isChatInputCommand() || i.commandName !== "ask") return;
    const prompt = i.options.getString("prompt", true);
    await i.deferReply();

    try {
        // Pay the inference — the response itself comes from your own AI service;
        // MEKAR handles the on-chain royalty leg.
        const hash = await wallet.writeContract({
            address: VAULT,
            abi: [parseAbiItem("function payInference(uint256) payable returns (bytes32)")],
            functionName: "payInference",
            args: [AGENT_ID],
            value: 1200000000000000n,  // 0.0012 OG, the current price
        });

        // Run inference however you like (OpenAI, local model, 0G Compute…) — out of scope
        const answer = await yourAiServiceCall(prompt);

        await i.editReply(
            `**${answer}**\n\n` +
            `_Royalty cascaded to agent #${AGENT_ID}'s lineage on 0G — [tx](https://chainscan-galileo.0g.ai/tx/${hash})_`
        );
    } catch (err) {
        await i.editReply(`Inference failed: ${(err as Error).message}`);
    }
});

declare function yourAiServiceCall(prompt: string): Promise<string>;
bot.login(process.env.DISCORD_TOKEN);
```

The on-chain receipt link in the reply doubles as a credibility marker
— users can verify the royalty actually settled.

---

## 4. Indexer dashboard — royalty analytics in 80 lines

A small TS script that builds a per-agent earnings leaderboard from the
RoyaltyPaid event log.

```ts
// indexer.ts
import { createPublicClient, http, parseAbiItem } from "viem";

const zg = { id: 16602, name: "0G", nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 }, rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } } } as const;
const VAULT = "0x49eCE891AeA76aad967A83B53DC160328036BABc";
const DEPLOY_BLOCK = 32160000n;

const client = createPublicClient({ chain: zg as any, transport: http() });

const event = parseAbiItem(
    "event RoyaltyPaid(uint256 indexed agentId, address indexed recipient, uint16 generation, uint256 amount)"
);

async function main() {
    const latest = await client.getBlockNumber();
    const CHUNK = 50_000n;
    type Payout = { agentId: number; recipient: `0x${string}`; amount: bigint };
    const payouts: Payout[] = [];

    // Parallel chunked scan — 5 at a time so the public RPC isn't rate-limited
    const ranges: { from: bigint; to: bigint }[] = [];
    for (let f = DEPLOY_BLOCK; f <= latest; f += CHUNK) {
        ranges.push({ from: f, to: f + CHUNK > latest ? latest : f + CHUNK });
    }
    const results = await Promise.all(
        ranges.map((r) =>
            client.getLogs({ address: VAULT as `0x${string}`, event, fromBlock: r.from, toBlock: r.to })
        )
    );
    for (const logs of results) {
        for (const log of logs) {
            payouts.push({
                agentId: Number(log.args.agentId),
                recipient: log.args.recipient as `0x${string}`,
                amount: log.args.amount as bigint,
            });
        }
    }

    // Group by recipient → total earned
    const byRecipient = new Map<string, bigint>();
    for (const p of payouts) {
        byRecipient.set(p.recipient, (byRecipient.get(p.recipient) ?? 0n) + p.amount);
    }
    const leaderboard = [...byRecipient.entries()]
        .sort(([, a], [, b]) => (b > a ? 1 : -1))
        .slice(0, 10);

    console.log("Top 10 royalty earners (OG):");
    for (const [addr, total] of leaderboard) {
        console.log(`  ${addr}  →  ${(Number(total) / 1e18).toFixed(6)}`);
    }
}
main();
```

Run: `tsx indexer.ts`. Output gives you the live leaderboard from
on-chain RoyaltyPaid events.

Drop this into a cron + database and you've built MEKAR's analytics
dashboard. The same loop powers the frontend's `useUserStats` hook
(see `packages/frontend/src/hooks/useUserStats.ts`).

---

## 5. React Native mobile inference

Wagmi works in React Native via `@wagmi/core` + WalletConnect. Skeleton
hook for paying an agent from a phone:

```tsx
// useMekarInference.ts
import { useWriteContract, useReadContract } from "wagmi";
import { parseAbiItem } from "viem";

const VAULT = "0x49eCE891AeA76aad967A83B53DC160328036BABc" as const;

export function useMekarInference(agentId: bigint) {
    const { data: price } = useReadContract({
        address: VAULT,
        abi: [parseAbiItem("function getInferencePrice(uint256) view returns (uint256)")],
        functionName: "getInferencePrice",
        args: [agentId],
    });

    const { writeContract, data: txHash, isPending } = useWriteContract();

    const pay = () => {
        if (!price) return;
        writeContract({
            address: VAULT,
            abi: [parseAbiItem("function payInference(uint256) payable returns (bytes32)")],
            functionName: "payInference",
            args: [agentId],
            value: price,
        });
    };

    return { price, pay, txHash, isPending };
}
```

UI side: a button that calls `pay()`, shows `isPending` while the
wallet prompts for signature, surfaces `txHash` to a chainscan link
on confirmation. The WalletConnect modal handles the mobile-deep-link
to whichever wallet the user has installed.

---

## 6. Error handling patterns that actually work

MEKAR is on a testnet RPC that's reliable most of the time but
occasionally drops connections mid-receipt. Three patterns we've
hardened through pain:

### a) `cast send` returns "null response" mid-tx

```bash
# DON'T: cast send ... (blocks waiting for receipt, can hang)
# DO:    cast send ... --async (returns the tx hash immediately)
TX=$(cast send $VAULT "payInference(uint256)" 4 --value $PRICE \
  --rpc-url $RPC --private-key $PK --legacy --async)

# Then poll receipt with backoff
for i in 2 3 4 5 6; do
    sleep $i
    status=$(cast receipt $TX --rpc-url $RPC 2>/dev/null | grep ^status | awk '{print $2}')
    [ "$status" = "1" ] && break
done
```

### b) `getLogs` block-range too wide → silently returns empty

Galileo's RPC happily returns `[]` for ranges of >100k blocks even
when events exist. Always chunk to ≤50k:

```ts
for (let from = startBlock; from <= latest; from += 50_000n) {
    const to = from + 50_000n > latest ? latest : from + 50_000n;
    const chunk = await client.getLogs({ address, event, fromBlock: from, toBlock: to });
    // ...
}
```

### c) `payInference` succeeds but `settleInference` errors out

The escrow has a 1-hour timeout. If the provider never settles, any
caller can recover:

```ts
await client.writeContract({
    address: VAULT,
    abi: [parseAbiItem("function refundIfTimeout(bytes32 requestId)")],
    functionName: "refundIfTimeout",
    args: [requestId],
});
```

Funds return to the original payer. We've also handled the case where
an ancestor wallet is unrecoverable (contract reverts on receive) —
the share gets swept into `protocolFeesAccrued` rather than blocking
the whole settle (the Q5 fix).

---

## 7. Gas + fee accounting reference

Approximate costs at current Galileo gas (you'll see these in your
integration's wallet billing):

| Operation | Gas | OG cost (at 4 gwei) |
|---|---:|---:|
| `mintGenesis` | ~340k | ~0.00136 OG |
| `mintFork` | ~270k | ~0.00108 OG |
| `mintCompose` | varies (BFS dedup), median ~580k | ~0.00232 OG |
| `payInference` | ~165k | ~0.00066 OG |
| `settleInference` (3-deep cascade) | ~165k | ~0.00066 OG |
| `settleInference` (5-deep cascade) | ~225k | ~0.00090 OG |
| Storage `Indexer.upload` (tiny file, anchor only) | n/a | ~0.00003 OG |
| AlignmentAuditor `flagAgent` | ~75k | ~0.00030 OG |

Plus the **inference fee** that flows through royalty:
- Base price: 0.001 OG (current default, configurable per-agent by owner)
- +10% protocol fee → treasury
- +10% provider fee → registered compute provider
- Total per inference: 0.0012 OG

The cascade then splits the 0.001 base:
- 50% to direct owner
- 25% to gen1 parents (split equally if multiple)
- 15% to gen2
- 7% to gen3+ (capped at depth 10)
- 3% to training data contributors (or creator if none registered)

Anything that can't be distributed (deep gen, slashed alignment,
burned recipient) consolidates into `protocolFeesAccrued`.

---

## 8. TypeScript types you can copy

```ts
// MEKAR.types.ts — copy these into your project if you don't want to
// pull the full ABI imports.

export type AgentLineage = {
    parents: bigint[];
    generation: number;       // uint16
    weightsPointer: `0x${string}`;
    trainingDataMerkle: `0x${string}`;
    teeAttestation: `0x${string}`;
    creator: `0x${string}`;
    createdAt: bigint;        // uint64 (unix seconds)
    alignmentHealth: number;  // uint16, 10000 = 100%
    mode: 0 | 1 | 2;          // Strict | Voluntary | AuditOnly
};

export type RoyaltySchema = {
    directOwnerBps: number;   // uint16, sums must = 10000
    gen1Bps: number;
    gen2Bps: number;
    gen3PlusBps: number;
    trainingDataBps: number;
    maxGenerationsPaid: number; // uint16, capped at 10 by contract
};

export type PaymentEscrow = {
    payer: `0x${string}`;
    agentId: bigint;
    amount: bigint;
    timestamp: bigint;
    status: 0 | 1 | 2 | 3;     // None | Escrowed | Settled | Refunded
};

export type RoyaltyPaidEvent = {
    agentId: bigint;
    recipient: `0x${string}`;
    generation: number;
    amount: bigint;            // wei
};

export type InferenceSettledEvent = {
    requestId: `0x${string}`;
    agentId: bigint;
    provider: `0x${string}`;
    totalDistributed: bigint;
};
```

---

## Where to go next

- Full reference: [`INTEGRATION_GUIDE.md`](./INTEGRATION_GUIDE.md)
- Architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Hackathon submission (with on-chain proofs): [`HACKATHON_SUBMISSION.md`](./HACKATHON_SUBMISSION.md)
- Contract source: [`packages/contracts/contracts/`](../packages/contracts/contracts/)
- Reference frontend implementation: [`packages/frontend/src/`](../packages/frontend/src/)

If you build something on top of MEKAR, open an issue or PR — we'll
add it as a "Live integrations" section here.
