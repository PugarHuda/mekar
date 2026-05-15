/**
 * POST /api/storage/upload
 *
 * Anchors a payload on 0G Storage via the SDK and returns the rootHash
 * that callers feed back to AgentINFT.mintGenesis/mintFork as
 * `weightsPointer`. Runs same-origin so the browser doesn't hit CORS /
 * mixed-content blocks when the page lives on https://mekar.vercel.app.
 *
 * The handler signs the Flow contract anchor tx with DEPLOYER_PRIVATE_KEY
 * (server-side env var — NOT NEXT_PUBLIC_*). The /mint UX is: user pays
 * tx for the mint itself with their own wallet, but the storage anchor
 * is paid by the deployer faucet wallet (small fee, ~30 microO/upload).
 * Production should swap this for the user-signed flow once 0G Storage
 * supports session-key wallets.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ethers } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { rateLimiter } from "@/lib/rateLimit";
import { checkBotId } from "botid/server";

const RPC_URL =
    process.env.ZG_GALILEO_RPC ?? "https://evmrpc-testnet.0g.ai";
const STORAGE_INDEXER =
    process.env.ZG_GALILEO_STORAGE_INDEXER ??
    "https://indexer-storage-testnet-turbo.0g.ai";

// Validation guards (origin allowlist, size cap, schema) live in
// lib/uploadGuards so they're unit-testable without dragging the 0G
// SDK into the test runner. See uploadGuards.test.ts.
import { UploadSchema, originAllowed } from "@/lib/uploadGuards";

/**
 * Per-IP quota. 6 uploads / minute. Each upload pays ~30 micro-OG on
 * chain so 6/min ≈ 0.18 OG/hour/IP — an attacker has to rotate IPs
 * faster than the deployer faucet to outscale the limit.
 *
 * Backend resolves to Vercel KV when KV_REST_API_URL is set, otherwise
 * falls back to in-memory. See lib/rateLimit.ts.
 */
const BUCKET_SIZE = 6;
const BUCKET_WINDOW_MS = 60_000;

// Cache the Indexer + signer between invocations (Vercel Fluid Compute
// reuses function instances across concurrent requests, so this saves
// the ~200ms TLS handshake to the indexer on warm hits).
let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;
let _indexer: Indexer | null = null;

function getSigner(): ethers.Wallet {
    if (_signer) return _signer;
    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    if (!pk) {
        throw new Error(
            "DEPLOYER_PRIVATE_KEY not set — storage anchor cannot sign Flow tx"
        );
    }
    _provider = _provider ?? new ethers.JsonRpcProvider(RPC_URL);
    _signer = new ethers.Wallet(pk, _provider);
    return _signer;
}

function getIndexer(): Indexer {
    if (!_indexer) _indexer = new Indexer(STORAGE_INDEXER);
    return _indexer;
}

export async function POST(req: NextRequest) {
    // Origin check before anything else — cheapest reject path.
    const origin = req.headers.get("origin") ?? req.headers.get("referer");
    if (!originAllowed(origin)) {
        return NextResponse.json(
            { error: "origin not allowed" },
            { status: 403 }
        );
    }

    // Vercel BotID — server-side bot fingerprinting. The client-side
    // `initBotId()` (mounted in app/providers.tsx) emits a one-time
    // token that Vercel's edge inspects. We block here only if BotID
    // is confidently a bot; uncertain verdicts pass through to the
    // rate limiter below. The middleware will short-circuit known bots
    // before they reach us, this catches anything that slipped past.
    try {
        const verdict = await checkBotId();
        if (verdict.isBot) {
            return NextResponse.json(
                { error: "bot detected" },
                { status: 403 }
            );
        }
    } catch {
        // BotID not provisioned (no env) → skip the check. Rate limit
        // + origin check still apply. We don't fail-closed because
        // local dev typically runs without BotID configured.
    }

    // Rate limit per IP. Vercel attaches the client IP via x-forwarded-for;
    // we fall back to a "shared" bucket if the header is missing so the
    // limit still applies to local dev / unknown sources.
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "shared";
    const rate = await rateLimiter.check(`upload:${ip}`, BUCKET_SIZE, BUCKET_WINDOW_MS);
    if (!rate.allowed) {
        return NextResponse.json(
            {
                error: "rate limit — too many uploads",
                retryAfterSec: Math.ceil(rate.retryAfterMs / 1000),
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
                },
            }
        );
    }

    let body: z.infer<typeof UploadSchema>;
    try {
        body = UploadSchema.parse(await req.json());
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "invalid request", details: err.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "invalid request body" },
            { status: 400 }
        );
    }

    try {
        const buffer =
            body.encoding === "base64"
                ? Buffer.from(body.data, "base64")
                : Buffer.from(body.data, "utf8");

        const signer = getSigner();
        const indexer = getIndexer();
        const file = new MemData(Array.from(buffer));

        // Encryption: AES-256 via the SDK's UploadOption.encryption hook.
        // The SDK encrypts client-side (server-side here) before chunks are
        // pushed to storage nodes, so only key-holders can reconstruct the
        // original payload. We generate the key fresh per upload and ship
        // it back to the caller so they can persist it alongside the
        // rootHash on chain.
        let aesKey: Uint8Array | undefined;
        const uploadOpts: Parameters<typeof indexer.upload>[3] | undefined =
            body.encryption === "aes256"
                ? (() => {
                      aesKey = new Uint8Array(32);
                      crypto.getRandomValues(aesKey);
                      return { encryption: { type: "aes256", key: aesKey } };
                  })()
                : undefined;

        // Retry the anchor with backoff. The 0G Storage indexer +
        // Flow contract on a congested testnet throws transient errors
        // (node selection failures, RPC timeouts) that succeed on a
        // second attempt. Three tries with 2s/4s backoff turns a
        // flaky-testnet failure into a slightly-slower success instead
        // of a hard 500. A genuine error (bad payload, no funds) still
        // fails on the last attempt and propagates.
        let result: unknown = null;
        let lastErr: unknown = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            const [r, err] = await indexer.upload(file, RPC_URL, signer, uploadOpts);
            if (!err) {
                result = r;
                lastErr = null;
                break;
            }
            lastErr = err;
            // eslint-disable-next-line no-console
            console.warn(
                `[/api/storage/upload] anchor attempt ${attempt}/3 failed:`,
                err instanceof Error ? err.message : String(err)
            );
            if (attempt < 3) {
                await new Promise((res) => setTimeout(res, attempt * 2_000));
            }
        }
        if (lastErr || !result) throw lastErr ?? new Error("upload returned no result");

        if (Array.isArray((result as { rootHashes?: string[] }).rootHashes)) {
            throw new Error("unexpected sharded upload result for single file");
        }
        const r = result as { rootHash: string; txHash: string; txSeq: number };

        const rootHash = (
            r.rootHash.startsWith("0x") ? r.rootHash : `0x${r.rootHash}`
        ) as `0x${string}`;
        const txHash = (
            r.txHash.startsWith("0x") ? r.txHash : `0x${r.txHash}`
        ) as `0x${string}`;

        // Deterministic helper hash for KV-style indexing — same convention as
        // the Express backend keeps so callers can swap between routes freely.
        const tier = body.tier ?? "log";
        const storagePointer = ethers.keccak256(
            ethers.toUtf8Bytes(
                `${tier}:${body.tag ?? "untagged"}:${rootHash}`
            )
        ) as `0x${string}`;

        // When encryption is enabled, the AES key is the ONLY way to recover
        // the original payload. We return it as a hex string so the caller
        // can save it. Production should escrow this via an INFT-bound
        // re-encryption oracle so the key is transferable with the token.
        const aesKeyHex = aesKey
            ? `0x${Buffer.from(aesKey).toString("hex")}`
            : undefined;

        return NextResponse.json({
            rootHash,
            storagePointer,
            txHash,
            size: buffer.length,
            encryption: body.encryption,
            ...(aesKeyHex ? { aesKey: aesKeyHex } : {}),
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Log on server; surface trimmed message to client.
        console.error("[/api/storage/upload]", msg);
        return NextResponse.json(
            { error: msg.slice(0, 300) },
            { status: 500 }
        );
    }
}

// Vercel function config: Fluid Compute / Node runtime is required because
// the 0G SDK pulls in fs + crypto from Node.
//
// maxDuration is 300s (Vercel's current default ceiling). The 0G
// Storage anchor — sign Flow contract tx + wait for storage nodes to
// pin the chunks + wait for tx confirmation — is normally 13–20s but
// on a congested Galileo testnet it can stretch past a minute. The
// old 60s cap meant the function was being KILLED mid-anchor on slow
// testnet days, which surfaced to the user as an upload that hung
// forever. 300s gives the anchor all the room it needs.
export const runtime = "nodejs";
export const maxDuration = 300;
