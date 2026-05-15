/**
 * Validation guards for the storage upload route.
 *
 * Extracted from the route handler so the pure validation logic can be
 * unit-tested WITHOUT pulling in the 0G SDK / ethers (which the route
 * imports for the actual anchor). The route imports these; the tests
 * import these; neither path drags the heavy SDK into the other.
 */

import { z } from "zod";

/**
 * Hard size cap on the inbound payload. Server-side enforcement
 * protects the deployer wallet — every successful upload pays a small
 * Flow anchor fee, so unbounded uploads = unbounded drain. 50 MB is
 * well past a realistic manifest (~2 KB) and a small weight shard
 * (~25 MB). Measured against the base64-encoded body, which inflates
 * raw bytes by ~4/3.
 */
export const MAX_DATA_LENGTH = 50 * 1024 * 1024;

/**
 * Tag cap — the tag is hashed into the storagePointer for KV-style
 * indexing. Bounding it stops "billions of unique tags" griefs.
 */
export const MAX_TAG_LENGTH = 200;

/** Zod schema for the upload request body. */
export const UploadSchema = z.object({
    /** UTF-8 string OR base64-encoded binary. Set encoding="base64" for blobs. */
    data: z
        .string()
        .min(1, "data must be non-empty")
        .max(MAX_DATA_LENGTH, `data exceeds ${MAX_DATA_LENGTH} byte cap`),
    encoding: z.enum(["utf8", "base64"]).default("utf8"),
    tier: z.enum(["log", "specialized"]).optional(),
    tag: z.string().max(MAX_TAG_LENGTH).optional(),
    encryption: z.enum(["none", "aes256"]).default("none"),
});

export type UploadBody = z.infer<typeof UploadSchema>;

/**
 * Origin allowlist. Browsers send `Origin` for cross-origin requests
 * and `Referer` for same-origin; the route accepts either. Rejects
 * anything that isn't our deployed app or localhost dev. A bypass via
 * curl (no Origin header) is possible, but combined with the rate
 * limiter it's still a useful friction layer.
 */
export const ALLOWED_ORIGIN_PATTERNS = [
    /^https:\/\/mekar\.vercel\.app$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];

/**
 * Whether a request from `origin` is allowed. A missing header (null)
 * returns true — server-to-server / curl requests carry no Origin and
 * can't be distinguished here; the rate limiter handles those.
 */
export function originAllowed(origin: string | null): boolean {
    if (!origin) return true;
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

/** 32-byte hex rootHash validator — shared by the download route. */
export const ROOT_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export function isValidRootHash(value: string): boolean {
    return ROOT_HASH_RE.test(value);
}
