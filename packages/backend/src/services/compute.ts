/**
 * 0G Compute Service (TEE Sealed Inference)
 *
 * Wraps @0glabs/0g-serving-broker for:
 *   - List available TEE inference providers
 *   - Submit inference request with sealed input
 *   - Receive output + TEE attestation
 *   - Verify attestation signature
 *
 * MVP returns mock attestation. Wire to actual broker once URL is configured.
 */

import { ethers } from "ethers";
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";

export interface InferenceRequest {
  agentId: number;
  input: string;
  weightsPointer: `0x${string}`;
}

export interface InferenceResult {
  output: string;
  outputHash: `0x${string}`;
  teeAttestation: `0x${string}`;
  enclaveMeasurement: string;
  providerSignature: `0x${string}`;
  timestamp: number;
}

/**
 * Run sealed inference in 0G Compute TEE.
 *
 * MVP: returns deterministic mock output with TEE-shaped attestation.
 * Production: call broker.inference.processResponse via SDK.
 */
export async function runInference(
  req: InferenceRequest
): Promise<InferenceResult> {
  // TODO: Real flow:
  //   const broker = await createZGComputeNetworkBroker(signer);
  //   const services = await broker.inference.listService();
  //   const provider = pickProvider(services);
  //   const [endpoint, model] = await broker.inference.getServiceMetadata(provider);
  //   const headers = await broker.inference.getRequestHeaders(provider, request);
  //   const response = await fetch(endpoint, { headers, body: ... });
  //   const verified = await broker.inference.processResponse(...);

  const output = `[MEKAR mock] Inference for agent #${req.agentId}: "${req.input.slice(0, 50)}..."`;
  const outputHash = ethers.keccak256(ethers.toUtf8Bytes(output)) as `0x${string}`;

  // Mock TEE attestation: signed bundle of (input, output, weights)
  const attestationPayload = ethers.solidityPacked(
    ["bytes32", "bytes32", "uint256"],
    [
      ethers.keccak256(ethers.toUtf8Bytes(req.input)),
      outputHash,
      Math.floor(Date.now() / 1000),
    ]
  );
  const teeAttestation = ethers.keccak256(attestationPayload) as `0x${string}`;

  logger.info(
    {
      agentId: req.agentId,
      inputLength: req.input.length,
      outputLength: output.length,
      teeAttestation,
    },
    "runInference (mock)"
  );

  return {
    output,
    outputHash,
    teeAttestation,
    enclaveMeasurement: "mock-tdx-measurement-v1",
    providerSignature: ethers.keccak256(
      ethers.toUtf8Bytes(`provider:${teeAttestation}`)
    ) as `0x${string}`,
    timestamp: Date.now(),
  };
}

/**
 * Verify a TEE attestation signature.
 */
export async function verifyAttestation(
  attestation: `0x${string}`,
  expectedOutputHash: `0x${string}`
): Promise<{ valid: boolean; reason?: string }> {
  // TODO: real signature recovery + enclave measurement validation
  if (!attestation || attestation === ethers.ZeroHash) {
    return { valid: false, reason: "Empty attestation" };
  }
  if (!expectedOutputHash || expectedOutputHash === ethers.ZeroHash) {
    return { valid: false, reason: "Empty output hash" };
  }

  // MVP: just structural check
  return { valid: true };
}

/**
 * Mock list of available providers — for UI / discovery.
 */
export async function listProviders() {
  return [
    {
      address: "0x0000000000000000000000000000000000000001",
      model: "qwen2.5-7b-tee",
      pricing: "0.001 0G per inference",
      enclave: "Intel TDX",
      status: "active",
    },
    {
      address: "0x0000000000000000000000000000000000000002",
      model: "deepseek-coder-7b-tee",
      pricing: "0.0015 0G per inference",
      enclave: "NVIDIA H100 Confidential",
      status: "active",
    },
  ];
}
