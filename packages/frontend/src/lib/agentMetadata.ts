/**
 * Client-side metadata for agents.
 *
 * The MEKAR contract stores only hashes + lineage refs on chain — there's
 * no `string name` field on the INFT, so anything the user picks at mint
 * time (custom name, capability category, description) has to live
 * somewhere off-chain.
 *
 * For the hackathon demo we cache it in `localStorage` keyed by tokenId.
 * Same-device only, but instant lookup and zero infra. Production swap:
 *   1. Encode this same shape into the JSON payload that gets uploaded
 *      to 0G Storage at mint time (already wired in /mint Step 2).
 *   2. The returned rootHash IS the agent's `weightsPointer` on chain.
 *   3. On display, fetch the manifest from 0G Storage by rootHash and
 *      hydrate the same way.
 *
 * The functions below intentionally fall back to `null` on read so
 * the deterministic `agentName` / `agentFocus` / `agentCategory` paths
 * still work for agents minted before this UI shipped (e.g. the demo
 * seed agents).
 */

import type { AgentCategory } from "./agentNaming";

/**
 * Agent metadata persisted per token id.
 *
 * `categories` is the canonical multi-capability field. `category`
 * (singular) is kept around for backwards compatibility with metadata
 * written before the multi-picker shipped — readers should prefer
 * `getAgentCategories()` which normalises both shapes.
 */
export type AgentMeta = {
    name?: string;
    category?: AgentCategory;        // legacy single (pre-multi-capability)
    categories?: AgentCategory[];     // canonical: 1..N capability tags
    description?: string;
    license?: string;
    /**
     * 0G Storage rootHash of this metadata blob, set by
     * `anchorMetadataOn0G` after a save. localStorage is the instant
     * working copy; this is the decentralized, content-addressed anchor
     * — proof the metadata lives on 0G Storage, not just one browser.
     */
    _0gAnchor?: string;
    /** Flow-contract tx hash of the metadata anchor. */
    _0gAnchorTx?: string;
};

/**
 * Returns the agent's capability tags as a non-empty array, falling
 * back to the legacy `category` field if `categories` is missing.
 * Returns null if the metadata has no capability info — callers should
 * then derive a category from the deterministic name pool.
 */
export function getAgentCategories(id: number): AgentCategory[] | null {
    const meta = getAgentMetadata(id);
    if (!meta) return null;
    if (meta.categories && meta.categories.length > 0) return meta.categories;
    if (meta.category) return [meta.category];
    return null;
}

const KEY_PREFIX = "mekar:agent:";

// Per-field caps. Without these a user (or bug) could put a 10 MB
// description into localStorage and:
//   (a) blow the 5–10 MB browser quota for that origin, breaking save
//       for every other agent + RoyaltyPaid log cache on the device
//   (b) wreck UI layout with an un-wrapping line of garbage
//   (c) exfiltrate noise to anyone viewing the agent page
// The caps are generous (room for a real bio) but bounded.
export const META_LIMITS = {
    name: 80,
    description: 2_000,
    license: 60,
    categoryTags: 7, // matches the AgentCategory enum count
} as const;

function isBrowser() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Defensively clamp every string field to its declared cap. Even if a
 * caller forgets to pass `maxLength` on its input, the persisted blob
 * is safe. Trim whitespace for clean compares.
 */
function clampMeta(meta: AgentMeta): AgentMeta {
    const out: AgentMeta = { ...meta };
    if (typeof out.name === "string") out.name = out.name.trim().slice(0, META_LIMITS.name);
    if (typeof out.description === "string")
        out.description = out.description.slice(0, META_LIMITS.description);
    if (typeof out.license === "string")
        out.license = out.license.trim().slice(0, META_LIMITS.license);
    if (Array.isArray(out.categories))
        out.categories = out.categories.slice(0, META_LIMITS.categoryTags);
    return out;
}

export function saveAgentMetadata(id: number, meta: AgentMeta): void {
    if (!isBrowser()) return;
    try {
        const existing = getAgentMetadata(id) ?? {};
        const merged = clampMeta({ ...existing, ...meta });
        const serialised = JSON.stringify(merged);
        // Hard floor on the serialised blob just in case some new field
        // gets added and forgets to declare a cap above. 16 KB ≫ any
        // realistic metadata payload.
        if (serialised.length > 16 * 1024) {
            // eslint-disable-next-line no-console
            console.warn(`[mekar] agent meta ${id} exceeded 16KB; not saving`);
            return;
        }
        window.localStorage.setItem(KEY_PREFIX + id, serialised);
        // Anchor the metadata on 0G Storage in the background. The
        // localStorage write above is the instant working copy; this
        // never blocks it and never throws into the caller.
        void anchorMetadataOn0G(id);
    } catch {
        // localStorage full / disabled / SSR — silent, deterministic fallback
        // path still works in agentName / agentFocus / agentCategory.
    }
}

/**
 * Anchor an agent's metadata on 0G Storage (Log tier) via the same
 * `/api/storage/upload` route the weights flow uses — a real, verifiable
 * 0G Storage write. Fire-and-forget: localStorage stays the instant
 * working copy; this runs in the background and writes the returned
 * rootHash back so the UI can prove "metadata anchored on 0G". Any
 * failure is silent — the localStorage copy is unaffected.
 */
export async function anchorMetadataOn0G(id: number): Promise<void> {
    if (!isBrowser()) return;
    try {
        const meta = getAgentMetadata(id);
        if (!meta) return;
        // Hash only the content — strip the anchor refs so they don't
        // recursively feed into their own rootHash.
        const content: AgentMeta = { ...meta };
        delete content._0gAnchor;
        delete content._0gAnchorTx;
        const payload = JSON.stringify({ kind: "mekar-agent-metadata", tokenId: id, ...content });
        const res = await fetch("/api/storage/upload", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                data: payload,
                encoding: "utf8",
                encryption: "none",
                tag: `agent-meta-${id}`,
            }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { rootHash?: string; txHash?: string };
        if (!json.rootHash) return;
        // Write the anchor refs straight to storage — NOT via
        // saveAgentMetadata, which would re-trigger this function.
        const current = getAgentMetadata(id) ?? {};
        window.localStorage.setItem(
            KEY_PREFIX + id,
            JSON.stringify(
                clampMeta({ ...current, _0gAnchor: json.rootHash, _0gAnchorTx: json.txHash })
            )
        );
    } catch {
        // Network / route error — the localStorage copy stays the working
        // truth; the anchor simply retries on the next save.
    }
}

export function getAgentMetadata(id: number): AgentMeta | null {
    if (!isBrowser()) return null;
    try {
        const raw = window.localStorage.getItem(KEY_PREFIX + id);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AgentMeta;
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}
