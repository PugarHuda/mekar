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
 * seed agents on Galileo).
 */

import type { AgentCategory } from "./agentNaming";

export type AgentMeta = {
    name?: string;
    category?: AgentCategory;
    description?: string;
    license?: string;
};

const KEY_PREFIX = "mekar:agent:";

function isBrowser() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveAgentMetadata(id: number, meta: AgentMeta): void {
    if (!isBrowser()) return;
    try {
        const existing = getAgentMetadata(id) ?? {};
        const merged: AgentMeta = { ...existing, ...meta };
        window.localStorage.setItem(KEY_PREFIX + id, JSON.stringify(merged));
    } catch {
        // localStorage full / disabled / SSR — silent, deterministic fallback
        // path still works in agentName / agentFocus / agentCategory.
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
