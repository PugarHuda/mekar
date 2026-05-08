/**
 * 0G Storage Service
 *
 * Wraps @0gfoundation/0g-ts-sdk for:
 *   - Upload encrypted agent weights
 *   - Upload training data manifests
 *   - Resolve storage pointers (root hashes)
 *
 * The Indexer.upload() call:
 *   1. Computes the file's Merkle root client-side
 *   2. Submits a Flow contract tx to anchor the root on-chain (signer pays)
 *   3. Pushes data segments to a quorum of selected storage nodes
 *
 * The returned rootHash is the canonical pointer that downstream contracts
 * (AgentINFT, TrainingDataRegistry) store as `bytes32`.
 */

import { ethers } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

let _provider: ethers.JsonRpcProvider | null = null;
let _indexer: Indexer | null = null;

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

function getIndexer(): Indexer {
  if (!_indexer) {
    _indexer = new Indexer(config.storageIndexer);
  }
  return _indexer;
}

/**
 * Upload a buffer to 0G Storage and return the canonical root hash.
 *
 * @param data    Raw bytes (Buffer) or UTF-8 string
 * @param options.tag  Free-form label for the log line (no on-chain effect)
 * @returns       rootHash (use as on-chain weightsPointer), storagePointer
 *                (deterministic helper hash for kv-style indexing), txHash
 *                (the Flow contract anchor tx), size in bytes.
 */
export async function uploadToStorage(
  data: Buffer | string,
  options: { tier?: "log" | "specialized"; tag?: string } = {}
): Promise<{
  rootHash: `0x${string}`;
  storagePointer: `0x${string}`;
  txHash: `0x${string}`;
  size: number;
}> {
  const tier = options.tier ?? "log";
  const buffer = typeof data === "string" ? Buffer.from(data) : data;

  const signer = getSigner();
  const indexer = getIndexer();
  const file = new MemData(Array.from(buffer));

  logger.info({ size: buffer.length, tier, tag: options.tag }, "uploading to 0G Storage");

  const [result, err] = await indexer.upload(file, config.rpcUrl, signer);
  if (err) {
    logger.error({ err: err.message, tag: options.tag }, "0G upload failed");
    throw err;
  }

  // Single-file uploads return the non-array shape; sharded multi-file uploads
  // return arrays. We always upload one MemData, so always single shape.
  if (Array.isArray((result as { rootHashes?: string[] }).rootHashes)) {
    throw new Error("unexpected sharded upload result for single file");
  }
  const r = result as { rootHash: string; txHash: string; txSeq: number };

  const rootHash = (r.rootHash.startsWith("0x") ? r.rootHash : `0x${r.rootHash}`) as `0x${string}`;
  const txHash = (r.txHash.startsWith("0x") ? r.txHash : `0x${r.txHash}`) as `0x${string}`;
  const storagePointer = ethers.keccak256(
    ethers.toUtf8Bytes(`${tier}:${options.tag ?? "untagged"}:${rootHash}`)
  ) as `0x${string}`;

  logger.info(
    { rootHash, txHash, txSeq: r.txSeq, size: buffer.length },
    "uploaded to 0G Storage"
  );

  return { rootHash, storagePointer, txHash, size: buffer.length };
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
