"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";

/**
 * useTrendingData
 * Aggregates RoyaltyPaid events into per-agent rollups for the
 * /trending page. Replaces the procedural fallback (alignment health
 * sort) with real on-chain numbers.
 *
 * Design notes:
 *   - One scan, all agents. Sharing the chunked log scan across the
 *     whole protocol gives O(blocks) instead of O(agents * blocks).
 *   - Cached in localStorage keyed by VAULT_DEPLOY_BLOCK so a new
 *     contract deploy auto-invalidates without manual flush.
 *   - Returns aggregates only; the page sorts.
 *
 * For real production scale a subgraph is the right call. This hook
 * is the "no infrastructure" path that still produces real numbers
 * for the hackathon demo.
 */

const ROYALTY_PAID_EVENT = parseAbiItem(
    "event RoyaltyPaid(uint256 indexed agentId, address indexed recipient, uint16 generation, uint256 amount)"
);

const SCAN_BLOCK_RANGE = 49_000n; // 0G RPC has a 50k getLogs ceiling
const SCAN_CONCURRENCY = 4;
// Cap on how far back the FIRST (uncached) scan reaches. Without it
// the cold-start scan is O(chain height) — every new visitor pays for
// the entire history. 1.2M blocks at ~2s/block ≈ the last ~28 days,
// which is the meaningful "trending" horizon anyway. Subsequent visits
// scan only the delta from the cached lastBlock, so the full window
// fills in incrementally without anyone paying the whole cost at once.
// Override with NEXT_PUBLIC_TRENDING_SCAN_WINDOW for a wider history.
const TRENDING_SCAN_WINDOW: bigint = (() => {
    const raw = process.env.NEXT_PUBLIC_TRENDING_SCAN_WINDOW;
    if (raw && /^\d+$/.test(raw)) return BigInt(raw);
    return 1_200_000n;
})();
const VAULT_DEPLOY_BLOCK: bigint = (() => {
    const raw = process.env.NEXT_PUBLIC_VAULT_DEPLOY_BLOCK;
    if (raw && /^\d+$/.test(raw)) return BigInt(raw);
    return 32160000n;
})();

async function withConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
): Promise<T[]> {
    const out: T[] = new Array(tasks.length) as T[];
    let next = 0;
    async function worker() {
        for (;;) {
            const i = next++;
            if (i >= tasks.length) return;
            out[i] = await tasks[i]();
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
    );
    return out;
}

export type TrendingRow = {
    agentId: number;
    totalEarned: bigint;
    inferenceCount: number;
    lastBlock: bigint;
};

const CACHE_KEY = "mekar:trending:v1";
type StoredRow = {
    agentId: number;
    totalEarned: string;
    inferenceCount: number;
    lastBlock: string;
};
type CacheBlob = {
    fromAnchor: string;
    lastBlock: string;
    rows: StoredRow[];
};

function readCache(): CacheBlob | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CacheBlob;
        if (parsed.fromAnchor !== VAULT_DEPLOY_BLOCK.toString()) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(blob: CacheBlob) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(blob));
    } catch {
        // localStorage full / private mode — silent.
    }
}

export function useTrendingData(): {
    rows: TrendingRow[];
    isLoading: boolean;
} {
    const publicClient = usePublicClient();
    const [state, setState] = useState<{ rows: TrendingRow[]; isLoading: boolean }>({
        rows: [],
        isLoading: false,
    });

    useEffect(() => {
        if (!publicClient) return;
        let cancelled = false;
        setState((s) => ({ ...s, isLoading: true }));

        (async () => {
            try {
                const latestBlock = await publicClient.getBlockNumber();
                const cached = readCache();

                // Start from cached lastBlock + 1 if we have it. On a
                // cold start, begin no earlier than `latestBlock -
                // TRENDING_SCAN_WINDOW` so the first scan is bounded —
                // but never before the vault deploy block (no events
                // exist before it) and never below 0.
                let fromBlock: bigint;
                if (cached) {
                    fromBlock = BigInt(cached.lastBlock) + 1n;
                } else {
                    const windowStart =
                        latestBlock > TRENDING_SCAN_WINDOW
                            ? latestBlock - TRENDING_SCAN_WINDOW
                            : 0n;
                    fromBlock =
                        windowStart > VAULT_DEPLOY_BLOCK
                            ? windowStart
                            : VAULT_DEPLOY_BLOCK;
                }

                // Hydrate from cache immediately for snappy UX.
                const agg = new Map<number, TrendingRow>();
                if (cached) {
                    for (const r of cached.rows) {
                        agg.set(r.agentId, {
                            agentId: r.agentId,
                            totalEarned: BigInt(r.totalEarned),
                            inferenceCount: r.inferenceCount,
                            lastBlock: BigInt(r.lastBlock),
                        });
                    }
                    if (!cancelled) {
                        setState({
                            rows: Array.from(agg.values()),
                            isLoading: true,
                        });
                    }
                }

                // Build chunked scan windows.
                const ranges: { from: bigint; to: bigint }[] = [];
                for (let c = fromBlock; c <= latestBlock; c += SCAN_BLOCK_RANGE) {
                    const to =
                        c + SCAN_BLOCK_RANGE > latestBlock ? latestBlock : c + SCAN_BLOCK_RANGE;
                    ranges.push({ from: c, to });
                }

                const tasks = ranges.map(
                    (r) => () =>
                        publicClient.getLogs({
                            address: CONTRACT_ADDRESSES.RoyaltyVault,
                            event: ROYALTY_PAID_EVENT,
                            fromBlock: r.from,
                            toBlock: r.to,
                        }) as Promise<
                            {
                                blockNumber: bigint;
                                transactionHash: `0x${string}`;
                                args: { agentId?: bigint; amount?: bigint };
                            }[]
                        >
                );
                const batched = await withConcurrency(tasks, SCAN_CONCURRENCY);
                if (cancelled) return;

                // Dedupe by (txHash, agentId) — same payInference fires
                // multiple RoyaltyPaid events (one per gen recipient), but
                // they all share the same agentId so we sum them once per
                // recipient. The actual fan-out is correctly captured
                // because each event has its own `amount`.
                const seenTxAgent = new Set<string>();
                for (const log of batched.flat()) {
                    const agentId = Number(log.args.agentId ?? 0n);
                    if (!agentId) continue;
                    const amount = log.args.amount ?? 0n;
                    const dedupKey = `${log.transactionHash}:${agentId}:${log.blockNumber}:${amount.toString()}`;
                    if (seenTxAgent.has(dedupKey)) continue;
                    seenTxAgent.add(dedupKey);

                    const cur = agg.get(agentId) ?? {
                        agentId,
                        totalEarned: 0n,
                        inferenceCount: 0,
                        lastBlock: 0n,
                    };
                    cur.totalEarned += amount;
                    // Each unique (txHash, agentId) = one inference billed.
                    cur.inferenceCount += 1;
                    if (log.blockNumber > cur.lastBlock) cur.lastBlock = log.blockNumber;
                    agg.set(agentId, cur);
                }

                const rows = Array.from(agg.values());
                writeCache({
                    fromAnchor: VAULT_DEPLOY_BLOCK.toString(),
                    lastBlock: latestBlock.toString(),
                    rows: rows.map((r) => ({
                        agentId: r.agentId,
                        totalEarned: r.totalEarned.toString(),
                        inferenceCount: r.inferenceCount,
                        lastBlock: r.lastBlock.toString(),
                    })),
                });

                if (!cancelled) setState({ rows, isLoading: false });
            } catch {
                if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [publicClient]);

    return state;
}
