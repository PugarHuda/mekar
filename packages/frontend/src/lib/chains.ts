import { Chain } from "viem";

/**
 * 0G Galileo Testnet (V3 testnet)
 * @see https://docs.0g.ai/developer-hub/testnet/testnet-overview
 */
export const zgGalileo: Chain = {
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: {
    name: "0G",
    symbol: "0G",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc-testnet.0g.ai"],
    },
    public: {
      http: ["https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Galileo Explorer",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
};

/**
 * 0G Aristotle Mainnet (live since Sept 2025)
 */
export const zgMainnet: Chain = {
  id: 16661,
  name: "0G-Mainnet",
  nativeCurrency: {
    name: "0G",
    symbol: "0G",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc.0g.ai"],
    },
    public: {
      http: ["https://evmrpc.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Explorer",
      url: "https://chainscan.0g.ai",
    },
  },
};

export const ACTIVE_CHAIN =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? zgMainnet : zgGalileo;

export const FAUCET_URL = "https://faucet.0g.ai";

/**
 * Helper to format an explorer link for a tx, address, or block
 */
export function explorerLink(
  hash: string,
  type: "tx" | "address" | "block" = "tx"
): string {
  const base = ACTIVE_CHAIN.blockExplorers?.default.url ?? "";
  return `${base}/${type}/${hash}`;
}
