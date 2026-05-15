import { describe, it, expect } from "vitest";
import {
    UploadSchema,
    originAllowed,
    isValidRootHash,
    MAX_DATA_LENGTH,
    MAX_TAG_LENGTH,
} from "./uploadGuards";

/**
 * Unit tests for the storage-upload validation guards. These are the
 * server-side defences that protect the deployer wallet from drain
 * (size cap) and abuse (origin allowlist) — worth pinning down so a
 * future refactor can't silently loosen them.
 */

describe("originAllowed", () => {
    it("accepts the production origin", () => {
        expect(originAllowed("https://mekar.vercel.app")).toBe(true);
    });

    it("accepts Vercel preview deployments", () => {
        expect(originAllowed("https://mekar-git-feat-x.vercel.app")).toBe(true);
    });

    it("accepts localhost dev on any port", () => {
        expect(originAllowed("http://localhost:3000")).toBe(true);
        expect(originAllowed("http://localhost")).toBe(true);
        expect(originAllowed("http://127.0.0.1:3100")).toBe(true);
    });

    it("rejects an unrelated origin", () => {
        expect(originAllowed("https://evil.example.com")).toBe(false);
        expect(originAllowed("https://mekar.vercel.app.evil.com")).toBe(false);
    });

    it("rejects a look-alike that isn't a real vercel.app subdomain", () => {
        // `notvercel.app` must not match the `*.vercel.app` pattern.
        expect(originAllowed("https://mekar.notvercel.app")).toBe(false);
    });

    it("returns true for a missing header (curl / server-to-server)", () => {
        // The route can't distinguish these; the rate limiter handles them.
        expect(originAllowed(null)).toBe(true);
    });
});

describe("isValidRootHash", () => {
    it("accepts a 0x + 64-hex rootHash", () => {
        expect(
            isValidRootHash(
                "0x" + "a".repeat(64)
            )
        ).toBe(true);
    });

    it("rejects wrong length", () => {
        expect(isValidRootHash("0x" + "a".repeat(63))).toBe(false);
        expect(isValidRootHash("0x" + "a".repeat(65))).toBe(false);
    });

    it("rejects a missing 0x prefix", () => {
        expect(isValidRootHash("a".repeat(64))).toBe(false);
    });

    it("rejects non-hex characters", () => {
        expect(isValidRootHash("0x" + "g".repeat(64))).toBe(false);
    });
});

describe("UploadSchema", () => {
    it("accepts a minimal valid body and applies defaults", () => {
        const parsed = UploadSchema.parse({ data: "hello" });
        expect(parsed.data).toBe("hello");
        // encoding + encryption default when omitted
        expect(parsed.encoding).toBe("utf8");
        expect(parsed.encryption).toBe("none");
    });

    it("rejects empty data", () => {
        expect(() => UploadSchema.parse({ data: "" })).toThrow();
    });

    it("rejects data above the size cap", () => {
        const tooBig = "x".repeat(MAX_DATA_LENGTH + 1);
        expect(() => UploadSchema.parse({ data: tooBig })).toThrow();
    });

    it("accepts data exactly at the size cap", () => {
        const atCap = "x".repeat(MAX_DATA_LENGTH);
        expect(() => UploadSchema.parse({ data: atCap })).not.toThrow();
    });

    it("rejects an over-long tag", () => {
        expect(() =>
            UploadSchema.parse({ data: "ok", tag: "t".repeat(MAX_TAG_LENGTH + 1) })
        ).toThrow();
    });

    it("rejects an unknown encoding", () => {
        expect(() =>
            UploadSchema.parse({ data: "ok", encoding: "rot13" })
        ).toThrow();
    });

    it("rejects an unknown encryption mode", () => {
        expect(() =>
            UploadSchema.parse({ data: "ok", encryption: "rsa" })
        ).toThrow();
    });

    it("accepts base64 encoding + aes256 encryption", () => {
        const parsed = UploadSchema.parse({
            data: "aGVsbG8=",
            encoding: "base64",
            encryption: "aes256",
        });
        expect(parsed.encoding).toBe("base64");
        expect(parsed.encryption).toBe("aes256");
    });
});
