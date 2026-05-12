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

/**
 * Lower bound for scans — block at which the v2 RoyaltyVault was deployed.
 * Scanning back from `latestBlock - N` blocks miscounts when settlements
 * are old enough to fall outside that window (Galileo at ~1 block/sec
 * means a 5-day-old settlement is already ~430k blocks behind).
 *
 * Bumping the literal here when redeploying the vault avoids over-scanning
 * pre-deploy noise.
 */
const VAULT_V2_DEPLOY_BLOCK = 32160000n;

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
        // Start from the vault's deploy block so any historical settlement
        // is included no matter how old — the previous floor of
        // `latestBlock - 200k` silently dropped events older than ~55 hours.
        const fromBlock =
          latestBlock > VAULT_V2_DEPLOY_BLOCK ? VAULT_V2_DEPLOY_BLOCK : BigInt(0);

        // Scan in chunks to respect RPC limits
        const allLogs: Array<{
          txHash: `0x${string}`;
          agentId: number;
          generation: number;
          amount: bigint;
          blockNumber: bigint;
        }> = [];

        for (let cursor = fromBlock; cursor <= latestBlock; cursor += SCAN_BLOCK_RANGE) {
          if (cancelled) return;
          const toBlock =
            cursor + SCAN_BLOCK_RANGE > latestBlock ? latestBlock : cursor + SCAN_BLOCK_RANGE;

          try {
            const logs = await publicClient.getLogs({
              address: CONTRACT_ADDRESSES.RoyaltyVault,
              event: ROYALTY_PAID_EVENT,
              args: { recipient: address },
              fromBlock: cursor,
              toBlock,
            });

            for (const log of logs) {
              allLogs.push({
                txHash: log.transactionHash,
                agentId: Number(log.args.agentId ?? BigInt(0)),
                generation: Number(log.args.generation ?? 0),
                amount: log.args.amount ?? BigInt(0),
                blockNumber: log.blockNumber,
              });
            }
          } catch {
            // Skip range on error, continue scanning
          }
        }

        if (cancelled) return;

        const total = allLogs.reduce((sum, l) => sum + l.amount, BigInt(0));

        // Count distinct (agentId × tx) for inferences
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
        // Start from the vault's deploy block so any historical settlement
        // is included no matter how old — the previous floor of
        // `latestBlock - 200k` silently dropped events older than ~55 hours.
        const fromBlock =
          latestBlock > VAULT_V2_DEPLOY_BLOCK ? VAULT_V2_DEPLOY_BLOCK : BigInt(0);

        const all: Array<{
          txHash: `0x${string}`;
          recipient: `0x${string}`;
          generation: number;
          amount: bigint;
          blockNumber: bigint;
        }> = [];

        for (let cursor = fromBlock; cursor <= latestBlock; cursor += SCAN_BLOCK_RANGE) {
          if (cancelled) return;
          const toBlock =
            cursor + SCAN_BLOCK_RANGE > latestBlock ? latestBlock : cursor + SCAN_BLOCK_RANGE;

          try {
            const logs = await publicClient.getLogs({
              address: CONTRACT_ADDRESSES.RoyaltyVault,
              event: ROYALTY_PAID_EVENT,
              args: { agentId: BigInt(agentId) },
              fromBlock: cursor,
              toBlock,
            });

            for (const log of logs) {
              all.push({
                txHash: log.transactionHash,
                recipient: log.args.recipient ?? "0x0000000000000000000000000000000000000000",
                generation: Number(log.args.generation ?? 0),
                amount: log.args.amount ?? BigInt(0),
                blockNumber: log.blockNumber,
              });
            }
          } catch {
            // ignore range errors
          }
        }

        if (cancelled) return;

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
