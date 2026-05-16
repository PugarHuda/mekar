/**
 * GET /api/storage/download?rootHash=0x...
 *
 * Fetches a payload back from 0G Storage by its rootHash. The mirror
 * of /api/storage/upload — together they give a full round-trip so
 * the chunked-upload manifest format is no longer write-only.
 *
 * Returns the raw bytes with Content-Type application/octet-stream.
 * Decryption is intentionally NOT done here: encrypted uploads are
 * decrypted client-side (the AES key never reaches the server), so
 * this route returns ciphertext as-is for the browser to decrypt.
 *
 * Hardening mirrors the upload route: origin allowlist + per-IP rate
 * limit. No BotID — a download is read-only and doesn't burn
 * deployer $0G the way an upload anchor does.
 */

import { NextRequest, NextResponse } from "next/server";
import { Indexer } from "@0gfoundation/0g-ts-sdk";
import { rateLimiter } from "@/lib/rateLimit";

// Mainnet (Aristotle) storage indexer by default — see the note in the
// upload route. `||` so an empty-string env value also falls back.
const STORAGE_INDEXER =
    process.env.ZG_GALILEO_STORAGE_INDEXER ||
    "https://indexer-storage-turbo.0g.ai";

let _indexer: Indexer | null = null;
function getIndexer(): Indexer {
    if (!_indexer) _indexer = new Indexer(STORAGE_INDEXER);
    return _indexer;
}

const ALLOWED_ORIGIN_PATTERNS = [
    /^https:\/\/mekar\.vercel\.app$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];

function originAllowed(origin: string | null): boolean {
    if (!origin) return true;
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

// rootHash is 32 bytes hex — validate so a malformed value can't be
// passed through to the SDK.
const ROOT_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export async function GET(req: NextRequest) {
    const origin = req.headers.get("origin") ?? req.headers.get("referer");
    if (!originAllowed(origin)) {
        return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
    }

    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "shared";
    // 30 downloads / minute — generous (reads are cheap) but still
    // throttles a scraper hammering the indexer.
    const rate = await rateLimiter.check(`download:${ip}`, 30, 60_000);
    if (!rate.allowed) {
        return NextResponse.json(
            { error: "rate limit — too many downloads" },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
                },
            }
        );
    }

    const { searchParams } = new URL(req.url);
    const rootHash = searchParams.get("rootHash") ?? "";
    if (!ROOT_HASH_RE.test(rootHash)) {
        return NextResponse.json(
            { error: "rootHash must be 0x + 64 hex chars" },
            { status: 400 }
        );
    }

    try {
        const indexer = getIndexer();
        // downloadToBlob is browser + Node safe and returns the raw
        // bytes. We don't pass `decryption` — encrypted payloads come
        // back as ciphertext and the caller decrypts client-side with
        // the AES key the server never sees.
        const [blob, err] = await indexer.downloadToBlob(rootHash);
        if (err) throw err;
        if (!blob) throw new Error("indexer returned an empty blob");

        const buffer = Buffer.from(await blob.arrayBuffer());
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Length": String(buffer.length),
                "Content-Disposition": `inline; filename="mekar-${rootHash.slice(0, 10)}.bin"`,
                // Storage payloads are content-addressed by rootHash —
                // the bytes for a given hash never change, so cache hard.
                "Cache-Control": "public, max-age=604800, immutable",
            },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.error("[/api/storage/download]", msg);
        return NextResponse.json({ error: msg.slice(0, 300) }, { status: 502 });
    }
}

// Node runtime — the 0G SDK needs Node's crypto + buffer.
export const runtime = "nodejs";
export const maxDuration = 120;
