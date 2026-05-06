import { Router } from "express";
import { z } from "zod";
import { runInference, verifyAttestation, listProviders } from "../services/compute.js";
import { logger } from "../lib/logger.js";

export const computeRouter = Router();

const InferenceSchema = z.object({
  agentId: z.number().int().positive(),
  input: z.string().min(1).max(10_000),
  weightsPointer: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

computeRouter.post("/inference", async (req, res) => {
  try {
    const body = InferenceSchema.parse(req.body);
    const result = await runInference({
      agentId: body.agentId,
      input: body.input,
      weightsPointer: body.weightsPointer as `0x${string}`,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "inference failed");
    res.status(400).json({ error: (err as Error).message });
  }
});

const VerifySchema = z.object({
  attestation: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  outputHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

computeRouter.post("/verify", async (req, res) => {
  try {
    const body = VerifySchema.parse(req.body);
    const result = await verifyAttestation(
      body.attestation as `0x${string}`,
      body.outputHash as `0x${string}`
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

computeRouter.get("/providers", async (_req, res) => {
  const providers = await listProviders();
  res.json({ providers });
});
