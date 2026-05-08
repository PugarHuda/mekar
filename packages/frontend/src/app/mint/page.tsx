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
import { ExternalLink, Loader2 } from "lucide-react";

type Mode = "genesis" | "fork" | "compose";

const DEFAULT_SCHEMA = {
    directOwnerBps: 5_000,
    gen1Bps: 2_500,
    gen2Bps: 1_500,
    gen3PlusBps: 700,
    trainingDataBps: 300,
    maxGenerationsPaid: 10,
} as const;

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

    const { address } = useAccount();
    const { nodes } = useLineageData();

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

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
        const weightsPtr = resolveWeightsPointer("weights");
        const trainingMerkle = keccak256(toHex(`training:${datasetNote || seed}`));
        const teeProof = keccak256(toHex(`tee:${seed}`));

        writeContract(
            {
                address: CONTRACT_ADDRESSES.AgentINFT,
                abi: AGENT_INFT_ABI,
                functionName: "mintGenesis",
                args: [weightsPtr, trainingMerkle, teeProof, DEFAULT_SCHEMA, 1],
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
                                    name={name}
                                    setName={setName}
                                    description={description}
                                    setDescription={setDescription}
                                    license={license}
                                    setLicense={setLicense}
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
                                        disabled={!address || !isDeployed || isPending}
                                        className="btn"
                                    >
                                        {isPending ? "Confirming…" : "Mint bloom →"}
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
                            <p
                                style={{
                                    color: "var(--ink-soft)",
                                    fontSize: 13,
                                    marginTop: 6,
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
                            <RoyaltyBars />
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
                                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                gap: 8,
                            }}
                        >
                            {nodes.map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => setParentId(n.id)}
                                    style={{
                                        border:
                                            parentId === n.id
                                                ? "1.5px solid var(--cocoa)"
                                                : "1px solid var(--rule)",
                                        background:
                                            parentId === n.id ? "var(--gold)" : "var(--bg-alt)",
                                        padding: 12,
                                        borderRadius: 4,
                                        cursor: "pointer",
                                        color: parentId === n.id ? "var(--cocoa)" : "var(--ink)",
                                        textAlign: "left",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontFamily: "var(--mono)",
                                            fontWeight: 600,
                                            fontSize: 13,
                                        }}
                                    >
                                        #{n.id}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            opacity: 0.7,
                                        }}
                                    >
                                        gen {n.generation}
                                    </div>
                                </button>
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
                                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                gap: 8,
                            }}
                        >
                            {nodes.map((n) => {
                                const sel = parentIds.includes(n.id);
                                return (
                                    <button
                                        key={n.id}
                                        type="button"
                                        onClick={() =>
                                            setParentIds(
                                                sel
                                                    ? parentIds.filter((p) => p !== n.id)
                                                    : [...parentIds, n.id]
                                            )
                                        }
                                        style={{
                                            border: sel
                                                ? "1.5px solid var(--cocoa)"
                                                : "1px solid var(--rule)",
                                            background: sel
                                                ? "var(--pink)"
                                                : "var(--bg-alt)",
                                            padding: 12,
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            textAlign: "left",
                                            color: sel ? "var(--cocoa)" : "var(--ink)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily: "var(--mono)",
                                                fontWeight: 600,
                                                fontSize: 13,
                                            }}
                                        >
                                            #{n.id}
                                        </div>
                                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                                            gen {n.generation}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
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
    name,
    setName,
    description,
    setDescription,
    license,
    setLicense,
}: {
    name: string;
    setName: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    license: string;
    setLicense: (v: string) => void;
}) {
    const licenses = [
        "MIT",
        "Apache-2.0",
        "CC-BY",
        "CC-BY-SA",
        "CC0",
        "Mekar-Commercial",
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
        </div>
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

function RoyaltyBars() {
    const rows = [
        { label: "Direct owner", pct: 50, color: "var(--gold)" },
        { label: "Generation 1", pct: 25, color: "var(--pink)" },
        { label: "Generation 2", pct: 15, color: "var(--coral)" },
        { label: "Generation 3+", pct: 7, color: "var(--forest)" },
        { label: "Training data", pct: 3, color: "var(--ink-soft)" },
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
