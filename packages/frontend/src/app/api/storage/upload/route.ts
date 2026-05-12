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

const RPC_URL =
    process.env.ZG_GALILEO_RPC ?? "https://evmrpc-testnet.0g.ai";
const STORAGE_INDEXER =
    process.env.ZG_GALILEO_STORAGE_INDEXER ??
    "https://indexer-storage-testnet-turbo.0g.ai";

const UploadSchema = z.object({
    /** UTF-8 string OR base64-encoded binary. Set encoding="base64" for blobs. */
    data: z.string().min(1),
    encoding: z.enum(["utf8", "base64"]).default("utf8"),
    tier: z.enum(["log", "specialized"]).optional(),
    tag: z.string().optional(),
});

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

        const [result, err] = await indexer.upload(file, RPC_URL, signer);
        if (err) throw err;

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

        return NextResponse.json({
            rootHash,
            storagePointer,
            txHash,
            size: buffer.length,
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
// the 0G SDK pulls in fs + crypto from Node. 60s ceiling is plenty for
// the typical 13–20s upload + Flow contract anchor.
export const runtime = "nodejs";
export const maxDuration = 60;
