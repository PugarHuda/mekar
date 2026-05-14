/**
 * Mekar — Deterministic agent name + focus generation.
 *
 * Each on-chain LineageNode is anonymous (no name/description fields on
 * the contract). For demo + UX clarity we synthesise a stable name and a
 * one-line focus phrase from (id, parentCount). Same id → same name +
 * focus, every render, on every device.
 *
 * Naming follows the woodcut / Indonesian bloom theme:
 *   • genesis  → base-model names (e.g. "Lotus-Base-7B")
 *   • fork     → specialty fine-tunes ("Jasmine-Translator")
 *   • compose  → hybrid agents     ("Marigold-Hybrid")
 *
 * When real metadata lives in 0G Storage later, swap this helper for
 * a fetcher — the call sites won't need to change.
 */

function hashSeed(input: string): () => number {
    let h = 1779033703 ^ input.length;
    for (let i = 0; i < input.length; i++) {
        h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return ((h >>> 0) % 100000) / 100000;
    };
}

type Kind = "genesis" | "fork" | "compose";

const NAMES: Record<Kind, string[]> = {
    genesis: [
        "Lotus-Base-7B",
        "Cendana-Core",
        "Mawar-Genesis-13B",
        "Melati-Multi-3B",
        "Anggrek-Base-70B",
        "Bunga-Origin",
        "Frangipani-Foundation",
        "Tulip-Prime-7B",
        "Kembang-Multi-Base",
        "Cempaka-Reasoner",
        "Selasih-Code-Base",
        "Kenanga-Vision-Base",
    ],
    fork: [
        "Jasmine-Translator",
        "Cempaka-Rust-Coder",
        "Mawar-Math-Tutor",
        "Anggrek-Vision",
        "Cendana-Summarizer",
        "Bougainville-RP",
        "Kembang-RAG",
        "Tulip-DocSearch",
        "Selasih-Indo-Tune",
        "Kenanga-Coder",
        "Lotus-Roleplay",
        "Frangipani-Tutor",
    ],
    compose: [
        "Marigold-Hybrid",
        "Cendana-Vision-RAG",
        "Lotus-Code-Math",
        "Frangipani-Multi",
        "Cempaka-Chat-Code",
        "Mawar-Translate-RAG",
        "Anggrek-Multi-Tool",
        "Bunga-Hybrid-Suite",
    ],
};

const FOCUS: Record<Kind, string[]> = {
    genesis: [
        "multilingual base",
        "general reasoning",
        "code foundation",
        "long-context base",
        "vision-language base",
        "instruct-tuned base",
        "math foundation",
        "indo language base",
    ],
    fork: [
        "indo translation",
        "rust codegen",
        "math tutoring",
        "image captioning",
        "doc summarization",
        "roleplay agent",
        "indo retrieval",
        "code review",
        "doc search",
        "instruct fine-tune",
    ],
    compose: [
        "code + math hybrid",
        "vision + retrieval",
        "translate + summarize",
        "code + chat assistant",
        "multi-modal reasoner",
        "translate + rag",
        "tools + reasoning",
    ],
};

export function kindFromParents(parentCount: number): Kind {
    if (parentCount === 0) return "genesis";
    if (parentCount === 1) return "fork";
    return "compose";
}

// Canonical focus phrase per category — used when the user explicitly
// picks a capability at mint time. Without a user override we still
// fall back to the deterministic random pool below so legacy agents
// (and seed data minted before the picker shipped) keep their identity.
const CATEGORY_FOCUS: Record<AgentCategory, string> = {
    translate: "indo translation",
    code: "code generation",
    math: "math reasoning",
    vision: "image understanding",
    retrieval: "doc retrieval",
    reasoning: "general reasoning",
    general: "general assistant",
};

export function agentName(id: number, parentCount: number): string {
    // Lazy-require to avoid circular type imports during SSR.
    let userMeta = null;
    try {
        const { getAgentMetadata } = require("./agentMetadata") as typeof import("./agentMetadata");
        userMeta = getAgentMetadata(id);
    } catch {
        // Ignore — fall through to deterministic name below.
    }
    if (userMeta?.name) return userMeta.name;

    const kind = kindFromParents(parentCount);
    const pool = NAMES[kind];
    const rng = hashSeed(`name-${id}-${kind}`);
    return pool[Math.floor(rng() * pool.length)];
}

export function agentFocus(id: number, parentCount: number): string {
    // If user picked a category at mint, prefer the canonical phrase for
    // that category — keeps name + capability consistent rather than the
    // pool sometimes spitting out a focus that doesn't match the badge.
    let userMeta = null;
    try {
        const { getAgentMetadata } = require("./agentMetadata") as typeof import("./agentMetadata");
        userMeta = getAgentMetadata(id);
    } catch {
        // Ignore — fall through to deterministic pool below.
    }
    if (userMeta?.category) return CATEGORY_FOCUS[userMeta.category];

    const kind = kindFromParents(parentCount);
    const pool = FOCUS[kind];
    const rng = hashSeed(`focus-${id}-${kind}`);
    return pool[Math.floor(rng() * pool.length)];
}

/**
 * Stable category derived from a focus phrase. Used by the explorer
 * filter chips so users can narrow the lineage tree by capability
 * (translate / code / vision / etc.) instead of just by kind
 * (genesis / fork / compose).
 *
 * Priority order matters: first-match-wins from specific → generic.
 * "code + math hybrid" lands in `code`; "vision-language base" lands
 * in `vision` rather than `base`.
 */
export type AgentCategory =
    | "translate"
    | "code"
    | "math"
    | "vision"
    | "retrieval"
    | "reasoning"
    | "general";

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
    translate: "Translate",
    code: "Code",
    math: "Math",
    vision: "Vision",
    retrieval: "Retrieval",
    reasoning: "Reasoning",
    general: "General",
};

export function categoryFromFocus(focus: string): AgentCategory {
    const f = focus.toLowerCase();
    if (/translat|multilingual|indo language/.test(f)) return "translate";
    if (/code|codegen/.test(f)) return "code";
    if (/math/.test(f)) return "math";
    if (/vision|image|multi-modal/.test(f)) return "vision";
    if (/retrieval|rag|search|summariz|doc/.test(f)) return "retrieval";
    if (/reasoning|reasoner/.test(f)) return "reasoning";
    return "general";
}

export function agentCategory(id: number, parentCount: number): AgentCategory {
    // User-picked category short-circuits the derived path.
    // Prefer categories[] (multi-capability), fall back to legacy single.
    try {
        const { getAgentCategories } = require("./agentMetadata") as typeof import("./agentMetadata");
        const cats = getAgentCategories(id);
        if (cats && cats[0]) return cats[0];
    } catch {
        // Ignore — fall through to focus-derived category.
    }

    return categoryFromFocus(agentFocus(id, parentCount));
}

/**
 * Returns up to N capability tags for an agent. If the user picked
 * multiple at mint time, all are returned in pick order. Otherwise
 * a single deterministic category is returned so badges always have
 * something to render.
 */
export function agentCategories(id: number, parentCount: number): AgentCategory[] {
    try {
        const { getAgentCategories } = require("./agentMetadata") as typeof import("./agentMetadata");
        const cats = getAgentCategories(id);
        if (cats && cats.length > 0) return cats;
    } catch {
        // fall through
    }
    return [categoryFromFocus(agentFocus(id, parentCount))];
}
