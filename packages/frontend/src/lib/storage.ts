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
    encryption?: "none" | "aes256";
    /** Present only when encryption !== "none". Hex-encoded AES-256 key
     *  the user must persist to recover the encrypted payload. */
    aesKey?: `0x${string}`;
};

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

    const body = JSON.stringify({ ...payload, tag, tier: "log", encryption });

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

        xhr.upload.onprogress = (e) => {
            if (!onProgress) return;
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
            onProgress?.({
                fraction: 1,
                loaded: totalBytes,
                total: totalBytes,
                phase: "anchoring",
            });
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const parsed = JSON.parse(xhr.responseText) as StorageUploadResult;
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

        xhr.onerror = () => reject(new Error("storage upload network error"));
        xhr.send(body);
    });
}

export const STORAGE_UPLOAD_ENDPOINT = UPLOAD_ENDPOINT;
