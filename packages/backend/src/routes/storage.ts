import { Router } from "express";
import { z } from "zod";
import { uploadToStorage, computeTrainingMerkle } from "../services/storage.js";
import { logger } from "../lib/logger.js";

export const storageRouter = Router();

const UploadSchema = z.object({
  /** UTF-8 string OR base64-encoded binary. Set encoding to "base64" for blobs. */
  data: z.string().min(1),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
  tier: z.enum(["log", "specialized"]).optional(),
  tag: z.string().optional(),
});

storageRouter.post("/upload", async (req, res) => {
  try {
    const body = UploadSchema.parse(req.body);
    const buffer =
      body.encoding === "base64"
        ? Buffer.from(body.data, "base64")
        : Buffer.from(body.data, "utf8");
    const result = await uploadToStorage(buffer, {
      tier: body.tier,
      tag: body.tag,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "storage upload failed");
    res.status(500).json({ error: (err as Error).message });
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
