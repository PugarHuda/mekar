/**
 * Browser → 0G Storage upload bridge.
 *
 * Calls the same-origin Next.js API route `/api/storage/upload` which wraps
 * `@0gfoundation/0g-ts-sdk` Indexer.upload. Returns the rootHash that the
 * caller hands to AgentINFT.mintGenesis/mintFork as `weightsPointer`.
 *
 * Same-origin design fixes two browser blocks that hit the earlier
 * cross-origin Express backend on `http://localhost:3001`:
 *   • Mixed content: HTTPS page can't fetch HTTP endpoint (blocked
 *     before CORS check even runs).
 *   • CORS: cross-origin POST needs Access-Control-Allow-Origin matching
 *     + preflight OPTIONS roundtrip.
 *
 * `NEXT_PUBLIC_BACKEND_URL` is still honoured for legacy local dev where
 * the user prefers the standalone Express service, but production no
 * longer requires a separate backend.
 */

// "" → same-origin /api/storage/upload (production happy path).
// Set NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 in .env.local only to
// route through a standalone Express backend during local dev.
//
// Safety: even if someone accidentally bakes the localhost URL into a
// production build, we strip it client-side when running on https or a
// non-localhost host. The browser would block the http:// fetch from a
// https page anyway (mixed-content); this just gives a cleaner error
// path that falls back to same-origin.
const UPLOAD_ENDPOINT = (() => {
    const override = process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined;
    if (!override) return "/api/storage/upload";

    const isLocalhost = /localhost|127\.0\.0\.1/.test(override);
    if (isLocalhost && typeof window !== "undefined") {
        const onLocalhostHost = /localhost|127\.0\.0\.1/.test(window.location.hostname);
        if (!onLocalhostHost) {
            // Bake-time override was localhost but we're served from a real
            // domain — ignore and fall back to same-origin API route.
            return "/api/storage/upload";
        }
    }
    return `${override}/api/storage/upload`;
})();

export type StorageUploadResult = {
    rootHash: `0x${string}`;
    storagePointer: `0x${string}`;
    txHash: `0x${string}`;
    size: number;
    encryption?: "none" | "aes256" | "aes256-gcm-client";
    /** Present only when encryption !== "none". Hex-encoded AES-256 key
     *  the user must persist to recover the encrypted payload. For the
     *  client-side path the key is generated in-browser and the server
     *  never sees it — only the ciphertext is anchored. */
    aesKey?: `0x${string}`;
    /** 12-byte AES-GCM IV — only present for client-side encryption.
     *  Required to decrypt alongside the key. */
    aesIv?: `0x${string}`;
};

/**
 * Hex helpers used by the client-side encrypt path.
 * Browser-only; not exported.
 */
function toHexLocal(bytes: Uint8Array): `0x${string}` {
    let out = "0x";
    for (let i = 0; i < bytes.length; i++) {
        out += bytes[i].toString(16).padStart(2, "0");
    }
    return out as `0x${string}`;
}

/**
 * Encrypts `bytes` in-browser with a fresh AES-256-GCM key. Returns the
 * ciphertext (with authentication tag appended by WebCrypto), the IV,
 * and the raw key bytes for the caller to persist locally.
 *
 * Why GCM over raw CTR: GCM provides integrity (tag detects ciphertext
 * tampering), which matters because the rootHash anchors arbitrary
 * bytes — without the tag a flipped bit decrypts silently to garbage.
 */
async function encryptClientSide(bytes: Blob | ArrayBuffer | string): Promise<{
    ciphertext: ArrayBuffer;
    iv: Uint8Array;
    keyBytes: Uint8Array;
}> {
    const plain =
        typeof bytes === "string"
            ? new TextEncoder().encode(bytes)
            : bytes instanceof Blob
              ? new Uint8Array(await bytes.arrayBuffer())
              : new Uint8Array(bytes);

    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        plain
    );
    return { ciphertext, iv, keyBytes };
}

export type UploadProgress = {
    /** 0..1 — how much of the request body has been sent. */
    fraction: number;
    /** Bytes uploaded so far (including base64 + JSON overhead). */
    loaded: number;
    /** Total bytes of the encoded request body. */
    total: number;
    /** Phase the upload is in — tells the UI whether to show a determinate
     *  bar (uploading) vs an indeterminate spinner (server-side anchoring). */
    phase: "encoding" | "uploading" | "anchoring";
};

/**
 * Upload an arbitrary blob (file bytes or text) to 0G Storage.
 *
 * @param bytes      Browser File, Blob, ArrayBuffer, or string.
 * @param tag        Free-form label (logged backend-side, not stored on chain).
 * @param encryption "none" (default) or "aes256". With "aes256" the SDK
 *   encrypts the payload client-side before chunks ship to storage nodes —
 *   the returned `aesKey` is the only way to decrypt it later.
 * @param onProgress Optional progress callback. Fires during base64 encoding,
 *   during the POST upload, and once the server starts anchoring. Use it to
 *   drive an upload bar in the UI.
 */
export async function uploadToZGStorage(
    bytes: Blob | ArrayBuffer | string,
    tag?: string,
    encryption: "none" | "aes256" = "none",
    onProgress?: (p: UploadProgress) => void
): Promise<StorageUploadResult> {
    let payload: { data: string; encoding: "utf8" | "base64" };
    // Client-side AES path: encrypt before the bytes ever cross the
    // process boundary. The server only sees ciphertext + the request
    // metadata claiming "this is opaque". Plaintext key + IV are
    // returned to the caller (the same client that just minted them).
    let clientKey: { key: `0x${string}`; iv: `0x${string}` } | null = null;

    if (encryption === "aes256") {
        onProgress?.({
            fraction: 0,
            loaded: 0,
            total: 0,
            phase: "encoding",
        });
        const { ciphertext, iv, keyBytes } = await encryptClientSide(bytes);
        clientKey = { key: toHexLocal(keyBytes), iv: toHexLocal(iv) };
        // Replace the original bytes with the ciphertext so the rest
        // of the function uploads encrypted material. Treat as raw
        // bytes → base64 encoded path below.
        bytes = ciphertext;
    }

    if (typeof bytes === "string") {
        payload = { data: bytes, encoding: "utf8" };
    } else {
        // Convert Blob | ArrayBuffer → base64
        const buffer = bytes instanceof Blob ? await bytes.arrayBuffer() : bytes;
        const u8 = new Uint8Array(buffer);
        // Chunked btoa for large files (avoid call-stack overflow on 1MB+ inputs).
        // We tick `onProgress` per chunk so the UI shows encoding progress
        // for multi-MB uploads where base64 conversion itself takes seconds.
        const chunkSize = 0x8000;
        const chunks: string[] = [];
        for (let i = 0; i < u8.length; i += chunkSize) {
            chunks.push(
                String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunkSize)))
            );
            if (onProgress && i % (chunkSize * 8) === 0) {
                onProgress({
                    fraction: 0,
                    loaded: i,
                    total: u8.length,
                    phase: "encoding",
                });
            }
        }
        payload = { data: btoa(chunks.join("")), encoding: "base64" };
    }

    // When we encrypted client-side, the server treats the upload as
    // opaque bytes — don't ask it to encrypt a second time. The
    // ciphertext we send IS the on-chain anchored payload.
    const serverEncryption = clientKey ? "none" : encryption;
    const body = JSON.stringify({
        ...payload,
        tag: clientKey ? `${tag ?? "untagged"}-enc-client` : tag,
        tier: "log",
        encryption: serverEncryption,
    });

    // Use XMLHttpRequest because `fetch()` has no native upload progress —
    // ReadableStream-based uploads need keepalive + Content-Length which
    // breaks on Edge runtimes. XHR's `upload.onprogress` is the reliable
    // path in 2026 for browser → server upload progress reporting.
    return new Promise<StorageUploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", UPLOAD_ENDPOINT, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.responseType = "text";

        const totalBytes = new Blob([body]).size;
        // Small bodies (< ~4 KB) often skip xhr.upload.onprogress entirely
        // because the browser ships them in a single packet. Without this
        // flag we'd be stuck showing "encoding" until xhr.onload fires
        // (which can take 10–30s while the server anchors on 0G Storage).
        // We start by reporting phase: "uploading" right before send(),
        // then jump to "anchoring" once xhr.onloadstart confirms the
        // browser has actually handed the body to the network stack.
        let phaseSwitchedToAnchoring = false;

        xhr.upload.onprogress = (e) => {
            if (!onProgress || phaseSwitchedToAnchoring) return;
            const loaded = e.loaded;
            const total = e.lengthComputable ? e.total : totalBytes;
            onProgress({
                fraction: total > 0 ? loaded / total : 0,
                loaded,
                total,
                phase: "uploading",
            });
        };

        xhr.upload.onload = () => {
            // Body fully sent; the server is now anchoring on 0G Storage +
            // emitting a Flow tx. Surface an indeterminate "anchoring" tick
            // so users see something is still happening between 100%
            // upload and the resolved JSON response.
            phaseSwitchedToAnchoring = true;
            onProgress?.({
                fraction: 1,
                loaded: totalBytes,
                total: totalBytes,
                phase: "anchoring",
            });
        };

        // Fallback: if the body is small enough that xhr.upload events
        // don't fire (or fire out of order), flip to "anchoring" 300 ms
        // after send. The actual upload of <10 KB to the server is done
        // by then; everything beyond that is server-side waiting.
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

        xhr.onload = () => {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const parsed = JSON.parse(xhr.responseText) as StorageUploadResult;
                    // If we encrypted client-side, splice the key + IV
                    // into the result so the caller sees a consistent
                    // shape with the server-side encrypt path.
                    if (clientKey) {
                        parsed.encryption = "aes256-gcm-client";
                        parsed.aesKey = clientKey.key;
                        parsed.aesIv = clientKey.iv;
                    }
                    resolve(parsed);
                } catch (err) {
                    reject(
                        new Error(
                            `storage upload returned non-JSON: ${String((err as Error).message)}`
                        )
                    );
                }
            } else {
                reject(
                    new Error(
                        `storage upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`
                    )
                );
            }
        };

        xhr.onerror = () => {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            reject(new Error("storage upload network error"));
        };

        // Immediately signal that the encoding phase is done and we're
        // handing off to the network. Without this, very small bodies
        // (< 4 KB) get stuck showing "Encoding…" because xhr.upload
        // events sometimes fire too fast to observe.
        onProgress?.({
            fraction: 0,
            loaded: 0,
            total: totalBytes,
            phase: "uploading",
        });
        xhr.send(body);

        // Belt-and-suspenders: if no xhr.upload event has flipped us
        // to "anchoring" within 400 ms, do it ourselves. For tiny
        // bodies the actual upload completes well under that window.
        fallbackTimer = setTimeout(() => {
            if (phaseSwitchedToAnchoring) return;
            phaseSwitchedToAnchoring = true;
            onProgress?.({
                fraction: 1,
                loaded: totalBytes,
                total: totalBytes,
                phase: "anchoring",
            });
        }, 400);
    });
}

export const STORAGE_UPLOAD_ENDPOINT = UPLOAD_ENDPOINT;

/**
 * Per-chunk size for the multi-part upload path. Must stay under the
 * server's MAX_DATA_LENGTH (50 MB) accounting for base64 inflation
 * (~4/3), so 32 MB of raw bytes encodes to ~43 MB which is safely
 * under the cap.
 */
const CHUNK_BYTES = 32 * 1024 * 1024;

export type ChunkedUploadResult = {
    /** Pointer JSON that bundles every chunk rootHash. This manifest
     *  is itself uploaded last so a single rootHash anchors the whole
     *  thing on chain. */
    manifestRootHash: `0x${string}`;
    /** Anchor tx for the manifest. The chunks each have their own tx
     *  too — captured inside the manifest for traceability. */
    manifestTxHash: `0x${string}`;
    totalBytes: number;
    chunkCount: number;
    /** Individual chunks for downstream verification. */
    chunks: Array<{ index: number; rootHash: `0x${string}`; txHash: `0x${string}`; size: number }>;
};

/**
 * Upload a (potentially large) file by splitting into chunks, anchoring
 * each with its own rootHash, then anchoring a manifest JSON that
 * references every chunk. Returns the manifest's rootHash — that's the
 * single value the caller anchors on chain as `weightsPointer`.
 *
 * Use this when the source file > 32 MB. For small files prefer
 * `uploadToZGStorage()` directly — one tx instead of N+1.
 *
 * Progress callback fractions are normalised across the whole upload
 * so the UI bar reads from 0 → 1 over the full operation, not per chunk.
 */
export async function uploadChunkedToZGStorage(
    file: File,
    tag?: string,
    onProgress?: (p: UploadProgress) => void
): Promise<ChunkedUploadResult> {
    const totalBytes = file.size;
    if (totalBytes <= CHUNK_BYTES) {
        // Smaller than a single chunk — let the simple path handle it
        // and re-wrap the result in the chunked shape so callers can
        // use one return type regardless.
        const single = await uploadToZGStorage(file, tag, "none", onProgress);
        return {
            manifestRootHash: single.rootHash,
            manifestTxHash: single.txHash,
            totalBytes,
            chunkCount: 1,
            chunks: [
                {
                    index: 0,
                    rootHash: single.rootHash,
                    txHash: single.txHash,
                    size: single.size,
                },
            ],
        };
    }

    const chunkCount = Math.ceil(totalBytes / CHUNK_BYTES);
    const chunks: ChunkedUploadResult["chunks"] = [];

    for (let i = 0; i < chunkCount; i++) {
        const start = i * CHUNK_BYTES;
        const end = Math.min(start + CHUNK_BYTES, totalBytes);
        const slice = file.slice(start, end);
        const result = await uploadToZGStorage(
            slice,
            `${tag ?? "untagged"}-chunk-${i + 1}-of-${chunkCount}`,
            "none",
            (p) => {
                // Map per-chunk progress to a global fraction so the UI
                // doesn't jump back to 0% on each chunk boundary.
                if (!onProgress) return;
                const completedBytes = i * CHUNK_BYTES + p.loaded;
                const denom = totalBytes;
                onProgress({
                    fraction: denom > 0 ? completedBytes / denom : 0,
                    loaded: completedBytes,
                    total: denom,
                    // Show "uploading" through every chunk; anchoring
                    // status applies to the final manifest only.
                    phase: i === chunkCount - 1 ? p.phase : "uploading",
                });
            }
        );
        chunks.push({
            index: i,
            rootHash: result.rootHash,
            txHash: result.txHash,
            size: result.size,
        });
    }

    // Anchor the manifest as a small JSON pointing at every chunk.
    // Its rootHash is the single on-chain pointer.
    const manifest = JSON.stringify(
        {
            kind: "mekar-chunked-upload",
            version: "v1",
            tag: tag ?? null,
            totalBytes,
            chunkBytes: CHUNK_BYTES,
            chunks,
        },
        null,
        0
    );
    const manifestResult = await uploadToZGStorage(
        manifest,
        `${tag ?? "untagged"}-manifest`,
        "none",
        (p) =>
            onProgress?.({
                fraction: 1,
                loaded: totalBytes,
                total: totalBytes,
                phase: p.phase === "uploading" ? "uploading" : "anchoring",
            })
    );

    return {
        manifestRootHash: manifestResult.rootHash,
        manifestTxHash: manifestResult.txHash,
        totalBytes,
        chunkCount,
        chunks,
    };
}
