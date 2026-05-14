"use client";

/**
 * Owner-only metadata editor for an agent.
 *
 * The MEKAR contracts intentionally don't store `string name` on chain —
 * AgentLineage only carries hashes + lineage refs. So the human-facing
 * fields (name, description, capability tags, license) live off-chain in
 * the localStorage proxy today, and in 0G KV / Storage manifest tomorrow.
 *
 * This panel surfaces that editor for the wallet that owns the INFT:
 *
 *   1. Reads current metadata from `getAgentMetadata(id)`.
 *   2. Lets the owner edit fields inline.
 *   3. Persists via `saveAgentMetadata(id, ...)` — instant local update.
 *   4. Surfaces the path to anchor on chain:
 *      MekarRegistry.updateMetadata(id, bytes32 newPointer)
 *      where the pointer is a fresh 0G Storage rootHash of the manifest.
 *
 * Only the connected wallet matching `ownerAddress` sees the panel. Any
 * other viewer reads metadata as-is, no edit affordance.
 */

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
    getAgentMetadata,
    saveAgentMetadata,
    type AgentMeta,
} from "@/lib/agentMetadata";
import {
    type AgentCategory,
    CATEGORY_LABELS,
} from "@/lib/agentNaming";

const ALL_CATEGORIES: AgentCategory[] = [
    "translate",
    "code",
    "math",
    "vision",
    "retrieval",
    "reasoning",
    "general",
];

const LICENSES = ["MIT", "Apache-2.0", "CC-BY", "CC-BY-SA", "CC0", "Mekar-Commercial"];

type Props = {
    agentId: number;
    ownerAddress: `0x${string}` | string;
};

export function EditMetadataPanel({ agentId, ownerAddress }: Props) {
    const { address } = useAccount();
    const isOwner =
        !!address && address.toLowerCase() === ownerAddress.toString().toLowerCase();

    const [open, setOpen] = useState(false);
    const [meta, setMeta] = useState<AgentMeta>({});

    useEffect(() => {
        setMeta(getAgentMetadata(agentId) ?? {});
    }, [agentId]);

    // Hide the affordance for non-owners. We intentionally render NOTHING
    // for them — a disabled button would still leak "you're not the owner",
    // which adds visual noise to the read-only viewing experience.
    if (!isOwner) return null;

    function saveLocal() {
        // Reject empty name to keep displays from collapsing to "untitled"
        // after a save. Trimming protects against whitespace-only inputs.
        if (meta.name !== undefined && meta.name.trim().length > 0 && meta.name.trim().length < 3) {
            toast.error("Name needs ≥ 3 characters");
            return;
        }
        if (meta.categories && meta.categories.length === 0) {
            toast.error("Keep at least one capability tag");
            return;
        }
        saveAgentMetadata(agentId, meta);
        toast.success("Metadata saved locally");
        setOpen(false);
    }

    function toggleCat(c: AgentCategory) {
        const current = meta.categories ?? (meta.category ? [meta.category] : []);
        const next = current.includes(c)
            ? current.filter((x) => x !== c)
            : [...current, c];
        setMeta({ ...meta, categories: next.length > 0 ? next : current });
    }

    return (
        <div style={{ marginTop: 16 }}>
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="btn btn--ghost"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                    }}
                    title="You own this bloom — edit name, description, capability tags, license."
                >
                    <Pencil size={12} /> Edit metadata
                </button>
            )}

            {open && (
                <div
                    style={{
                        marginTop: 12,
                        padding: 20,
                        border: "1.5px solid var(--cocoa)",
                        background: "var(--bg-alt)",
                        borderRadius: "var(--radius)",
                    }}
                >
                    <div
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 10.5,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "var(--ink-soft)",
                            marginBottom: 14,
                        }}
                    >
                        Edit metadata · owner only
                    </div>

                    <FieldRow label="Name">
                        <input
                            type="text"
                            value={meta.name ?? ""}
                            onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                            placeholder="e.g. Jasmine-Indo-7B"
                            style={inputStyle}
                        />
                    </FieldRow>

                    <FieldRow label="Description">
                        <textarea
                            value={meta.description ?? ""}
                            onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                            placeholder="One paragraph — what does this agent do, who is it for?"
                            rows={3}
                            style={{ ...inputStyle, fontFamily: "var(--body)" }}
                        />
                    </FieldRow>

                    <FieldRow label="Capability tags (one or more)">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {ALL_CATEGORIES.map((c) => {
                                const current = meta.categories ?? (meta.category ? [meta.category] : []);
                                const active = current.includes(c);
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => toggleCat(c)}
                                        className={`pill ${active ? "active" : ""}`}
                                        style={{ textTransform: "none", fontSize: 12 }}
                                    >
                                        {active ? "✓ " : ""}
                                        {CATEGORY_LABELS[c]}
                                    </button>
                                );
                            })}
                        </div>
                    </FieldRow>

                    <FieldRow label="License">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {LICENSES.map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => setMeta({ ...meta, license: l })}
                                    className={`pill ${meta.license === l ? "active" : ""}`}
                                    style={{ fontSize: 12 }}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </FieldRow>

                    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                        <button type="button" onClick={saveLocal} className="btn">
                            Save locally
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="btn btn--ghost"
                        >
                            Cancel
                        </button>
                    </div>

                    {/* Honest disclosure: saving here is per-device. To make the
                        change visible to anyone else, the owner re-uploads a
                        manifest to 0G Storage and calls updateMetadata with
                        the new rootHash. This is the bridge to authoritative
                        on-chain naming and is wired in Phase 2. */}
                    <p
                        style={{
                            marginTop: 14,
                            padding: "10px 12px",
                            background: "var(--surface)",
                            border: "1px solid var(--rule)",
                            borderRadius: 4,
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            color: "var(--ink-soft)",
                            lineHeight: 1.6,
                        }}
                    >
                        <strong style={{ color: "var(--ink)" }}>Heads up:</strong> this saves
                        to your browser only. To make it authoritative across devices,
                        re-upload a new manifest to 0G Storage and call{" "}
                        <code>MekarRegistry.updateMetadata(agentId, newPointer)</code> from
                        the owner wallet (Phase 2 — UI hook coming).
                    </p>
                </div>
            )}
        </div>
    );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginBottom: 6,
                }}
            >
                {label}
            </div>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    border: "1px solid var(--rule)",
    background: "var(--surface)",
    fontFamily: "var(--mono)",
    fontSize: 13,
    color: "var(--ink)",
    borderRadius: 4,
    outline: "none",
};
