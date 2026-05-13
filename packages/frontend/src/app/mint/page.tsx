"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    useAccount,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";
import { keccak256, toHex } from "viem";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Bloom } from "@/components/Bloom";
import { useLineageData } from "@/hooks/useLineageData";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { AGENT_INFT_ABI } from "@/contracts/abis";
import { explorerLink } from "@/lib/chains";
import { uploadToZGStorage, type StorageUploadResult } from "@/lib/storage";
import {
    agentName,
    agentFocus,
    kindFromParents,
    CATEGORY_LABELS,
    type AgentCategory,
} from "@/lib/agentNaming";
import { saveAgentMetadata } from "@/lib/agentMetadata";
import { ExternalLink, Loader2 } from "lucide-react";

type Mode = "genesis" | "fork" | "compose";

/**
 * Royalty config the user can tune in Step 3 (Genesis only). Values are
 * integer percentages 0-100 for human-friendly input; conversion to BPS
 * (×100) happens at mint time. The contract requires
 * directOwnerBps + gen1Bps + gen2Bps + gen3PlusBps + trainingDataBps == 10000,
 * so we keep the percent-sum invariant in the UI as well.
 */
type RoyaltyConfig = {
    directOwnerPct: number;
    gen1Pct: number;
    gen2Pct: number;
    gen3PlusPct: number;
    trainingPct: number;
};

const DEFAULT_ROYALTY: RoyaltyConfig = {
    directOwnerPct: 50,
    gen1Pct: 25,
    gen2Pct: 15,
    gen3PlusPct: 7,
    trainingPct: 3,
};

const MAX_GENERATIONS_PAID = 10;

function royaltyConfigSum(cfg: RoyaltyConfig): number {
    return cfg.directOwnerPct + cfg.gen1Pct + cfg.gen2Pct + cfg.gen3PlusPct + cfg.trainingPct;
}

function royaltyConfigValid(cfg: RoyaltyConfig): boolean {
    return royaltyConfigSum(cfg) === 100;
}

function royaltyConfigToBps(cfg: RoyaltyConfig) {
    return {
        directOwnerBps: cfg.directOwnerPct * 100,
        gen1Bps: cfg.gen1Pct * 100,
        gen2Bps: cfg.gen2Pct * 100,
        gen3PlusBps: cfg.gen3PlusPct * 100,
        trainingDataBps: cfg.trainingPct * 100,
        maxGenerationsPaid: MAX_GENERATIONS_PAID,
    } as const;
}

export default function MintPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg)" }} />}>
            <MintPageInner />
        </Suspense>
    );
}

function MintPageInner() {
    const searchParams = useSearchParams();
    const initialMode: Mode = searchParams.get("compose")
        ? "compose"
        : searchParams.get("fork")
          ? "fork"
          : "genesis";
    const initialFork = searchParams.get("fork");
    const initialCompose = searchParams.get("compose");

    const [mode, setMode] = useState<Mode>(initialMode);
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [datasetNote, setDatasetNote] = useState("");
    const [license, setLicense] = useState("MIT");
    const [parentId, setParentId] = useState<number | null>(
        initialFork ? parseInt(initialFork, 10) : null
    );
    const [parentIds, setParentIds] = useState<number[]>(
        initialCompose
            ? initialCompose
                  .split(",")
                  .map((s) => parseInt(s.trim(), 10))
                  .filter((n) => !isNaN(n))
            : []
    );

    // Real 0G Storage upload state — replaces the keccak256 stub. Once a file
    // is uploaded the returned rootHash is what we send on-chain.
    const [storageUpload, setStorageUpload] = useState<StorageUploadResult | null>(null);

    // Tunable royalty schema (Genesis only — forks + composes inherit).
    const [royalty, setRoyalty] = useState<RoyaltyConfig>(DEFAULT_ROYALTY);
    const royaltySum = royaltyConfigSum(royalty);
    const royaltyValid = royaltyConfigValid(royalty);

    // Capability category the user picks at mint. Stored in localStorage on
    // success keyed by the next tokenId so display surfaces (explorer,
    // dashboard, agent detail) can show "this agent is for code" instead
    // of guessing from the random focus pool.
    const [category, setCategory] = useState<AgentCategory>("general");

    const { address } = useAccount();
    const { nodes, totalAgents, refetch: refetchLineage } = useLineageData();

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    // Auto-refresh the lineage cache the moment the mint tx confirms.
    // We also persist the user-picked metadata (name, category, etc.) to
    // localStorage keyed by the expected new tokenId so display surfaces
    // pick up the choices immediately. Phase 2: encode this same shape
    // into the 0G Storage manifest so cross-device + multi-user works.
    useEffect(() => {
        if (!isSuccess) return;

        const newTokenId = totalAgents + 1;
        saveAgentMetadata(newTokenId, {
            name: name || undefined,
            category,
            description: description || undefined,
            license,
        });

        refetchLineage().catch(() => {
            /* silent — pickers will still update on next natural refetch */
        });
    }, [isSuccess, refetchLineage, totalAgents, name, category, description, license]);

    const seed = useMemo(
        () => `${name || "untitled"}-${mode}-${address ?? "anon"}-${Date.now()}`,
        [name, mode, address]
    );
    const previewSeed = useMemo(() => seed, [seed]);

    /* ─────────────── Mint actions ─────────────── */

    /**
     * Resolve the on-chain weightsPointer. Prefer the real 0G Storage rootHash
     * if the user uploaded; fall back to a deterministic stub for the case
     * where the backend isn't running (so the demo still mints without the
     * full Q3 path).
     */
    function resolveWeightsPointer(seedPrefix: string): `0x${string}` {
        if (storageUpload?.rootHash) return storageUpload.rootHash;
        return keccak256(toHex(`${seedPrefix}:${seed}`));
    }

    function handleMintGenesis() {
        if (!address) {
            toast.error("Connect a wallet first");
            return;
        }
        if (!royaltyValid) {
            toast.error(`Royalty must sum to 100% (current: ${royaltySum}%)`);
            return;
        }
        const weightsPtr = resolveWeightsPointer("weights");
        const trainingMerkle = keccak256(toHex(`training:${datasetNote || seed}`));
        const teeProof = keccak256(toHex(`tee:${seed}`));

        writeContract(
            {
                address: CONTRACT_ADDRESSES.AgentINFT,
                abi: AGENT_INFT_ABI,
                functionName: "mintGenesis",
                args: [
                    weightsPtr,
                    trainingMerkle,
                    teeProof,
                    royaltyConfigToBps(royalty),
                    1,
                ],
            },
            {
                onSuccess: () =>
                    toast.success(
                        storageUpload
                            ? "Genesis minting with 0G Storage pointer…"
                            : "Genesis minting (stub pointer — upload weights to use real one)…"
                    ),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }

    function handleMintFork() {
        if (!address) return toast.error("Connect a wallet first");
        if (!parentId) return toast.error("Pick a parent bloom");
        const weightsPtr = resolveWeightsPointer("fork-weights");
        const trainingMerkle = keccak256(toHex(`fork-training:${datasetNote || seed}`));
        const teeProof = keccak256(toHex(`fork-tee:${seed}`));

        writeContract(
            {
                address: CONTRACT_ADDRESSES.AgentINFT,
                abi: AGENT_INFT_ABI,
                functionName: "mintFork",
                args: [BigInt(parentId), weightsPtr, trainingMerkle, teeProof],
            },
            {
                onSuccess: () => toast.success("Fork minting…"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }

    function handleMintCompose() {
        if (!address) return toast.error("Connect a wallet first");
        if (parentIds.length < 2) return toast.error("Pick at least 2 parents");
        const weightsPtr = resolveWeightsPointer("compose-weights");
        const trainingMerkle = keccak256(toHex(`compose-training:${seed}`));
        const teeProof = keccak256(toHex(`compose-tee:${seed}`));

        writeContract(
            {
                address: CONTRACT_ADDRESSES.AgentINFT,
                abi: AGENT_INFT_ABI,
                functionName: "mintCompose",
                args: [parentIds.map((id) => BigInt(id)), weightsPtr, trainingMerkle, teeProof, 0],
            },
            {
                onSuccess: () => toast.success("Composed bloom minting…"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }

    function handleMint() {
        setStep(4);
        if (mode === "genesis") handleMintGenesis();
        else if (mode === "fork") handleMintFork();
        else handleMintCompose();
    }

    return (
        <div>
            <Header />
            <main style={{ padding: "var(--pad-section) 0" }}>
                <div className="container" style={{ maxWidth: 1100 }}>
                    <header style={{ marginBottom: 56 }}>
                        <span className="eyebrow">/mint</span>
                        <h1 style={{ fontSize: "clamp(48px, 6vw, 80px)", marginTop: 12 }}>
                            Plant a <em>new bloom.</em>
                        </h1>
                        <p style={{ color: "var(--ink-soft)", marginTop: 12, maxWidth: "60ch" }}>
                            Register your model on the Mekar lineage. Once minted, every
                            inference flows royalties up the ancestor tree, forever.
                        </p>
                    </header>

                    {/* Stepper */}
                    <div
                        style={{
                            display: "flex",
                            gap: 0,
                            marginBottom: 40,
                            border: "1px solid var(--rule)",
                            borderRadius: "var(--radius)",
                            overflow: "hidden",
                            background: "var(--surface)",
                        }}
                    >
                        {["Choose lineage", "Configure weights", "Name & price", "Mint"].map(
                            (label, i) => {
                                const idx = i + 1;
                                const isActive = step === idx;
                                const isPast = step > idx;
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => setStep(idx)}
                                        disabled={!isPast && !isActive}
                                        style={{
                                            flex: 1,
                                            padding: "16px 18px",
                                            border: "none",
                                            borderRight:
                                                idx < 4 ? "1px solid var(--rule)" : "none",
                                            background: isActive ? "var(--gold)" : "transparent",
                                            color: isActive
                                                ? "var(--cocoa)"
                                                : isPast
                                                  ? "var(--ink)"
                                                  : "var(--ink-soft)",
                                            fontFamily: "var(--mono)",
                                            fontSize: 12,
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase",
                                            fontWeight: isActive ? 700 : 500,
                                            cursor: isActive || isPast ? "pointer" : "default",
                                            textAlign: "left",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontFamily: "var(--display)",
                                                fontStyle: "italic",
                                                fontSize: 18,
                                                marginRight: 10,
                                            }}
                                        >
                                            {idx}
                                        </span>
                                        {label}
                                    </button>
                                );
                            }
                        )}
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 360px",
                            gap: 32,
                            alignItems: "start",
                        }}
                    >
                        {/* Step content */}
                        <div
                            style={{
                                border: "1.5px solid var(--rule)",
                                background: "var(--surface)",
                                borderRadius: "var(--radius)",
                                padding: 32,
                                minHeight: 480,
                            }}
                        >
                            {step === 1 && (
                                <Step1
                                    mode={mode}
                                    setMode={setMode}
                                    parentId={parentId}
                                    setParentId={setParentId}
                                    parentIds={parentIds}
                                    setParentIds={setParentIds}
                                    nodes={nodes}
                                />
                            )}
                            {step === 2 && (
                                <Step2
                                    datasetNote={datasetNote}
                                    setDatasetNote={setDatasetNote}
                                    storageUpload={storageUpload}
                                    setStorageUpload={setStorageUpload}
                                    seed={seed}
                                />
                            )}
                            {step === 3 && (
                                <Step3
                                    mode={mode}
                                    name={name}
                                    setName={setName}
                                    description={description}
                                    setDescription={setDescription}
                                    license={license}
                                    setLicense={setLicense}
                                    royalty={royalty}
                                    setRoyalty={setRoyalty}
                                    category={category}
                                    setCategory={setCategory}
                                />
                            )}
                            {step === 4 && (
                                <Step4
                                    txHash={txHash}
                                    isPending={isPending}
                                    isConfirming={isConfirming}
                                    isSuccess={isSuccess}
                                />
                            )}

                            {/* Wizard nav */}
                            <div
                                style={{
                                    marginTop: 32,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    paddingTop: 24,
                                    borderTop: "1px solid var(--rule)",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                                    disabled={step === 1 || step === 4}
                                    className="btn btn--ghost"
                                    style={{ opacity: step === 1 || step === 4 ? 0.4 : 1 }}
                                >
                                    ← Back
                                </button>
                                {step < 3 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep((s) => s + 1)}
                                        className="btn"
                                    >
                                        Next →
                                    </button>
                                )}
                                {step === 3 && (
                                    <button
                                        type="button"
                                        onClick={handleMint}
                                        disabled={
                                            !address ||
                                            !isDeployed ||
                                            isPending ||
                                            (mode === "genesis" && !royaltyValid)
                                        }
                                        className="btn"
                                        title={
                                            mode === "genesis" && !royaltyValid
                                                ? `Royalty must sum to 100% (current: ${royaltySum}%)`
                                                : undefined
                                        }
                                    >
                                        {isPending
                                            ? "Confirming…"
                                            : mode === "genesis" && !royaltyValid
                                              ? `Royalty ${royaltySum}% / 100%`
                                              : "Mint bloom →"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Right rail: live preview */}
                        <aside
                            style={{
                                border: "1.5px solid var(--rule)",
                                background: "var(--bg-alt)",
                                borderRadius: "var(--radius)",
                                padding: 28,
                                position: "sticky",
                                top: 96,
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-soft)",
                                    marginBottom: 14,
                                }}
                            >
                                Live preview
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    padding: 16,
                                    background: "var(--surface)",
                                    border: "1px solid var(--rule)",
                                    borderRadius: 4,
                                    marginBottom: 16,
                                }}
                            >
                                <Bloom
                                    kind={mode}
                                    seed={previewSeed}
                                    size={160}
                                    sw={1.4}
                                />
                            </div>
                            <h3
                                style={{
                                    fontFamily: "var(--display)",
                                    fontStyle: "italic",
                                    fontSize: 28,
                                    margin: 0,
                                }}
                            >
                                {name || "Untitled bloom"}
                            </h3>
                            <div
                                style={{
                                    marginTop: 8,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 6,
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    letterSpacing: "0.04em",
                                    color: "var(--ink-soft)",
                                }}
                            >
                                <span
                                    style={{
                                        padding: "2px 8px",
                                        background: "var(--gold)",
                                        color: "var(--cocoa)",
                                        borderRadius: 999,
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        fontSize: 10,
                                        letterSpacing: "0.1em",
                                    }}
                                >
                                    {CATEGORY_LABELS[category]}
                                </span>
                                <span>·</span>
                                <span style={{ textTransform: "capitalize" }}>{mode}</span>
                                {address && (
                                    <>
                                        <span>·</span>
                                        <span title={address}>
                                            {address.slice(0, 6)}…{address.slice(-4)}
                                        </span>
                                    </>
                                )}
                            </div>
                            <p
                                style={{
                                    color: "var(--ink-soft)",
                                    fontSize: 13,
                                    marginTop: 10,
                                    minHeight: 40,
                                }}
                            >
                                {description || "Add a description in step 3."}
                            </p>

                            <hr className="divider" style={{ margin: "16px 0" }} />

                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-soft)",
                                    marginBottom: 8,
                                }}
                            >
                                Royalty cascade
                            </div>
                            <RoyaltyBars royalty={mode === "genesis" ? royalty : undefined} />
                        </aside>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

/* ─────────────── Step 1: choose lineage ─────────────── */

function Step1({
    mode,
    setMode,
    parentId,
    setParentId,
    parentIds,
    setParentIds,
    nodes,
}: {
    mode: Mode;
    setMode: (m: Mode) => void;
    parentId: number | null;
    setParentId: (id: number | null) => void;
    parentIds: number[];
    setParentIds: (ids: number[]) => void;
    nodes: { id: number; parents: number[]; generation: number }[];
}) {
    return (
        <div>
            <h2 style={{ fontSize: 32, marginBottom: 8 }}>
                What kind of <em>bloom</em>?
            </h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
                Genesis stands alone. Forks descend from a single parent. Composed agents merge
                two or more parents into one new bloom.
            </p>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    marginBottom: 28,
                }}
            >
                {(["genesis", "fork", "compose"] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        style={{
                            border: mode === m ? "1.5px solid var(--cocoa)" : "1.5px solid var(--rule)",
                            background: mode === m ? "var(--gold)" : "var(--bg-alt)",
                            padding: 18,
                            borderRadius: 6,
                            textAlign: "center",
                            cursor: "pointer",
                            color: mode === m ? "var(--cocoa)" : "var(--ink)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                            <Bloom kind={m} seed={m} size={70} sw={1.4} />
                        </div>
                        <div
                            style={{
                                fontFamily: "var(--display)",
                                fontStyle: "italic",
                                fontSize: 22,
                                textTransform: "capitalize",
                            }}
                        >
                            {m}
                        </div>
                    </button>
                ))}
            </div>

            {mode === "fork" && (
                <div>
                    <div
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "var(--ink-soft)",
                            marginBottom: 10,
                        }}
                    >
                        Pick a parent bloom
                    </div>
                    {nodes.length === 0 ? (
                        <p style={{ color: "var(--ink-soft)" }}>
                            No agents in the garden yet. Plant a Genesis first.
                        </p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                                gap: 12,
                            }}
                        >
                            {nodes.map((n) => (
                                <ParentCard
                                    key={n.id}
                                    node={n}
                                    selected={parentId === n.id}
                                    onClick={() => setParentId(n.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {mode === "compose" && (
                <div>
                    <div
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "var(--ink-soft)",
                            marginBottom: 10,
                        }}
                    >
                        Pick parents to merge (≥2)
                    </div>
                    {nodes.length < 2 ? (
                        <p style={{ color: "var(--ink-soft)" }}>
                            Need at least 2 existing agents to compose.
                        </p>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                                gap: 12,
                            }}
                        >
                            {nodes.map((n) => {
                                const sel = parentIds.includes(n.id);
                                return (
                                    <ParentCard
                                        key={n.id}
                                        node={n}
                                        selected={sel}
                                        composeMode
                                        onClick={() =>
                                            setParentIds(
                                                sel
                                                    ? parentIds.filter((p) => p !== n.id)
                                                    : [...parentIds, n.id]
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─────────────── Parent picker card (fork + compose) ─────────────── */

/**
 * Shows agent identity at-a-glance: bloom preview + synthesised name
 * + focus phrase + lineage caption. Replaces the old "#id / gen N"
 * picker that gave no signal about what the agent actually does.
 *
 * `composeMode` swaps the active highlight from gold (single-pick) to
 * pink (multi-select), matching the visual language of the rest of the
 * compose flow.
 */
function ParentCard({
    node,
    selected,
    onClick,
    composeMode = false,
}: {
    node: { id: number; parents: number[]; generation: number };
    selected: boolean;
    onClick: () => void;
    composeMode?: boolean;
}) {
    const kind = kindFromParents(node.parents.length);
    const name = agentName(node.id, node.parents.length);
    const focus = agentFocus(node.id, node.parents.length);

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                border: selected ? "1.5px solid var(--cocoa)" : "1px solid var(--rule)",
                background: selected
                    ? composeMode
                        ? "var(--pink)"
                        : "var(--gold)"
                    : "var(--bg-alt)",
                padding: 14,
                borderRadius: 6,
                cursor: "pointer",
                color: selected ? "var(--cocoa)" : "var(--ink)",
                textAlign: "left",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                transition: "background 120ms ease, border-color 120ms ease",
            }}
        >
            <div style={{ flexShrink: 0 }}>
                <Bloom kind={kind} seed={String(node.id)} size={48} sw={1.4} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div
                    style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {name}
                </div>
                <div
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        opacity: 0.85,
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {focus}
                </div>
                <div
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        opacity: 0.55,
                        marginTop: 6,
                        letterSpacing: "0.04em",
                    }}
                >
                    #{node.id} · gen {node.generation}
                </div>
            </div>
        </button>
    );
}

/* ─────────────── Step 2: weights / dataset (real 0G Storage) ─────────────── */

function Step2({
    datasetNote,
    setDatasetNote,
    storageUpload,
    setStorageUpload,
    seed,
}: {
    datasetNote: string;
    setDatasetNote: (v: string) => void;
    storageUpload: StorageUploadResult | null;
    setStorageUpload: (r: StorageUploadResult | null) => void;
    seed: string;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    async function handleUpload() {
        setUploadError(null);
        setUploading(true);
        try {
            // If a file is picked, upload it. Otherwise upload a manifest blob
            // built from the dataset note + seed so the on-chain pointer is
            // still real (not stub).
            const payload: Blob | string = file
                ? file
                : JSON.stringify(
                      {
                          kind: "mekar-agent-manifest",
                          seed,
                          datasetNote: datasetNote || "(none)",
                          createdAt: new Date().toISOString(),
                      },
                      null,
                      2
                  );
            const result = await uploadToZGStorage(payload, `mekar-mint-${seed}`);
            setStorageUpload(result);
            toast.success("Anchored to 0G Storage");
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setUploadError(msg);
            toast.error(msg.slice(0, 200));
        } finally {
            setUploading(false);
        }
    }

    return (
        <div>
            <h2 style={{ fontSize: 32, marginBottom: 8 }}>
                Pin the <em>weights.</em>
            </h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
                Upload your model weights (or a manifest if weights live elsewhere) to 0G Storage.
                The returned root hash anchors as your INFT&apos;s <code>weightsPointer</code>{" "}
                on chain. Skip this step and we&apos;ll mint with a deterministic stub instead.
            </p>

            <Field label="Training data summary">
                <input
                    type="text"
                    value={datasetNote}
                    onChange={(e) => setDatasetNote(e.target.value)}
                    placeholder="e.g. Indonesian medical corpus · 50 GB · CC-BY"
                    style={inputStyle}
                />
            </Field>

            <Field label="Weights file (optional)">
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    style={{
                        ...inputStyle,
                        padding: "10px 12px",
                        cursor: "pointer",
                    }}
                />
                <p
                    style={{
                        fontSize: 12,
                        color: "var(--ink-soft)",
                        marginTop: 6,
                        fontFamily: "var(--mono)",
                    }}
                >
                    {file
                        ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB`
                        : "No file picked — a JSON manifest will be uploaded instead."}
                </p>
            </Field>

            <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="btn"
                style={{ marginBottom: 20 }}
            >
                {uploading ? (
                    <>
                        <Loader2 className="animate-spin" size={14} style={{ marginRight: 6 }} />
                        Uploading to 0G Storage…
                    </>
                ) : storageUpload ? (
                    "Re-upload"
                ) : (
                    "Upload to 0G Storage"
                )}
            </button>

            {uploadError && (
                <div
                    style={{
                        background: "rgba(194, 90, 74, 0.08)",
                        border: "1px solid rgba(194, 90, 74, 0.4)",
                        borderRadius: 4,
                        padding: "10px 14px",
                        marginBottom: 16,
                        fontSize: 13,
                        color: "#c25a4a",
                        fontFamily: "var(--mono)",
                    }}
                >
                    {uploadError}
                </div>
            )}

            {storageUpload && (
                <div
                    style={{
                        background: "var(--bg-alt)",
                        border: "1.5px solid var(--cocoa)",
                        borderRadius: "var(--radius)",
                        padding: 18,
                    }}
                >
                    <div
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "var(--tea)",
                            marginBottom: 10,
                        }}
                    >
                        ✓ Anchored to 0G Storage
                    </div>
                    <ManifestRow
                        label="Root hash (on-chain pointer)"
                        value={storageUpload.rootHash}
                    />
                    <ManifestRow
                        label="Anchor tx"
                        value={storageUpload.txHash}
                        href={explorerLink(storageUpload.txHash, "tx")}
                    />
                    <ManifestRow
                        label="Size"
                        value={`${storageUpload.size} bytes`}
                    />
                </div>
            )}
        </div>
    );
}

function ManifestRow({
    label,
    value,
    href,
}: {
    label: string;
    value: string;
    href?: string;
}) {
    const inner = (
        <code
            style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--ink)",
                wordBreak: "break-all",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
            }}
        >
            {value}
            {href && <ExternalLink size={11} />}
        </code>
    );
    return (
        <div style={{ marginBottom: 8 }}>
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginBottom: 3,
                }}
            >
                {label}
            </div>
            {href ? (
                <Link
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "underline", textDecorationColor: "var(--rule)" }}
                >
                    {inner}
                </Link>
            ) : (
                inner
            )}
        </div>
    );
}

/* ─────────────── Step 3: name & price ─────────────── */

function Step3({
    mode,
    name,
    setName,
    description,
    setDescription,
    license,
    setLicense,
    royalty,
    setRoyalty,
    category,
    setCategory,
}: {
    mode: Mode;
    name: string;
    setName: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    license: string;
    setLicense: (v: string) => void;
    royalty: RoyaltyConfig;
    setRoyalty: (r: RoyaltyConfig) => void;
    category: AgentCategory;
    setCategory: (c: AgentCategory) => void;
}) {
    const licenses = [
        "MIT",
        "Apache-2.0",
        "CC-BY",
        "CC-BY-SA",
        "CC0",
        "Mekar-Commercial",
    ];
    const categories: AgentCategory[] = [
        "translate",
        "code",
        "math",
        "vision",
        "retrieval",
        "reasoning",
        "general",
    ];
    return (
        <div>
            <h2 style={{ fontSize: 32, marginBottom: 8 }}>
                Name &amp; <em>license.</em>
            </h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
                A bloom needs a name to be remembered. License terms are public and inform
                downstream forks.
            </p>

            <Field label="Bloom name">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jasmine-Indo-7B"
                    style={inputStyle}
                />
            </Field>

            <Field label="Capability (what this agent does)">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {categories.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCategory(c)}
                            className={`pill ${category === c ? "active" : ""}`}
                            style={{ textTransform: "none" }}
                        >
                            {CATEGORY_LABELS[c]}
                        </button>
                    ))}
                </div>
                <p
                    style={{
                        fontSize: 11,
                        color: "var(--ink-soft)",
                        marginTop: 6,
                        fontFamily: "var(--mono)",
                    }}
                >
                    Used for explorer search + filter. Stored client-side until 0G KV
                    metadata writeback ships in Phase 2.
                </p>
            </Field>

            <Field label="Description">
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="What does this agent do?"
                    style={{ ...inputStyle, resize: "vertical" }}
                />
            </Field>

            <Field label="License">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {licenses.map((l) => (
                        <button
                            key={l}
                            type="button"
                            onClick={() => setLicense(l)}
                            className={`pill ${license === l ? "active" : ""}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </Field>

            {mode === "genesis" ? (
                <RoyaltyEditor royalty={royalty} setRoyalty={setRoyalty} />
            ) : (
                <InheritedRoyaltyNotice mode={mode} />
            )}
        </div>
    );
}

/**
 * Genesis-only royalty configurator. Five percentage inputs that must sum
 * to exactly 100. Hidden behind an "Customize royalty" disclosure by
 * default — the 50/25/15/7/3 split fits the vast majority of creators,
 * and surfacing the full editor up-front buried the simpler license +
 * capability fields above it.
 *
 * Power users who want to tune still get the full UI with one click.
 */
function RoyaltyEditor({
    royalty,
    setRoyalty,
}: {
    royalty: RoyaltyConfig;
    setRoyalty: (r: RoyaltyConfig) => void;
}) {
    const sum = royaltyConfigSum(royalty);
    const ok = sum === 100;
    const isDefault =
        royalty.directOwnerPct === DEFAULT_ROYALTY.directOwnerPct &&
        royalty.gen1Pct === DEFAULT_ROYALTY.gen1Pct &&
        royalty.gen2Pct === DEFAULT_ROYALTY.gen2Pct &&
        royalty.gen3PlusPct === DEFAULT_ROYALTY.gen3PlusPct &&
        royalty.trainingPct === DEFAULT_ROYALTY.trainingPct;
    // Start expanded if the user already deviated from default (e.g. they
    // hit Back from Step 4 and want to keep tuning).
    const [expanded, setExpanded] = useState(!isDefault);
    const update =
        (key: keyof RoyaltyConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10) || 0));
            setRoyalty({ ...royalty, [key]: v });
        };

    const rows: {
        key: keyof RoyaltyConfig;
        label: string;
        hint: string;
        color: string;
    }[] = [
        {
            key: "directOwnerPct",
            label: "Direct owner",
            hint: "Goes to whoever owns this token at settle time",
            color: "var(--gold)",
        },
        {
            key: "gen1Pct",
            label: "Generation 1 (parents)",
            hint: "Split equally among direct parents on fork/compose",
            color: "var(--pink)",
        },
        {
            key: "gen2Pct",
            label: "Generation 2 (grandparents)",
            hint: "Deduplicated across multi-path lineages",
            color: "var(--coral)",
        },
        {
            key: "gen3PlusPct",
            label: "Generation 3+",
            hint: `Capped at depth ${MAX_GENERATIONS_PAID}; beyond → protocol treasury`,
            color: "var(--forest)",
        },
        {
            key: "trainingPct",
            label: "Training contributors",
            hint: "Splits via TrainingDataRegistry contributor list",
            color: "var(--ink-soft)",
        },
    ];

    // Collapsed summary view — shows the current split as a compact bar +
    // the cumulative percent breakdown, with a single button to expand
    // the full editor. Keeps Step 3 visually tight for the 80% of users
    // who'd rather just accept the default.
    if (!expanded) {
        return (
            <Field label={`Royalty schema  (${sum}% / 100%)`}>
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 14px",
                        border: "1px solid var(--rule)",
                        borderRadius: 4,
                        background: "var(--bg-alt)",
                    }}
                >
                    {/* Inline stacked bar */}
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            height: 8,
                            borderRadius: 999,
                            overflow: "hidden",
                            border: "1px solid var(--rule)",
                            background: "var(--surface)",
                        }}
                    >
                        {rows.map((r) => {
                            const v = royalty[r.key];
                            if (v === 0) return null;
                            return (
                                <div
                                    key={r.key}
                                    style={{
                                        width: `${v}%`,
                                        background: r.color,
                                    }}
                                    title={`${r.label}: ${v}%`}
                                />
                            );
                        })}
                    </div>
                    <code
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 12,
                            color: "var(--ink)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {royalty.directOwnerPct}/{royalty.gen1Pct}/{royalty.gen2Pct}/
                        {royalty.gen3PlusPct}/{royalty.trainingPct}
                    </code>
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            color: "var(--ink)",
                            background: "transparent",
                            border: "1px solid var(--rule)",
                            borderRadius: 4,
                            padding: "5px 10px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Customize →
                    </button>
                </div>
                <p
                    style={{
                        fontSize: 11,
                        color: "var(--ink-soft)",
                        marginTop: 6,
                        fontFamily: "var(--mono)",
                    }}
                >
                    Default cascade: owner / gen1 / gen2 / gen3+ / training. Forks +
                    composes inherit this from the genesis.
                </p>
            </Field>
        );
    }

    return (
        <Field label={`Royalty schema  (${sum}% / 100%)`}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    marginTop: -4,
                    marginBottom: 14,
                }}
            >
                <p
                    style={{
                        fontSize: 12,
                        color: ok ? "var(--ink-soft)" : "#c25a4a",
                        margin: 0,
                        fontFamily: "var(--mono)",
                        flex: 1,
                    }}
                >
                    {ok
                        ? "✓ Sum is 100% — ready to mint."
                        : `Adjust until the five rows sum to 100% (off by ${sum - 100 > 0 ? "+" : ""}${sum - 100}).`}
                </p>
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--ink-soft)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationColor: "var(--rule)",
                        padding: 0,
                    }}
                >
                    Collapse
                </button>
            </div>

            {/* Live stacked bar — visual feedback on the cascade shape */}
            <div
                style={{
                    display: "flex",
                    height: 10,
                    borderRadius: 999,
                    overflow: "hidden",
                    border: "1px solid var(--rule)",
                    marginBottom: 16,
                }}
            >
                {rows.map((r) => {
                    const v = royalty[r.key];
                    if (v === 0) return null;
                    return (
                        <div
                            key={r.key}
                            style={{
                                width: `${v}%`,
                                background: r.color,
                                height: "100%",
                            }}
                            title={`${r.label}: ${v}%`}
                        />
                    );
                })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rows.map((r) => (
                    <div
                        key={r.key}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) 84px",
                            gap: 12,
                            alignItems: "center",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 12,
                                    color: "var(--ink)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <span
                                    style={{
                                        display: "inline-block",
                                        width: 8,
                                        height: 8,
                                        borderRadius: 2,
                                        background: r.color,
                                    }}
                                />
                                {r.label}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "var(--ink-soft)",
                                    marginTop: 2,
                                }}
                            >
                                {r.hint}
                            </div>
                        </div>
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                            }}
                        >
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={royalty[r.key]}
                                onChange={update(r.key)}
                                style={{
                                    ...inputStyle,
                                    padding: "8px 10px",
                                    width: 60,
                                    textAlign: "right",
                                    fontFamily: "var(--mono)",
                                    fontSize: 13,
                                }}
                            />
                            <span
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 13,
                                    color: "var(--ink-soft)",
                                }}
                            >
                                %
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={() => setRoyalty(DEFAULT_ROYALTY)}
                style={{
                    marginTop: 12,
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--ink-soft)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textDecorationColor: "var(--rule)",
                    padding: 0,
                }}
            >
                Reset to default 50/25/15/7/3
            </button>
        </Field>
    );
}

function InheritedRoyaltyNotice({ mode }: { mode: Mode }) {
    return (
        <Field label="Royalty schema">
            <div
                style={{
                    border: "1px solid var(--rule)",
                    background: "var(--bg-alt)",
                    borderRadius: 4,
                    padding: "12px 14px",
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    lineHeight: 1.5,
                }}
            >
                <strong style={{ color: "var(--ink)" }}>Inherited from parent.</strong>{" "}
                {mode === "fork"
                    ? "Forks adopt the parent's royalty terms by contract — protects the original creator's economics from being unilaterally rewritten downstream."
                    : "Composed agents adopt the first parent's schema. Schema becomes immutable per lineage once minted."}
            </div>
        </Field>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid var(--rule)",
    background: "var(--bg)",
    fontFamily: "var(--body)",
    fontSize: 14,
    color: "var(--ink)",
    borderRadius: 4,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label
                style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginBottom: 8,
                }}
            >
                {label}
            </label>
            {children}
        </div>
    );
}

/* ─────────────── Step 4: minting ─────────────── */

function Step4({
    txHash,
    isPending,
    isConfirming,
    isSuccess,
}: {
    txHash?: `0x${string}`;
    isPending: boolean;
    isConfirming: boolean;
    isSuccess: boolean;
}) {
    return (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
            {isSuccess ? (
                <>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                        <Bloom kind="genesis" seed="success" size={140} sw={1.6} />
                    </div>
                    <h2 style={{ fontSize: 36, marginBottom: 12 }}>
                        Bloomed. <em>Welcome to the garden.</em>
                    </h2>
                    {txHash && (
                        <p>
                            <Link
                                href={explorerLink(txHash, "tx")}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 13,
                                    color: "var(--ink)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    textDecoration: "underline",
                                    textDecorationColor: "var(--rule)",
                                }}
                            >
                                View tx <ExternalLink size={12} />
                            </Link>
                        </p>
                    )}
                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            justifyContent: "center",
                            marginTop: 28,
                            flexWrap: "wrap",
                        }}
                    >
                        <Link href="/explorer" className="btn">
                            See it in the garden →
                        </Link>
                        <Link href="/dashboard" className="btn btn--ghost">
                            My garden bed
                        </Link>
                    </div>
                </>
            ) : (
                <>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                        <div
                            style={{
                                animation: "gentle-rotate 4s linear infinite",
                                transformOrigin: "center",
                            }}
                        >
                            <Bloom kind="opening" seed="minting" size={140} sw={1.6} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: 36, marginBottom: 12 }}>
                        {isPending
                            ? "Confirming on chain…"
                            : isConfirming
                              ? "Mining the bloom…"
                              : "Plant the seed?"}
                    </h2>
                    <p style={{ color: "var(--ink-soft)", maxWidth: "60ch", margin: "0 auto" }}>
                        Sign the transaction in your wallet to register the new bloom on 0G
                        Galileo. Royalty obligations and lineage are recorded atomically.
                    </p>
                    {(isPending || isConfirming) && (
                        <div style={{ marginTop: 24 }}>
                            <Loader2
                                className="animate-spin"
                                size={28}
                                color="var(--gold-deep)"
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ─────────────── Royalty bars ─────────────── */

function RoyaltyBars({ royalty }: { royalty?: RoyaltyConfig }) {
    const cfg = royalty ?? DEFAULT_ROYALTY;
    const rows = [
        { label: "Direct owner", pct: cfg.directOwnerPct, color: "var(--gold)" },
        { label: "Generation 1", pct: cfg.gen1Pct, color: "var(--pink)" },
        { label: "Generation 2", pct: cfg.gen2Pct, color: "var(--coral)" },
        { label: "Generation 3+", pct: cfg.gen3PlusPct, color: "var(--forest)" },
        { label: "Training data", pct: cfg.trainingPct, color: "var(--ink-soft)" },
    ];
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => (
                <div key={r.label}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            color: "var(--ink-soft)",
                            marginBottom: 3,
                        }}
                    >
                        <span>{r.label}</span>
                        <span
                            style={{
                                fontFamily: "var(--mono)",
                                color: "var(--ink)",
                            }}
                        >
                            {r.pct}%
                        </span>
                    </div>
                    <div
                        style={{
                            height: 6,
                            background: "var(--bg)",
                            borderRadius: 999,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: `${r.pct}%`,
                                height: "100%",
                                background: r.color,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
