/**
 * 0G Storage Service
 *
 * Wraps @0gfoundation/0g-ts-sdk for:
 *   - Upload encrypted agent weights
 *   - Upload training data manifests
 *   - Resolve storage pointers (root hashes)
 *   - Use Specialized Flow for premium permanent storage
 *
 * NOTE: SDK API may evolve. This wrapper centralizes calls so we can adapt
 *       when 0G SDK ships breaking changes.
 */

import { ethers } from "ethers";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

let _provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }
  return _provider;
}

export function getSigner(): ethers.Wallet {
  if (!config.wallet.privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");
  }
  return new ethers.Wallet(config.wallet.privateKey, getProvider());
}

/**
 * Upload a buffer to 0G Storage and return the root hash.
 *
 * For MVP this returns a deterministic mock root. Wire to actual 0G SDK
 * once the broker URL is available and we have $0G in the wallet.
 */
export async function uploadToStorage(
  data: Buffer | string,
  options: { tier?: "log" | "specialized"; tag?: string } = {}
): Promise<{ rootHash: `0x${string}`; storagePointer: `0x${string}`; size: number }> {
  const tier = options.tier ?? "log";
  const buffer = typeof data === "string" ? Buffer.from(data) : data;

  // TODO: Wire actual SDK upload:
  //   const indexer = new Indexer(config.storageIndexer);
  //   const file = ZgFile.fromBuffer(buffer);
  //   const [tree, treeErr] = await file.merkleTree();
  //   if (treeErr) throw treeErr;
  //   const [tx, uploadErr] = await indexer.upload(file, signer);

  // MVP: deterministic mock root from content hash
  const rootHash = ethers.keccak256(buffer) as `0x${string}`;
  const storagePointer = ethers.keccak256(
    ethers.toUtf8Bytes(`${tier}:${options.tag ?? "untagged"}:${rootHash}`)
  ) as `0x${string}`;

  logger.info(
    { tier, size: buffer.length, rootHash, storagePointer },
    "uploadToStorage (mock)"
  );

  return { rootHash, storagePointer, size: buffer.length };
}

/**
 * Compute Merkle root of a list of training data hashes.
 *
 * Used to anchor a training dataset to TrainingDataRegistry.sol.
 */
export function computeTrainingMerkle(dataHashes: string[]): `0x${string}` {
  if (dataHashes.length === 0) return ethers.ZeroHash as `0x${string}`;
  if (dataHashes.length === 1) return dataHashes[0] as `0x${string}`;

  // Simple binary Merkle: pair-hash up the tree
  let layer: string[] = dataHashes.map((h) => (h.startsWith("0x") ? h : `0x${h}`));
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : left;
      next.push(
        ethers.keccak256(
          ethers.concat([left as `0x${string}`, right as `0x${string}`])
        )
      );
    }
    layer = next;
  }
  return layer[0] as `0x${string}`;
}

/**
 * Encrypt raw bytes with a deterministic-derived AES key.
 * MVP placeholder; production uses INFT-bound re-encryption oracle.
 */
export async function encryptForINFT(
  data: Buffer,
  recipientPubkey?: string
): Promise<{ ciphertext: Buffer; encryptionMeta: string }> {
  // TODO: real ECIES / re-encryption oracle integration.
  const meta = JSON.stringify({
    algorithm: "AES-256-GCM",
    recipient: recipientPubkey ?? "self",
    timestamp: Date.now(),
  });

  // For MVP, just return data as-is + metadata
  return {
    ciphertext: data,
    encryptionMeta: meta,
  };
}
