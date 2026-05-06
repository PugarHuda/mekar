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
} {
  // First read: total agent count
  const { data: countData, isLoading: loadingCount } = useReadContracts({
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

  const { data: lineageData, isLoading: loadingLineages } = useReadContracts({
    contracts: lineageContracts,
    query: { enabled: isDeployed && totalAgents > 0 },
  });

  // Parse into nodes + edges
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  if (lineageData && totalAgents > 0) {
    for (let i = 0; i < totalAgents; i++) {
      const lineageResult = lineageData[i * 2];
      const ownerResult = lineageData[i * 2 + 1];

      if (lineageResult?.status !== "success" || !lineageResult.result) continue;

      const lineage = lineageResult.result as any;
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

  return {
    nodes,
    edges,
    isLoading: loadingCount || loadingLineages,
    totalAgents,
  };
}
