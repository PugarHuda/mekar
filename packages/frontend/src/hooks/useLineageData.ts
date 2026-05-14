"use client";

import { useReadContracts } from "wagmi";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { AGENT_INFT_ABI, MEKAR_REGISTRY_ABI } from "@/contracts/abis";

export type LineageNode = {
  id: number;
  parents: number[];
  generation: number;
  creator: `0x${string}`;
  owner?: `0x${string}`;
  alignmentHealth: number;
  createdAt: number;
  mode: number;
  weightsPointer: `0x${string}`;
};

export type LineageEdge = {
  source: number;
  target: number;
};

/**
 * Fetch all agents + their lineages from on-chain.
 *
 * For MVP we walk by tokenId (1..totalSupply).
 * Production: use indexer / subgraph for performance.
 */
export function useLineageData(): {
  nodes: LineageNode[];
  edges: LineageEdge[];
  isLoading: boolean;
  totalAgents: number;
  /** Force-refetch totalAgents + all lineages. Call after a mint tx
   *  confirms so the new bloom shows up immediately in pickers etc. */
  refetch: () => Promise<void>;
} {
  // First read: total agent count
  const {
    data: countData,
    isLoading: loadingCount,
    refetch: refetchCount,
  } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESSES.MekarRegistry,
        abi: MEKAR_REGISTRY_ABI,
        functionName: "totalAgents",
      },
    ],
    query: { enabled: isDeployed },
  });

  const totalAgents = countData?.[0]?.result ? Number(countData[0].result) : 0;

  // Build batch of getLineage + ownerOf for all agents
  const lineageContracts = Array.from({ length: totalAgents }, (_, i) => {
    const id = BigInt(i + 1);
    return [
      {
        address: CONTRACT_ADDRESSES.AgentINFT,
        abi: AGENT_INFT_ABI,
        functionName: "getLineage" as const,
        args: [id],
      },
      {
        address: CONTRACT_ADDRESSES.AgentINFT,
        abi: AGENT_INFT_ABI,
        functionName: "ownerOf" as const,
        args: [id],
      },
    ];
  }).flat();

  const {
    data: lineageData,
    isLoading: loadingLineages,
    refetch: refetchLineages,
  } = useReadContracts({
    contracts: lineageContracts,
    query: { enabled: isDeployed && totalAgents > 0 },
  });

  // Parse into nodes + edges
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  // Solidity struct AgentLineage flattened to its readonly TS shape.
  // Kept local so the parser narrows the result without leaking `any`.
  type ChainLineage = {
    parents: readonly bigint[];
    generation: number;
    weightsPointer: `0x${string}`;
    trainingDataMerkle: `0x${string}`;
    teeAttestation: `0x${string}`;
    creator: `0x${string}`;
    createdAt: bigint;
    alignmentHealth: number;
    mode: number;
  };

  if (lineageData && totalAgents > 0) {
    for (let i = 0; i < totalAgents; i++) {
      const lineageResult = lineageData[i * 2];
      const ownerResult = lineageData[i * 2 + 1];

      if (lineageResult?.status !== "success" || !lineageResult.result) continue;

      const lineage = lineageResult.result as ChainLineage;
      const id = i + 1;

      nodes.push({
        id,
        parents: lineage.parents.map((p: bigint) => Number(p)),
        generation: Number(lineage.generation),
        creator: lineage.creator,
        owner: ownerResult?.status === "success" ? (ownerResult.result as `0x${string}`) : undefined,
        alignmentHealth: Number(lineage.alignmentHealth),
        createdAt: Number(lineage.createdAt),
        mode: Number(lineage.mode),
        weightsPointer: lineage.weightsPointer,
      });

      // Edges from each parent → this child
      for (const parentId of lineage.parents) {
        edges.push({ source: Number(parentId), target: id });
      }
    }
  }

  // Refetch totalAgents first (new mints bump it), then per-agent reads.
  // Two-step matters: if totalAgents goes 5→6, lineageContracts[10..11]
  // didn't exist on the previous render, so refetching the old contracts
  // array alone won't pull data for the new agent. The count refetch
  // re-runs the hook, which rebuilds lineageContracts to length 12.
  const refetch = async () => {
    await refetchCount();
    await refetchLineages();
  };

  return {
    nodes,
    edges,
    isLoading: loadingCount || loadingLineages,
    totalAgents,
    refetch,
  };
}
