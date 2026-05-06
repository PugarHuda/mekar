import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from monorepo root
loadEnv({ path: resolve(__dirname, "../../../../.env") });

const ConfigSchema = z.object({
  network: z.enum(["galileo", "mainnet"]).default("galileo"),
  rpcUrl: z.string().url(),
  chainId: z.coerce.number(),
  storageIndexer: z.string().url(),
  computeBrokerUrl: z.string().optional(),
  port: z.coerce.number().default(3001),
  corsOrigin: z.string().default("http://localhost:3000"),

  contracts: z.object({
    agentInft: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    registry: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    royaltyVault: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    trainingDataRegistry: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  }),

  wallet: z.object({
    privateKey: z.string().optional(),
  }),
});

const network = (process.env.NEXT_PUBLIC_NETWORK ?? "galileo") as "galileo" | "mainnet";
const isGalileo = network === "galileo";

export const config = ConfigSchema.parse({
  network,
  rpcUrl: isGalileo
    ? process.env.ZG_GALILEO_RPC ?? "https://evmrpc-testnet.0g.ai"
    : process.env.ZG_MAINNET_RPC ?? "https://evmrpc.0g.ai",
  chainId: isGalileo ? 16602 : 16661,
  storageIndexer: isGalileo
    ? process.env.ZG_GALILEO_STORAGE_INDEXER ?? "https://indexer-storage-testnet-turbo.0g.ai"
    : process.env.ZG_MAINNET_STORAGE_INDEXER ?? "https://indexer-storage-turbo.0g.ai",
  computeBrokerUrl: process.env.ZG_COMPUTE_BROKER_URL,
  port: process.env.BACKEND_PORT,
  corsOrigin: process.env.BACKEND_CORS_ORIGIN,

  contracts: {
    agentInft: process.env.NEXT_PUBLIC_AGENT_INFT_ADDRESS,
    registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
    royaltyVault: process.env.NEXT_PUBLIC_ROYALTY_VAULT_ADDRESS,
    trainingDataRegistry: process.env.NEXT_PUBLIC_TRAINING_DATA_REGISTRY_ADDRESS,
  },

  wallet: {
    privateKey: process.env.DEPLOYER_PRIVATE_KEY,
  },
});
