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
import {
    useAccount,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import { Pencil, Anchor, Loader2 } from "lucide-react";
import {
    getAgentMetadata,
    saveAgentMetadata,
    META_LIMITS,
    type AgentMeta,
} from "@/lib/agentMetadata";
import {
    type AgentCategory,
    CATEGORY_LABELS,
} from "@/lib/agentNaming";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import { MEKAR_REGISTRY_ABI } from "@/contracts/abis";
import { uploadToZGStorage } from "@/lib/storage";
import { explorerLink } from "@/lib/chains";

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
    // Anchor-on-chain flow: build a manifest from current edits, ship it
    // to 0G Storage, then call MekarRegistry.updateMetadata with the
    // returned rootHash. Two stages so the user sees each step.
    const [anchoring, setAnchoring] = useState(false);
    const { writeContract, data: anchorTx, isPending: anchorTxPending } = useWriteContract();
    const { isLoading: anchorConfirming, isSuccess: anchorSettled } =
        useWaitForTransactionReceipt({ hash: anchorTx });

    useEffect(() => {
        setMeta(getAgentMetadata(agentId) ?? {});
    }, [agentId]);

    // Surface a confirmation when the anchor tx lands so the user knows
    // the on-chain pointer was updated.
    useEffect(() => {
        if (anchorSettled) {
            toast.success("Metadata anchored on chain");
            setAnchoring(false);
        }
    }, [anchorSettled]);

    // Hide the affordance for non-owners. We intentionally render NOTHING
    // for them — a disabled button would still leak "you're not the owner",
    // which adds visual noise to the read-only viewing experience.
    if (!isOwner) return null;

    function validate(): string | null {
        if (
            meta.name !== undefined &&
            meta.name.trim().length > 0 &&
            meta.name.trim().length < 3
        ) {
            return "Name needs ≥ 3 characters";
        }
        if (meta.categories && meta.categories.length === 0) {
            return "Keep at least one capability tag";
        }
        return null;
    }

    function saveLocal() {
        const err = validate();
        if (err) {
            toast.error(err);
            return;
        }
        saveAgentMetadata(agentId, meta);
        toast.success("Metadata saved locally");
        setOpen(false);
    }

    /**
     * Authoritative path: upload a fresh manifest to 0G Storage and call
     * MekarRegistry.updateMetadata with the new rootHash. Any node + the
     * frontend can subsequently fetch the manifest by hash, so the
     * displayed name / description / license stops being device-local.
     *
     * Two failure modes to handle distinctly:
     *   - Upload fails → toast + abort; we don't call writeContract.
     *   - Tx reverts on chain → wagmi's onError gives us a string.
     */
    async function anchorOnChain() {
        const err = validate();
        if (err) {
            toast.error(err);
            return;
        }
        setAnchoring(true);
        try {
            // We save locally FIRST so even if the on-chain anchor fails
            // the user's edits don't evaporate.
            saveAgentMetadata(agentId, meta);
            const manifest = JSON.stringify(
                {
                    kind: "mekar-agent-metadata",
                    schema: "v1",
                    agentId,
                    updatedAt: new Date().toISOString(),
                    name: meta.name?.trim() ?? null,
                    description: meta.description ?? null,
                    categories: meta.categories ?? (meta.category ? [meta.category] : null),
                    license: meta.license ?? null,
                },
                null,
                2
            );
            const result = await uploadToZGStorage(
                manifest,
                `mekar-meta-update-${agentId}-${Date.now()}`
            );
            // Submit the on-chain update — owner gate is enforced inside
            // MekarRegistry.updateMetadata. We catch revert via wagmi.
            writeContract(
                {
                    address: CONTRACT_ADDRESSES.MekarRegistry,
                    abi: MEKAR_REGISTRY_ABI,
                    functionName: "updateMetadata",
                    args: [BigInt(agentId), result.rootHash],
                },
                {
                    onError: (e) => {
                        toast.error(`Anchor tx failed: ${e.message.slice(0, 160)}`);
                        setAnchoring(false);
                    },
                }
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(`Upload failed: ${msg.slice(0, 160)}`);
            setAnchoring(false);
        }
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

                    <FieldRow label={`Name (max ${META_LIMITS.name})`}>
                        <input
                            type="text"
                            value={meta.name ?? ""}
                            maxLength={META_LIMITS.name}
                            onChange={(e) =>
                                setMeta({
                                    ...meta,
                                    name: e.target.value.slice(0, META_LIMITS.name),
                                })
                            }
                            placeholder="e.g. Jasmine-Indo-7B"
                            style={inputStyle}
                        />
                    </FieldRow>

                    <FieldRow label={`Description (max ${META_LIMITS.description})`}>
                        <textarea
                            value={meta.description ?? ""}
                            maxLength={META_LIMITS.description}
                            onChange={(e) =>
                                setMeta({
                                    ...meta,
                                    description: e.target.value.slice(0, META_LIMITS.description),
                                })
                            }
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

                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            marginTop: 18,
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            type="button"
                            onClick={saveLocal}
                            disabled={anchoring}
                            className="btn btn--ghost"
                        >
                            Save locally
                        </button>
                        <button
                            type="button"
                            onClick={anchorOnChain}
                            disabled={anchoring || anchorTxPending || anchorConfirming}
                            className="btn"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                            title="Upload a manifest to 0G Storage and call MekarRegistry.updateMetadata. Becomes the authoritative pointer for this agent."
                        >
                            {anchoring || anchorTxPending || anchorConfirming ? (
                                <>
                                    <Loader2 className="animate-spin" size={12} />
                                    {anchorConfirming
                                        ? "Anchoring tx…"
                                        : anchorTxPending
                                          ? "Confirming…"
                                          : "Uploading manifest…"}
                                </>
                            ) : (
                                <>
                                    <Anchor size={12} /> Anchor on chain
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={anchoring}
                            className="btn btn--ghost"
                        >
                            Cancel
                        </button>
                    </div>

                    {anchorTx && (
                        <p
                            style={{
                                marginTop: 12,
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                color: "var(--ink-soft)",
                            }}
                        >
                            anchor tx:{" "}
                            <a
                                href={explorerLink(anchorTx, "tx")}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "var(--cocoa)", textDecoration: "underline" }}
                            >
                                {anchorTx.slice(0, 12)}…{anchorTx.slice(-8)}
                            </a>
                        </p>
                    )}

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
                        <strong style={{ color: "var(--ink)" }}>Two save modes:</strong>{" "}
                        <em>Save locally</em> writes to this browser only (instant, no gas).{" "}
                        <em>Anchor on chain</em> uploads a fresh manifest to 0G Storage and
                        calls <code>updateMetadata</code> on the registry — becomes
                        authoritative across every device (small tx fee).
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
