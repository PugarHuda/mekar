"use client";

import { useReadContracts } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import { AGENT_INFT_ABI, MEKAR_REGISTRY_ABI, ROYALTY_VAULT_ABI } from "@/contracts/abis";

export type AgentDetail = {
  id: number;
  parents: number[];
  generation: number;
  creator: `0x${string}`;
  owner: `0x${string}`;
  alignmentHealth: number;
  createdAt: number;
  mode: number;
  weightsPointer: `0x${string}`;
  trainingDataMerkle: `0x${string}`;
  teeAttestation: `0x${string}`;
  inferencePrice: bigint;
  descendants: number[];
};

const MODE_LABELS = ["Strict", "Voluntary", "Audit-Only"];

export function useAgent(agentId: number | undefined): {
  agent: AgentDetail | null;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = agentId !== undefined && agentId > 0;
  const id = enabled ? BigInt(agentId) : BigInt(0);

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: CONTRACT_ADDRESSES.AgentINFT,
        abi: AGENT_INFT_ABI,
        functionName: "getLineage",
        args: [id],
      },
      {
        address: CONTRACT_ADDRESSES.AgentINFT,
        abi: AGENT_INFT_ABI,
        functionName: "ownerOf",
        args: [id],
      },
      {
        address: CONTRACT_ADDRESSES.RoyaltyVault,
        abi: ROYALTY_VAULT_ABI,
        functionName: "getInferencePrice",
        args: [id],
      },
      {
        address: CONTRACT_ADDRESSES.MekarRegistry,
        abi: MEKAR_REGISTRY_ABI,
        functionName: "getDescendants",
        args: [id],
      },
    ],
    query: { enabled },
  });

  if (!enabled || !data || data[0]?.status !== "success" || !data[0].result) {
    return { agent: null, isLoading, error: error ?? null };
  }

  // AgentLineage is a tuple struct on chain. wagmi returns it as a typed
  // readonly object whose keys match the Solidity field names. We narrow
  // here once so the destructure below is fully typed downstream — no
  // `as any` and no field name typos slip past tsc.
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
  const lineage = data[0].result as ChainLineage;
  const owner = data[1]?.result as `0x${string}` | undefined;
  const price = (data[2]?.result as bigint | undefined) ?? BigInt(0);
  const descendantsRaw = (data[3]?.result as readonly bigint[] | undefined) ?? [];

  return {
    agent: {
      id: agentId!,
      parents: lineage.parents.map((p: bigint) => Number(p)),
      generation: Number(lineage.generation),
      creator: lineage.creator,
      owner: owner ?? lineage.creator,
      alignmentHealth: Number(lineage.alignmentHealth),
      createdAt: Number(lineage.createdAt),
      mode: Number(lineage.mode),
      weightsPointer: lineage.weightsPointer,
      trainingDataMerkle: lineage.trainingDataMerkle,
      teeAttestation: lineage.teeAttestation,
      inferencePrice: price,
      descendants: descendantsRaw.map((d) => Number(d)),
    },
    isLoading,
    error: error ?? null,
  };
}

export function modeLabel(mode: number): string {
  return MODE_LABELS[mode] ?? "Unknown";
}
