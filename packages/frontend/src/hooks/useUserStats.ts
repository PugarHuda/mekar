"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import { ROYALTY_VAULT_ABI } from "@/contracts/abis";
import { parseAbiItem } from "viem";

export type UserStats = {
  totalRoyaltyEarned: bigint;
  totalInferences: number;
  inferencesAsRecipient: Array<{
    txHash: `0x${string}`;
    agentId: number;
    generation: number;
    amount: bigint;
    blockNumber: bigint;
  }>;
  isLoading: boolean;
};

const ROYALTY_PAID_EVENT = parseAbiItem(
  "event RoyaltyPaid(uint256 indexed agentId, address indexed recipient, uint16 generation, uint256 amount)"
);

const SCAN_BLOCK_RANGE = 50_000n; // chunk size for getLogs (some RPCs cap)
const SCAN_CONCURRENCY = 5;       // parallel getLogs calls per batch

/**
 * Lower bound for scans — block at which the active RoyaltyVault was
 * deployed on the active network. Read from
 * `NEXT_PUBLIC_VAULT_DEPLOY_BLOCK` so the same code works on both
 * Galileo testnet (~32160000) and Aristotle mainnet (a different number
 * once redeployed). Falls back to the testnet anchor for backward
 * compatibility if the env var is missing.
 *
 * Scanning back from `latestBlock - N` miscounts when settlements are
 * old enough to fall outside that window (Galileo at ~1 block/sec
 * means a 5-day-old settlement is already ~430k blocks behind), so the
 * anchor must be precise per network.
 */
const VAULT_V2_DEPLOY_BLOCK: bigint = (() => {
  const raw = process.env.NEXT_PUBLIC_VAULT_DEPLOY_BLOCK;
  if (raw && /^\d+$/.test(raw)) return BigInt(raw);
  return 32160000n; // Galileo testnet v2 anchor (default)
})();

// --------------- localStorage cache for historical event scans ----------
// Settlements happened up to 700k+ blocks ago at the moment, so the first
// page load otherwise sequences ~14 getLogs calls and stalls the UI for
// 10–20s. Cache keeps the result keyed by (vault, scope), then the next
// load only scans the delta from the cached lastBlock to the current head.
//
// Versioned on VAULT_V2_DEPLOY_BLOCK so a future v3 deploy auto-invalidates
// every browser without manual cache flush.

type CacheEntryV1<L> = {
  vault: string;
  fromAnchor: string;          // VAULT_V2_DEPLOY_BLOCK as string (cache version key)
  lastBlock: string;           // BigInt as string
  logs: L[];                   // logs with bigint fields already stringified
};

function cacheRead<L>(key: string): CacheEntryV1<L> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntryV1<L>;
    if (parsed.fromAnchor !== VAULT_V2_DEPLOY_BLOCK.toString()) return null;
    if (parsed.vault !== CONTRACT_ADDRESSES.RoyaltyVault.toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function cacheWrite<L>(key: string, entry: CacheEntryV1<L>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Quota / disabled — silent. Next load will just re-scan from anchor.
  }
}

// Promise.all but with concurrency limit so the public Galileo RPC isn't
// hammered with 14 connections in parallel. 5 at a time keeps the parallel
// speedup (~3-5x) without blowing rate limits.
async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= tasks.length) return;
      try {
        out[i] = await tasks[i]();
      } catch {
        out[i] = [] as unknown as T;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
  );
  return out;
}

/**
 * Aggregates `RoyaltyPaid` events to compute a user's earnings + inference count.
 * Falls back gracefully if the RPC limits log range.
 */
export function useUserStats(address: `0x${string}` | undefined): UserStats {
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<UserStats>({
    totalRoyaltyEarned: BigInt(0),
    totalInferences: 0,
    inferencesAsRecipient: [],
    isLoading: false,
  });

  useEffect(() => {
    if (!address || !publicClient) {
      setStats({
        totalRoyaltyEarned: BigInt(0),
        totalInferences: 0,
        inferencesAsRecipient: [],
        isLoading: false,
      });
      return;
    }

    let cancelled = false;
    setStats((s) => ({ ...s, isLoading: true }));

    (async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();

        // Cache lookup — start the new scan from the last cached block + 1
        // when we already have a partial history for this user.
        type StoredLog = {
          txHash: `0x${string}`;
          agentId: number;
          generation: number;
          amount: string; // bigint as string (JSON-safe)
          blockNumber: string;
        };
        const cacheKey = `mekar:logs:user:${address.toLowerCase()}`;
        const cached = cacheRead<StoredLog>(cacheKey);
        const cachedLogs = (cached?.logs ?? []).map((l) => ({
          txHash: l.txHash,
          agentId: l.agentId,
          generation: l.generation,
          amount: BigInt(l.amount),
          blockNumber: BigInt(l.blockNumber),
        }));

        const fromBlock = cached
          ? BigInt(cached.lastBlock) + 1n
          : latestBlock > VAULT_V2_DEPLOY_BLOCK
            ? VAULT_V2_DEPLOY_BLOCK
            : BigInt(0);

        // Surface what we have from cache immediately so the UI isn't blank
        // while the delta-scan runs. The delta itself completes in 1-3s.
        if (cachedLogs.length > 0 && !cancelled) {
          const cachedTotal = cachedLogs.reduce((s, l) => s + l.amount, BigInt(0));
          const distinctCachedTxs = new Set(cachedLogs.map((l) => l.txHash));
          setStats({
            totalRoyaltyEarned: cachedTotal,
            totalInferences: distinctCachedTxs.size,
            inferencesAsRecipient: cachedLogs
              .slice()
              .sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1)),
            isLoading: true, // still scanning the delta
          });
        }

        // Build chunk ranges for the (possibly delta-only) scan.
        const ranges: Array<{ from: bigint; to: bigint }> = [];
        for (let cursor = fromBlock; cursor <= latestBlock; cursor += SCAN_BLOCK_RANGE) {
          const to =
            cursor + SCAN_BLOCK_RANGE > latestBlock
              ? latestBlock
              : cursor + SCAN_BLOCK_RANGE;
          ranges.push({ from: cursor, to });
        }

        // Parallelize. Public Galileo RPC tolerates ~5 concurrent getLogs
        // without rate-limiting; full 14-chunk sequential scan goes from
        // ~20s → ~5s on a cold load.
        const tasks = ranges.map(
          (r) => () =>
            publicClient.getLogs({
              address: CONTRACT_ADDRESSES.RoyaltyVault,
              event: ROYALTY_PAID_EVENT,
              args: { recipient: address },
              fromBlock: r.from,
              toBlock: r.to,
            }) as Promise<
              {
                transactionHash: `0x${string}`;
                blockNumber: bigint;
                args: { agentId?: bigint; generation?: number; amount?: bigint };
              }[]
            >
        );
        const batched = await withConcurrency(tasks, SCAN_CONCURRENCY);

        if (cancelled) return;

        const freshLogs = batched.flat().map((log) => ({
          txHash: log.transactionHash,
          agentId: Number(log.args.agentId ?? BigInt(0)),
          generation: Number(log.args.generation ?? 0),
          amount: log.args.amount ?? BigInt(0),
          blockNumber: log.blockNumber,
        }));

        // Merge — dedupe by (txHash + amount + agentId) so a re-scan
        // overlap doesn't double-count.
        const seen = new Set<string>();
        const allLogs: typeof freshLogs = [];
        for (const l of [...cachedLogs, ...freshLogs]) {
          const key = `${l.txHash}:${l.agentId}:${l.amount.toString()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          allLogs.push(l);
        }

        // Write cache for next visit. Store bigints as strings.
        cacheWrite<StoredLog>(cacheKey, {
          vault: CONTRACT_ADDRESSES.RoyaltyVault.toLowerCase(),
          fromAnchor: VAULT_V2_DEPLOY_BLOCK.toString(),
          lastBlock: latestBlock.toString(),
          logs: allLogs.map((l) => ({
            txHash: l.txHash,
            agentId: l.agentId,
            generation: l.generation,
            amount: l.amount.toString(),
            blockNumber: l.blockNumber.toString(),
          })),
        });

        const total = allLogs.reduce((sum, l) => sum + l.amount, BigInt(0));
        const distinctTxs = new Set(allLogs.map((l) => l.txHash));

        setStats({
          totalRoyaltyEarned: total,
          totalInferences: distinctTxs.size,
          inferencesAsRecipient: allLogs.sort((a, b) =>
            a.blockNumber > b.blockNumber ? -1 : 1
          ),
          isLoading: false,
        });
      } catch {
        if (cancelled) return;
        setStats((s) => ({ ...s, isLoading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  return stats;
}

/**
 * Aggregates royalty earnings + inference count for a specific agent.
 * Used by the agent detail page to show "lifetime royalty distributed via this agent".
 */
export function useAgentInferenceHistory(agentId: number | undefined): {
  inferences: Array<{
    txHash: `0x${string}`;
    recipient: `0x${string}`;
    generation: number;
    amount: bigint;
    blockNumber: bigint;
  }>;
  totalDistributed: bigint;
  totalInferences: number;
  isLoading: boolean;
} {
  const publicClient = usePublicClient();
  const [state, setState] = useState({
    inferences: [] as Array<{
      txHash: `0x${string}`;
      recipient: `0x${string}`;
      generation: number;
      amount: bigint;
      blockNumber: bigint;
    }>,
    totalDistributed: BigInt(0),
    totalInferences: 0,
    isLoading: false,
  });

  useEffect(() => {
    if (!agentId || !publicClient) return;
    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true }));

    (async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();

        // Cache lookup keyed by agentId — mirror of useUserStats cache so
        // /agent/[id] re-visits skip the ~14-chunk historical scan.
        type StoredLog = {
          txHash: `0x${string}`;
          recipient: `0x${string}`;
          generation: number;
          amount: string;
          blockNumber: string;
        };
        const cacheKey = `mekar:logs:agent:${agentId}`;
        const cached = cacheRead<StoredLog>(cacheKey);
        const cachedLogs = (cached?.logs ?? []).map((l) => ({
          txHash: l.txHash,
          recipient: l.recipient,
          generation: l.generation,
          amount: BigInt(l.amount),
          blockNumber: BigInt(l.blockNumber),
        }));

        const fromBlock = cached
          ? BigInt(cached.lastBlock) + 1n
          : latestBlock > VAULT_V2_DEPLOY_BLOCK
            ? VAULT_V2_DEPLOY_BLOCK
            : BigInt(0);

        if (cachedLogs.length > 0 && !cancelled) {
          const cachedTotal = cachedLogs.reduce((s, l) => s + l.amount, BigInt(0));
          const cachedTxs = new Set(cachedLogs.map((l) => l.txHash));
          setState({
            inferences: cachedLogs
              .slice()
              .sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1)),
            totalDistributed: cachedTotal,
            totalInferences: cachedTxs.size,
            isLoading: true,
          });
        }

        const ranges: Array<{ from: bigint; to: bigint }> = [];
        for (let cursor = fromBlock; cursor <= latestBlock; cursor += SCAN_BLOCK_RANGE) {
          const to =
            cursor + SCAN_BLOCK_RANGE > latestBlock
              ? latestBlock
              : cursor + SCAN_BLOCK_RANGE;
          ranges.push({ from: cursor, to });
        }

        const tasks = ranges.map(
          (r) => () =>
            publicClient.getLogs({
              address: CONTRACT_ADDRESSES.RoyaltyVault,
              event: ROYALTY_PAID_EVENT,
              args: { agentId: BigInt(agentId) },
              fromBlock: r.from,
              toBlock: r.to,
            }) as Promise<
              {
                transactionHash: `0x${string}`;
                blockNumber: bigint;
                args: { recipient?: `0x${string}`; generation?: number; amount?: bigint };
              }[]
            >
        );
        const batched = await withConcurrency(tasks, SCAN_CONCURRENCY);

        if (cancelled) return;

        const freshLogs = batched.flat().map((log) => ({
          txHash: log.transactionHash,
          recipient: log.args.recipient ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`),
          generation: Number(log.args.generation ?? 0),
          amount: log.args.amount ?? BigInt(0),
          blockNumber: log.blockNumber,
        }));

        const seen = new Set<string>();
        const all: typeof freshLogs = [];
        for (const l of [...cachedLogs, ...freshLogs]) {
          const key = `${l.txHash}:${l.recipient}:${l.amount.toString()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          all.push(l);
        }

        cacheWrite<StoredLog>(cacheKey, {
          vault: CONTRACT_ADDRESSES.RoyaltyVault.toLowerCase(),
          fromAnchor: VAULT_V2_DEPLOY_BLOCK.toString(),
          lastBlock: latestBlock.toString(),
          logs: all.map((l) => ({
            txHash: l.txHash,
            recipient: l.recipient,
            generation: l.generation,
            amount: l.amount.toString(),
            blockNumber: l.blockNumber.toString(),
          })),
        });

        const total = all.reduce((s, l) => s + l.amount, BigInt(0));
        const txs = new Set(all.map((l) => l.txHash));

        setState({
          inferences: all.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1)),
          totalDistributed: total,
          totalInferences: txs.size,
          isLoading: false,
        });
      } catch {
        if (cancelled) return;
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentId, publicClient]);

  return state;
}
