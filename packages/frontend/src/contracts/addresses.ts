/**
 * MEKAR contract addresses
 *
 * Filled in after `forge script Deploy.s.sol --broadcast`
 * Update from .env: NEXT_PUBLIC_*_ADDRESS
 */
export const CONTRACT_ADDRESSES = {
  AgentINFT: (process.env.NEXT_PUBLIC_AGENT_INFT_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000",
  MekarRegistry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000",
  RoyaltyVault: (process.env.NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000",
  TrainingDataRegistry: (process.env.NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000",
} as const;

export const isDeployed =
  CONTRACT_ADDRESSES.AgentINFT !== "0x0000000000000000000000000000000000000000";
