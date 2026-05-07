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

export function agentName(id: number, parentCount: number): string {
    const kind = kindFromParents(parentCount);
    const pool = NAMES[kind];
    const rng = hashSeed(`name-${id}-${kind}`);
    return pool[Math.floor(rng() * pool.length)];
}

export function agentFocus(id: number, parentCount: number): string {
    const kind = kindFromParents(parentCount);
    const pool = FOCUS[kind];
    const rng = hashSeed(`focus-${id}-${kind}`);
    return pool[Math.floor(rng() * pool.length)];
}
