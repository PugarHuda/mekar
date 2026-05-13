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
};

/**
 * Upload an arbitrary blob (file bytes or text) to 0G Storage.
 *
 * @param bytes  Browser File, Blob, ArrayBuffer, or string.
 * @param tag    Free-form label (logged backend-side, not stored on chain).
 */
export async function uploadToZGStorage(
    bytes: Blob | ArrayBuffer | string,
    tag?: string
): Promise<StorageUploadResult> {
    let payload: { data: string; encoding: "utf8" | "base64" };

    if (typeof bytes === "string") {
        payload = { data: bytes, encoding: "utf8" };
    } else {
        // Convert Blob | ArrayBuffer → base64
        const buffer = bytes instanceof Blob ? await bytes.arrayBuffer() : bytes;
        const u8 = new Uint8Array(buffer);
        // Chunked btoa for large files (avoid call-stack overflow on 1MB+ inputs)
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < u8.length; i += chunkSize) {
            binary += String.fromCharCode.apply(
                null,
                Array.from(u8.subarray(i, i + chunkSize))
            );
        }
        payload = { data: btoa(binary), encoding: "base64" };
    }

    const res = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, tag, tier: "log" }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`storage upload failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as StorageUploadResult;
}

export const STORAGE_UPLOAD_ENDPOINT = UPLOAD_ENDPOINT;
