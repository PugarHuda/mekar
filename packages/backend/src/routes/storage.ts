import { Router } from "express";
import { z } from "zod";
import { uploadToStorage, computeTrainingMerkle } from "../services/storage.js";
import { logger } from "../lib/logger.js";

export const storageRouter = Router();

const UploadSchema = z.object({
  data: z.string().min(1),
  tier: z.enum(["log", "specialized"]).optional(),
  tag: z.string().optional(),
});

storageRouter.post("/upload", async (req, res) => {
  try {
    const body = UploadSchema.parse(req.body);
    const result = await uploadToStorage(body.data, {
      tier: body.tier,
      tag: body.tag,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "storage upload failed");
    res.status(400).json({ error: (err as Error).message });
  }
});

const MerkleSchema = z.object({
  hashes: z.array(z.string().regex(/^(0x)?[a-fA-F0-9]{64}$/)),
});

storageRouter.post("/merkle", async (req, res) => {
  try {
    const body = MerkleSchema.parse(req.body);
    const root = computeTrainingMerkle(body.hashes);
    res.json({ root });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
