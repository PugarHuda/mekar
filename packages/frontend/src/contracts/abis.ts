/**
 * Minimal ABIs for MEKAR contracts.
 *
 * Only the functions and events we actually call from the frontend.
 * After `forge build`, replace with full ABIs from `out/AgentINFT.sol/AgentINFT.json`.
 */

export const AGENT_INFT_ABI = [
  // Mint flows
  {
    type: "function",
    name: "mintGenesis",
    stateMutability: "nonpayable",
    inputs: [
      { name: "weightsPtr", type: "bytes32" },
      { name: "trainingMerkle", type: "bytes32" },
      { name: "teeProof", type: "bytes32" },
      {
        name: "schema",
        type: "tuple",
        components: [
          { name: "directOwnerBps", type: "uint16" },
          { name: "gen1Bps", type: "uint16" },
          { name: "gen2Bps", type: "uint16" },
          { name: "gen3PlusBps", type: "uint16" },
          { name: "trainingDataBps", type: "uint16" },
          { name: "maxGenerationsPaid", type: "uint16" },
        ],
      },
      { name: "mode", type: "uint8" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintFork",
    stateMutability: "nonpayable",
    inputs: [
      { name: "parentId", type: "uint256" },
      { name: "weightsPtr", type: "bytes32" },
      { name: "trainingMerkle", type: "bytes32" },
      { name: "teeProof", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintCompose",
    stateMutability: "nonpayable",
    inputs: [
      { name: "parentIds", type: "uint256[]" },
      { name: "weightsPtr", type: "bytes32" },
      { name: "trainingMerkle", type: "bytes32" },
      { name: "teeProof", type: "bytes32" },
      { name: "strategy", type: "uint8" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  // View
  {
    type: "function",
    name: "getLineage",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "parents", type: "uint256[]" },
          { name: "generation", type: "uint16" },
          { name: "weightsPointer", type: "bytes32" },
          { name: "trainingDataMerkle", type: "bytes32" },
          { name: "teeAttestation", type: "bytes32" },
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint64" },
          { name: "alignmentHealth", type: "uint16" },
          { name: "mode", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    type: "event",
    name: "AgentMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "parents", type: "uint256[]", indexed: false },
      { name: "generation", type: "uint16", indexed: false },
      { name: "mode", type: "uint8", indexed: false },
    ],
  },
] as const;

export const MEKAR_REGISTRY_ABI = [
  {
    type: "function",
    name: "totalAgents",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAncestors",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "maxDepth", type: "uint16" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getDescendants",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getAgentsByCreator",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "updateMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataPointer", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getMetadataPointer",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

export const ROYALTY_VAULT_ABI = [
  {
    type: "function",
    name: "registerProvider",
    stateMutability: "payable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "stake", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isRegisteredProvider",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "payInference",
    stateMutability: "payable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "requestId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "settleInference",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId", type: "bytes32" },
      { name: "outputHash", type: "bytes32" },
      { name: "teeAttestation", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getInferencePrice",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "InferenceRequested",
    inputs: [
      { name: "requestId", type: "bytes32", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RoyaltyPaid",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "generation", type: "uint16", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "InferenceSettled",
    inputs: [
      { name: "requestId", type: "bytes32", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "provider", type: "address", indexed: false },
      { name: "totalDistributed", type: "uint256", indexed: false },
    ],
  },
] as const;
