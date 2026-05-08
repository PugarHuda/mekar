/**
 * Frontend → backend bridge for 0G Storage uploads.
 *
 * The backend (`@mekar/backend`) wraps the @0gfoundation/0g-ts-sdk Indexer
 * and pays gas to anchor the file's Merkle root via a Flow contract tx.
 * From the browser we just POST the bytes — the rootHash that comes back
 * is what we hand to AgentINFT.mintGenesis/mintFork as `weightsPointer`.
 */

const BACKEND_URL =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) ?? "http://localhost:3001";

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

    const res = await fetch(`${BACKEND_URL}/api/storage/upload`, {
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

export function isBackendConfigured(): boolean {
    return Boolean(BACKEND_URL);
}

export const STORAGE_BACKEND_URL = BACKEND_URL;
