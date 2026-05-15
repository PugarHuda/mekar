"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    useAccount,
    useChainId,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from "wagmi";
import { keccak256, toHex } from "viem";
import { toast } from "sonner";
import { Bloom } from "@/components/Bloom";
import { useLineageData } from "@/hooks/useLineageData";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { AGENT_INFT_ABI } from "@/contracts/abis";
import { ACTIVE_CHAIN, explorerLink } from "@/lib/chains";
import {
    uploadToZGStorage,
    uploadChunkedToZGStorage,
    type StorageUploadResult,
    type UploadProgress,
} from "@/lib/storage";
import {
    agentName,
    agentFocus,
    kindFromParents,
    CATEGORY_LABELS,
    type AgentCategory,
} from "@/lib/agentNaming";
import { saveAgentMetadata, META_LIMITS } from "@/lib/agentMetadata";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
    // Acknowledgment that the user is OK minting with a deterministic stub
    // pointer instead of a real 0G Storage anchor. Required to clear Step 2
    // when no upload happened — fixes the previous "Next button works on
    // an empty Step 2" complaint.
    const [skipUploadAck, setSkipUploadAck] = useState(false);

    // Tunable royalty schema (Genesis only — forks + composes inherit).
    const [royalty, setRoyalty] = useState<RoyaltyConfig>(DEFAULT_ROYALTY);
    const royaltySum = royaltyConfigSum(royalty);
    const royaltyValid = royaltyConfigValid(royalty);

    // Capability categories the user picks at mint (multi-select). Stored in
    // localStorage on success keyed by the next tokenId so display surfaces
    // (explorer, dashboard, agent detail) can show "this agent is for code +
    // math" instead of guessing from the random focus pool. Multi was chosen
    // over single because real models routinely span 2-3 capabilities (e.g.
    // "code + math hybrid"); single-pick collapses that nuance.
    const [categories, setCategories] = useState<AgentCategory[]>(["general"]);
    // First category is treated as the "primary" — drives the deterministic
    // name pool + focus phrase. Keeping it as a derived var avoids two
    // sources of truth.
    const category = categories[0] ?? "general";

    const { address } = useAccount();
    const currentChainId = useChainId();
    const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
    // Match InferencePay's pre-flight chain check. A wrong-network mint is
    // particularly expensive UX-wise because the form has 3 steps before
    // the tx fires — losing all that state to a generic wallet error is
    // jarring. Block at submit, offer the network switch inline.
    const isWrongChain = !!address && currentChainId !== ACTIVE_CHAIN.id;
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
            categories: categories.length > 0 ? categories : undefined,
            description: description || undefined,
            license,
        });

        refetchLineage().catch(() => {
            /* silent — pickers will still update on next natural refetch */
        });
    }, [isSuccess, refetchLineage, totalAgents, name, category, categories, description, license]);

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
        // Mirror the AgentINFT.MAX_PARENTS = 8 contract bound. Catching it
        // here gives a friendly toast instead of a generic on-chain revert.
        if (parentIds.length > 8)
            return toast.error("Compose supports max 8 parents (contract limit)");
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

    /**
     * Per-step gate. Returns `null` if the user may advance from `s`,
     * otherwise a short reason string suitable for both a disabled-button
     * tooltip and an inline helper message.
     *
     * The previous "Next →" button was unconditional — users could fly
     * through every step with empty fields and only hit the mint tx
     * revert at the end. That left the storage upload and the mint
     * funnel feeling untrustworthy, especially because picking 0 parents
     * for a fork would silently fall back to genesis behaviour on chain.
     */
    function gateForStep(s: number): string | null {
        if (s === 1) {
            if (mode === "fork" && parentId == null) {
                return "Pick the parent bloom to fork from.";
            }
            if (mode === "compose" && parentIds.length < 2) {
                return "Pick at least 2 parents to compose.";
            }
            return null;
        }
        if (s === 2) {
            // Either the user uploaded a real anchor, or they explicitly
            // checked the "use stub pointer (demo)" box. Without one of those
            // we'd be silently minting an INFT whose weightsPointer is a
            // keccak256 of nothing — confusing for everyone downstream.
            if (!storageUpload && !skipUploadAck) {
                return "Upload weights to 0G Storage, or tick the acknowledgment to mint with a stub pointer.";
            }
            return null;
        }
        if (s === 3) {
            if (name.trim().length < 3) return "Name needs at least 3 characters.";
            if (categories.length === 0) return "Pick at least one capability tag.";
            if (mode === "genesis" && !royaltyValid) {
                return `Royalty must sum to 100% (current: ${royaltySum}%).`;
            }
            return null;
        }
        return null;
    }

    const step1Gate = gateForStep(1);
    const step2Gate = gateForStep(2);
    const step3Gate = gateForStep(3);
    const currentGate =
        step === 1 ? step1Gate : step === 2 ? step2Gate : step === 3 ? step3Gate : null;

    function handleMint() {
        // Final guard — even if the user somehow bypasses the disabled
        // button (extension, paste-and-click), refuse to fire writeContract
        // with empty/invalid state.
        const finalGate = gateForStep(3);
        if (finalGate) {
            toast.error(finalGate);
            return;
        }
        setStep(4);
        if (mode === "genesis") handleMintGenesis();
        else if (mode === "fork") handleMintFork();
        else handleMintCompose();
    }

    return (
        <div>
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

                    {/* Wallet gate — every step here writes either to chain
                        (mint tx) or to 0G Storage (paid by the deployer
                        wallet on the user's behalf). Both require a
                        signed identity, and uploading without a wallet
                        also burns deployer $0G for an anchor the user
                        can't claim. Gate the whole flow up-front. */}
                    {!address ? (
                        <div
                            style={{
                                marginBottom: 48,
                                padding: "32px 28px",
                                border: "1.5px solid var(--cocoa)",
                                background: "var(--bg-alt)",
                                borderRadius: "var(--radius)",
                                textAlign: "center",
                            }}
                        >
                            <h2
                                style={{
                                    fontFamily: "var(--display)",
                                    fontStyle: "italic",
                                    fontSize: 32,
                                    marginBottom: 12,
                                }}
                            >
                                Connect a wallet to mint.
                            </h2>
                            <p
                                style={{
                                    color: "var(--ink-soft)",
                                    marginBottom: 20,
                                    maxWidth: "52ch",
                                    margin: "0 auto 20px",
                                }}
                            >
                                Minting an INFT writes to the AgentINFT contract on 0G
                                Galileo, and uploading weights anchors a tx on 0G Storage.
                                Both need a signing wallet — connect from the header to
                                begin.
                            </p>
                            <p
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 12,
                                    color: "var(--ink-soft)",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                Use the &ldquo;Connect&rdquo; button in the top-right of the
                                page header.
                            </p>
                        </div>
                    ) : null}

                    {/* Everything below is gated on a connected wallet —
                        the stepper, step bodies, preview aside, all of it.
                        Closes near the </main> wrap. */}
                    {address && <>
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
                        className="mint-grid"
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
                                    skipUploadAck={skipUploadAck}
                                    setSkipUploadAck={setSkipUploadAck}
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
                                    categories={categories}
                                    setCategories={setCategories}
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
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-end",
                                            gap: 6,
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (currentGate) {
                                                    toast.error(currentGate);
                                                    return;
                                                }
                                                setStep((s) => s + 1);
                                            }}
                                            className="btn"
                                            disabled={!!currentGate}
                                            title={currentGate ?? undefined}
                                            style={{ opacity: currentGate ? 0.5 : 1 }}
                                        >
                                            Next →
                                        </button>
                                        {currentGate && (
                                            <div
                                                style={{
                                                    fontFamily: "var(--mono)",
                                                    fontSize: 11,
                                                    color: "var(--rose, #c25a4a)",
                                                    maxWidth: 320,
                                                    textAlign: "right",
                                                }}
                                            >
                                                {currentGate}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {step === 3 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-end",
                                            gap: 6,
                                        }}
                                    >
                                        {isWrongChain ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    switchChain({ chainId: ACTIVE_CHAIN.id })
                                                }
                                                disabled={isSwitchingChain}
                                                className="btn"
                                                style={{
                                                    background: "var(--coral, #f5b7a0)",
                                                    color: "var(--cocoa)",
                                                    borderColor: "var(--cocoa)",
                                                }}
                                            >
                                                {isSwitchingChain
                                                    ? "Switching…"
                                                    : `Switch to ${ACTIVE_CHAIN.name}`}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleMint}
                                                disabled={
                                                    !address ||
                                                    !isDeployed ||
                                                    isPending ||
                                                    !!step3Gate
                                                }
                                                className="btn"
                                                title={
                                                    !address
                                                        ? "Connect a wallet first"
                                                        : step3Gate ?? undefined
                                                }
                                            >
                                                {isPending
                                                    ? "Confirming…"
                                                    : step3Gate &&
                                                        mode === "genesis" &&
                                                        !royaltyValid
                                                      ? `Royalty ${royaltySum}% / 100%`
                                                      : "Mint bloom →"}
                                            </button>
                                        )}
                                        {(step3Gate || !address || isWrongChain) && (
                                            <div
                                                style={{
                                                    fontFamily: "var(--mono)",
                                                    fontSize: 11,
                                                    color: "var(--rose, #c25a4a)",
                                                    maxWidth: 320,
                                                    textAlign: "right",
                                                }}
                                            >
                                                {!address
                                                    ? "Connect a wallet first."
                                                    : isWrongChain
                                                      ? `Currently on chain ${currentChainId} — Mekar lives on ${ACTIVE_CHAIN.name} (${ACTIVE_CHAIN.id}).`
                                                      : step3Gate}
                                            </div>
                                        )}
                                    </div>
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
                    </>}
                </div>
            </main>
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
                        Pick parents to merge (2–8)
                    </div>
                    {nodes.length < 2 ? (
                        <p style={{ color: "var(--ink-soft)" }}>
                            Need at least 2 existing agents to compose.
                        </p>
                    ) : (
                        <>
                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    color: parentIds.length >= 8 ? "var(--rose)" : "var(--ink-soft)",
                                    marginBottom: 10,
                                }}
                            >
                                {parentIds.length} of 8 selected
                                {parentIds.length >= 8 && " — limit reached"}
                            </div>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                                    gap: 12,
                                }}
                            >
                                {nodes.map((n) => {
                                    const sel = parentIds.includes(n.id);
                                    const atLimit = !sel && parentIds.length >= 8;
                                    return (
                                        <div
                                            key={n.id}
                                            style={{
                                                opacity: atLimit ? 0.4 : 1,
                                                pointerEvents: atLimit ? "none" : "auto",
                                            }}
                                        >
                                            <ParentCard
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
                                        </div>
                                    );
                                })}
                            </div>
                        </>
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
    skipUploadAck,
    setSkipUploadAck,
}: {
    datasetNote: string;
    setDatasetNote: (v: string) => void;
    storageUpload: StorageUploadResult | null;
    setStorageUpload: (r: StorageUploadResult | null) => void;
    seed: string;
    skipUploadAck: boolean;
    setSkipUploadAck: (v: boolean) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [encrypt, setEncrypt] = useState(false);
    // Live wallet state — Step2 reads it directly so a mid-flow
    // disconnect immediately disables the upload button (instead of
    // relying solely on the parent's gate, which can lag a render).
    const { address: walletAddress, isConnected: walletConnected } = useAccount();
    // Track the "are you sure you want to overwrite the existing upload"
    // modal. Replaces the old window.confirm() which broke the studio
    // aesthetic + couldn't render a tidy multi-line body with the
    // current rootHash inline.
    const [reuploadConfirmOpen, setReuploadConfirmOpen] = useState(false);
    // Upload progress feed from storage.ts. Drives a determinate bar
    // (during the XHR upload phase) and a shifted indeterminate tick
    // (during the server-side 0G Storage anchoring phase).
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    // Seconds spent in the "anchoring" phase. The anchor step is
    // server-side (sign Flow tx + wait for storage nodes) and can be
    // genuinely slow on a congested testnet — a live counter tells
    // the user the request is alive, not frozen.
    const [anchorSecs, setAnchorSecs] = useState(0);
    // Validation result for the picked file. We surface this before upload
    // so users see "your JSON isn't a manifest" or "this is 0 bytes" before
    // burning a 0G Storage anchor transaction. `null` = no file or unchecked,
    // `kind:"ok"` = passed, `kind:"warn"` = unusual but allowed,
    // `kind:"err"` = blocked.
    type FileCheck = { kind: "ok" | "warn" | "err"; msg: string };
    const [fileCheck, setFileCheck] = useState<FileCheck | null>(null);

    /**
     * Inspects a freshly-picked file:
     *   - hard-blocks 0-byte files
     *   - hard-blocks files > 2 GB (browser upload sanity, not protocol)
     *   - if .json, tries to parse and check for `kind: "mekar-agent-manifest"`
     *   - otherwise accepts common weight formats with a friendly note
     * Warnings still allow advance, only "err" disables the upload button.
     */
    async function checkFile(f: File): Promise<FileCheck> {
        if (f.size === 0) {
            return { kind: "err", msg: "File is 0 bytes — pick a real file." };
        }
        if (f.size > 2 * 1024 * 1024 * 1024) {
            return {
                kind: "err",
                msg: "File > 2 GB. Upload via SDK directly for large weights; this UI is for manifests + small shards.",
            };
        }
        const ext = f.name.toLowerCase().split(".").pop() ?? "";
        const knownWeight = ["safetensors", "bin", "gguf", "pt", "ckpt", "tar", "zip"];
        if (ext === "json") {
            try {
                const text = await f.text();
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed === "object" && parsed.kind === "mekar-agent-manifest") {
                    return {
                        kind: "ok",
                        msg: `Valid Mekar manifest — model: ${parsed.model?.params ?? "?"} · ${parsed.weights?.length ?? 0} weight file(s)`,
                    };
                }
                return {
                    kind: "warn",
                    msg: "JSON parses but isn't a Mekar manifest (kind=\"mekar-agent-manifest\"). Will still upload, but readers may not know what to do with it.",
                };
            } catch {
                return { kind: "err", msg: "JSON file is malformed — fix syntax before upload." };
            }
        }
        if (knownWeight.includes(ext)) {
            return {
                kind: "ok",
                msg: `Recognised weight format (.${ext}) · ${(f.size / 1024 / 1024).toFixed(1)} MB`,
            };
        }
        return {
            kind: "warn",
            msg: `Unrecognised extension (.${ext || "(none)"}) — Mekar doesn't enforce file type, but consumers usually expect safetensors / bin / gguf / json. Continue if you know what you're doing.`,
        };
    }

    async function onPickFile(picked: File | null) {
        setFile(picked);
        setFileCheck(null);
        if (!picked) return;
        const result = await checkFile(picked);
        setFileCheck(result);
        if (result.kind === "err") {
            toast.error(result.msg);
        } else if (result.kind === "warn") {
            toast.message("Upload check", { description: result.msg });
        }
    }

    // Load a realistic sample manifest from /public/sample-weights/.
    // Lets users test the full upload flow without needing their own model
    // file, while showing what a production manifest actually looks like
    // (model config, weight file shards, training data merkle, eval scores).
    async function loadSample(name: "jasmine" | "genesis") {
        const url =
            name === "jasmine"
                ? "/sample-weights/jasmine-7b-manifest.json"
                : "/sample-weights/genesis-base-manifest.json";
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const fname =
                name === "jasmine"
                    ? "jasmine-7b-manifest.json"
                    : "genesis-base-manifest.json";
            setFile(new File([blob], fname, { type: "application/json" }));
            toast.success(`Loaded sample ${name === "jasmine" ? "Jasmine-7B" : "Lotus-Base-3B"} manifest`);
        } catch {
            toast.error("Could not load sample manifest");
        }
    }

    // Tick a 1s counter while the upload is in the "anchoring" phase so
    // the user sees the request is alive. Reset when anchoring ends.
    useEffect(() => {
        if (progress?.phase !== "anchoring") {
            setAnchorSecs(0);
            return;
        }
        const started = Date.now();
        const id = setInterval(() => {
            setAnchorSecs(Math.floor((Date.now() - started) / 1000));
        }, 1_000);
        return () => clearInterval(id);
    }, [progress?.phase]);

    async function handleUpload() {
        // Re-upload requires explicit confirmation via the custom modal.
        // Spawning the dialog and bailing out lets the actual upload kick
        // off only when the user confirms (see doUpload below).
        if (storageUpload) {
            setReuploadConfirmOpen(true);
            return;
        }
        await doUpload();
    }

    async function doUpload() {
        // Defense in depth — the button is already disabled without a
        // wallet / file, but a stray call (extension, double-click race,
        // devtools) must still bail. Uploading without a wallet burns
        // deployer $0G for an anchor nobody can claim.
        if (!walletConnected || !walletAddress) {
            toast.error("Connect a wallet before uploading");
            return;
        }
        if (!file) {
            toast.error("Pick a weights file or sample manifest first");
            return;
        }
        setReuploadConfirmOpen(false);
        setUploadError(null);
        setUploading(true);
        setProgress({ fraction: 0, loaded: 0, total: 0, phase: "encoding" });
        try {
            // Files larger than a single ~32 MB chunk can't go through the
            // single-shot upload — the server caps the request body at
            // 50 MB (base64-inflated). Route big files through the chunked
            // path so a real weight shard doesn't just hard-fail. Chunked
            // anchors each piece + a manifest; the manifest rootHash is
            // what we treat as the on-chain weightsPointer.
            const SINGLE_UPLOAD_LIMIT = 32 * 1024 * 1024;
            let result: StorageUploadResult;
            if (file.size > SINGLE_UPLOAD_LIMIT) {
                // Encrypt-then-chunk: the whole file is AES-256-GCM
                // encrypted up-front, then the ciphertext is split.
                const chunked = await uploadChunkedToZGStorage(
                    file,
                    `mekar-mint-${seed}`,
                    (p) => setProgress(p),
                    encrypt ? "aes256" : "none"
                );
                // Normalise the chunked result into the single-upload
                // shape the rest of the flow expects. The manifest
                // rootHash is the single on-chain pointer; key + IV
                // (when encrypted) flow through so the UI shows them.
                result = {
                    rootHash: chunked.manifestRootHash,
                    storagePointer: chunked.manifestRootHash,
                    txHash: chunked.manifestTxHash,
                    size: chunked.totalBytes,
                    encryption: chunked.encryption,
                    ...(chunked.aesKey ? { aesKey: chunked.aesKey } : {}),
                    ...(chunked.aesIv ? { aesIv: chunked.aesIv } : {}),
                };
                setStorageUpload(result);
                toast.success(
                    `${chunked.encryption === "aes256-gcm-client" ? "Encrypted + anchored" : "Anchored"} to 0G Storage in ${chunked.chunkCount} chunks`
                );
            } else {
                // A real file is required (enforced above) — we always
                // upload actual bytes the user chose, never a stub.
                result = await uploadToZGStorage(
                    file,
                    `mekar-mint-${seed}`,
                    encrypt ? "aes256" : "none",
                    (p) => setProgress(p)
                );
                setStorageUpload(result);
                toast.success(
                    encrypt
                        ? "Encrypted + anchored to 0G Storage — save the AES key!"
                        : "Anchored to 0G Storage"
                );
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setUploadError(msg);
            toast.error(msg.slice(0, 200));
        } finally {
            setUploading(false);
            setProgress(null);
        }
    }

    return (
        <div>
            <h2 style={{ fontSize: 32, marginBottom: 8 }}>
                Pin the <em>weights.</em>
            </h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>
                Upload your model weights (or a manifest if weights live elsewhere) to 0G Storage.
                The returned root hash anchors as your INFT&apos;s <code>weightsPointer</code>{" "}
                on chain. Skip this step and we&apos;ll mint with a deterministic stub instead.
            </p>

            {/* Ownership clarification — answers "kalau aku upload, itu punya siapa?".
                Common confusion: people think the upload itself binds ownership.
                On 0G Storage the rootHash is anonymous + public; the INFT is the
                thing that asserts "this rootHash is mine" via on-chain mint. */}
            <div
                style={{
                    padding: "12px 14px",
                    border: "1px solid var(--rule)",
                    background: "var(--bg-alt)",
                    borderRadius: 6,
                    marginBottom: 28,
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    lineHeight: 1.55,
                    fontFamily: "var(--mono)",
                }}
            >
                <div
                    style={{
                        fontSize: 10.5,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--cocoa)",
                        marginBottom: 6,
                        fontWeight: 600,
                    }}
                >
                    Who owns what
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>
                        <strong>INFT ownership</strong> = wallet that signs the mint tx in
                        Step 3. That is the on-chain Steward.
                    </li>
                    <li>
                        <strong>0G Storage rootHash</strong> is anonymous + globally
                        readable. Anyone with the hash can fetch the bytes.
                    </li>
                    <li>
                        <strong>Encryption</strong> (toggle below) gates the bytes behind
                        an AES-256 key. Only key-holders can decrypt — protect the key.
                    </li>
                    <li>
                        Re-upload replaces the on-chain pointer; the previous data stays
                        on storage but becomes orphaned.
                    </li>
                </ul>
            </div>

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
                    accept=".safetensors,.bin,.gguf,.pt,.ckpt,.tar,.zip,.json"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
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
                        ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB · ${file.type || "unknown type"}`
                        : "No file picked — pick one, load a sample, or tick “Skip upload” below to mint with a stub pointer."}
                </p>
                {/* Inline file check result. Colour mirrors validation level so
                    users see at a glance whether their file passed sanity. */}
                {fileCheck && (
                    <div
                        style={{
                            marginTop: 8,
                            padding: "8px 12px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: "var(--mono)",
                            background:
                                fileCheck.kind === "err"
                                    ? "rgba(194, 90, 74, 0.08)"
                                    : fileCheck.kind === "warn"
                                      ? "rgba(212, 164, 55, 0.12)"
                                      : "rgba(76, 138, 122, 0.10)",
                            border:
                                fileCheck.kind === "err"
                                    ? "1px solid rgba(194, 90, 74, 0.45)"
                                    : fileCheck.kind === "warn"
                                      ? "1px solid rgba(212, 164, 55, 0.5)"
                                      : "1px solid rgba(76, 138, 122, 0.45)",
                            color:
                                fileCheck.kind === "err"
                                    ? "#c25a4a"
                                    : fileCheck.kind === "warn"
                                      ? "#8a6d1a"
                                      : "var(--tea, #2e6856)",
                        }}
                    >
                        {fileCheck.kind === "err" ? "✗ " : fileCheck.kind === "warn" ? "⚠ " : "✓ "}
                        {fileCheck.msg}
                    </div>
                )}
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                        flexWrap: "wrap",
                    }}
                >
                    <span
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            color: "var(--ink-soft)",
                            alignSelf: "center",
                        }}
                    >
                        or load sample:
                    </span>
                    <button
                        type="button"
                        onClick={() => loadSample("genesis")}
                        className="pill"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                    >
                        Lotus-Base-3B (Genesis)
                    </button>
                    <button
                        type="button"
                        onClick={() => loadSample("jasmine")}
                        className="pill"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                    >
                        Jasmine-7B (Fork)
                    </button>
                </div>
            </Field>

            <Field label="Encryption">
                <label
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        border: "1px solid var(--rule)",
                        borderRadius: 4,
                        cursor: "pointer",
                        background: encrypt ? "var(--gold)" : "var(--bg)",
                        color: encrypt ? "var(--cocoa)" : "var(--ink)",
                        fontSize: 13,
                    }}
                >
                    <input
                        type="checkbox"
                        checked={encrypt}
                        onChange={(e) => setEncrypt(e.target.checked)}
                        style={{ accentColor: "var(--cocoa)" }}
                    />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                        Encrypt with AES-256 via 0G SDK before upload
                    </span>
                </label>
                <p
                    style={{
                        fontSize: 11,
                        color: "var(--ink-soft)",
                        marginTop: 6,
                        fontFamily: "var(--mono)",
                    }}
                >
                    {encrypt
                        ? "Server generates a fresh AES-256 key, SDK encrypts client-side before chunks reach storage nodes. Key returned with the rootHash — save it, only key-holders can decrypt the weights later."
                        : "Plaintext upload to the Log tier — anyone with the rootHash can read."}
                </p>
            </Field>

            {(() => {
                // Upload is only allowed when ALL of these hold:
                //   - a wallet is connected (it pays nothing here, but the
                //     mint that follows needs it, and we don't want a
                //     wallet-less visitor burning deployer storage gas)
                //   - a real file is picked (no synthesised stub uploads)
                //   - the file passed the sanity check
                const noWallet = !walletConnected || !walletAddress;
                const noFile = !file;
                const badFile = fileCheck?.kind === "err";
                const blockedReason = noWallet
                    ? "Connect a wallet first."
                    : noFile
                      ? "Pick a weights file or load a sample manifest first."
                      : badFile
                        ? "File didn't pass the sanity check — fix or pick another."
                        : null;
                const disabled = uploading || !!blockedReason;
                return (
                    <div style={{ marginBottom: 12 }}>
                        <button
                            type="button"
                            onClick={handleUpload}
                            disabled={disabled}
                            className="btn"
                            style={{ opacity: blockedReason ? 0.5 : 1 }}
                            title={blockedReason ?? undefined}
                        >
                            {uploading ? (
                                <>
                                    <Loader2
                                        className="animate-spin"
                                        size={14}
                                        style={{ marginRight: 6 }}
                                    />
                                    {progress?.phase === "encoding"
                                        ? "Encoding…"
                                        : progress?.phase === "anchoring"
                                          ? "Anchoring on 0G…"
                                          : "Uploading to 0G Storage…"}
                                </>
                            ) : storageUpload ? (
                                "Re-upload"
                            ) : encrypt ? (
                                "Encrypt + upload to 0G Storage"
                            ) : (
                                "Upload to 0G Storage"
                            )}
                        </button>
                        {blockedReason && !uploading && (
                            <div
                                style={{
                                    marginTop: 6,
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    color: "var(--rose, #c25a4a)",
                                }}
                            >
                                {blockedReason}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Progress bar — only renders while uploading. The XHR upload
                feed gives us real percent; once the bar hits 100% we keep
                it filled and swap the caption to "Anchoring…" so users
                understand the gap between upload completion and the
                resolved JSON response (server is talking to 0G Storage). */}
            {uploading && progress && (
                <div style={{ marginBottom: 20 }}>
                    <div
                        style={{
                            position: "relative",
                            height: 6,
                            background: "var(--bg-alt)",
                            border: "1px solid var(--rule)",
                            borderRadius: 999,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: `${Math.max(2, progress.fraction * 100)}%`,
                                background:
                                    progress.phase === "anchoring"
                                        ? "var(--gold)"
                                        : "var(--cocoa)",
                                transition: "width 220ms ease",
                            }}
                        />
                    </div>
                    <div
                        style={{
                            marginTop: 6,
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            color: "var(--ink-soft)",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                        }}
                    >
                        <span>
                            {progress.phase === "encoding"
                                ? "Encoding payload…"
                                : progress.phase === "anchoring"
                                  ? `0G Storage nodes pinning chunks… ${anchorSecs}s`
                                  : `${(progress.fraction * 100).toFixed(0)}% uploaded`}
                        </span>
                        {progress.total > 0 && (
                            <span>
                                {(progress.loaded / 1024).toFixed(0)} /{" "}
                                {(progress.total / 1024).toFixed(0)} KB
                            </span>
                        )}
                    </div>
                    {/* Reassurance once the anchor runs long. The Flow tx +
                        storage-node pinning is genuinely slow on a busy
                        Galileo testnet — without this the user assumes a
                        freeze and reloads, losing the in-flight upload. */}
                    {progress.phase === "anchoring" && anchorSecs >= 25 && (
                        <div
                            style={{
                                marginTop: 8,
                                padding: "8px 12px",
                                background: "rgba(212,164,55,0.12)",
                                border: "1px solid var(--gold-deep, #b9882c)",
                                borderRadius: 4,
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                color: "var(--ink-soft)",
                                lineHeight: 1.5,
                            }}
                        >
                            Still anchoring — 0G Galileo testnet is congested right now.
                            This can take up to a couple of minutes. Don&apos;t reload;
                            the upload is still alive. If you just want to test the mint
                            flow, cancel and tick &ldquo;Skip upload&rdquo; below instead.
                        </div>
                    )}
                </div>
            )}

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
                    {storageUpload.aesKey && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: "12px 14px",
                                background: "rgba(212,164,55,0.12)",
                                border: "1.5px solid var(--gold-deep, #b9882c)",
                                borderRadius: 4,
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 10.5,
                                    letterSpacing: "0.14em",
                                    textTransform: "uppercase",
                                    color: "var(--cocoa)",
                                    marginBottom: 4,
                                    fontWeight: 600,
                                }}
                            >
                                {storageUpload.encryption === "aes256-gcm-client"
                                    ? "⚠ AES-256-GCM key (client-side) — only your browser ever held this"
                                    : "⚠ AES-256 key — save this, only way to decrypt"}
                            </div>
                            <code
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    color: "var(--ink)",
                                    wordBreak: "break-all",
                                    display: "block",
                                    background: "var(--surface)",
                                    padding: "6px 8px",
                                    borderRadius: 3,
                                }}
                                onClick={(e) => {
                                    const range = document.createRange();
                                    range.selectNodeContents(e.currentTarget);
                                    const sel = window.getSelection();
                                    sel?.removeAllRanges();
                                    sel?.addRange(range);
                                }}
                            >
                                key: {storageUpload.aesKey}
                            </code>
                            {storageUpload.aesIv && (
                                <code
                                    style={{
                                        fontFamily: "var(--mono)",
                                        fontSize: 11,
                                        color: "var(--ink)",
                                        wordBreak: "break-all",
                                        display: "block",
                                        background: "var(--surface)",
                                        padding: "6px 8px",
                                        borderRadius: 3,
                                        marginTop: 4,
                                    }}
                                >
                                    iv: {storageUpload.aesIv}
                                </code>
                            )}
                            <p
                                style={{
                                    fontSize: 10.5,
                                    color: "var(--ink-soft)",
                                    marginTop: 6,
                                    fontFamily: "var(--mono)",
                                    lineHeight: 1.5,
                                }}
                            >
                                {storageUpload.encryption === "aes256-gcm-client"
                                    ? "Client-side encryption: bytes were AES-256-GCM encrypted in your browser before reaching the server. Save the key + IV — they're the only path back to plaintext."
                                    : "Click the key to select it. Production swaps this for an INFT-bound re-encryption oracle so the key transfers with the token."}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Skip acknowledgment — only shown when no successful upload yet.
                Forces the user to make an explicit decision before Step 2's
                gate clears: either upload, or tick the box to mint with a
                deterministic stub pointer. Silently advancing on empty Step 2
                is what produced the "kosong masih bisa next" confusion. */}
            {!storageUpload && (
                <div
                    style={{
                        marginTop: 24,
                        padding: "14px 16px",
                        border: "1.5px dashed var(--rule)",
                        background: "var(--bg-alt)",
                        borderRadius: 6,
                    }}
                >
                    <label
                        style={{
                            display: "flex",
                            gap: 10,
                            cursor: "pointer",
                            alignItems: "flex-start",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={skipUploadAck}
                            onChange={(e) => setSkipUploadAck(e.target.checked)}
                            style={{ marginTop: 4, accentColor: "var(--cocoa)" }}
                        />
                        <span>
                            <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                                Skip upload — mint with a stub weightsPointer (demo only)
                            </span>
                            <span
                                style={{
                                    display: "block",
                                    marginTop: 4,
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    color: "var(--ink-soft)",
                                    lineHeight: 1.55,
                                }}
                            >
                                I understand the on-chain <code>weightsPointer</code> will be a
                                deterministic keccak256 of the seed, NOT a real 0G Storage
                                rootHash. No actual model bytes will be retrievable. Use only
                                for demo / testing mint flow.
                            </span>
                        </span>
                    </label>
                </div>
            )}

            {/* Re-upload confirmation modal. Replaces window.confirm so the
                rootHash + orphan caveat are legible in the woodcut palette. */}
            <ConfirmDialog
                open={reuploadConfirmOpen}
                title="Replace the existing upload?"
                tone="danger"
                confirmLabel="Replace upload"
                onCancel={() => setReuploadConfirmOpen(false)}
                onConfirm={() => {
                    void doUpload();
                }}
                body={
                    <>
                        <div style={{ marginBottom: 8, color: "var(--ink)" }}>Current rootHash:</div>
                        <div
                            style={{
                                background: "var(--surface)",
                                border: "1px solid var(--rule)",
                                borderRadius: 3,
                                padding: "6px 8px",
                                marginBottom: 12,
                                wordBreak: "break-all",
                                color: "var(--ink)",
                            }}
                        >
                            {storageUpload?.rootHash}
                        </div>
                        <div>
                            The previous data stays on 0G Storage but stops being the on-chain
                            pointer. Encrypted uploads also generate a fresh AES key — the old
                            one becomes useless.
                        </div>
                    </>
                }
            />
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
    categories,
    setCategories,
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
    categories: AgentCategory[];
    setCategories: (c: AgentCategory[]) => void;
}) {
    const licenses = [
        "MIT",
        "Apache-2.0",
        "CC-BY",
        "CC-BY-SA",
        "CC0",
        "Mekar-Commercial",
    ];
    const allCategories: AgentCategory[] = [
        "translate",
        "code",
        "math",
        "vision",
        "retrieval",
        "reasoning",
        "general",
    ];

    // Multi-toggle helper. Empty array isn't allowed — at least one
    // category must remain selected so explorer filters always have
    // something to bucket the agent under.
    function toggleCategory(c: AgentCategory) {
        if (categories.includes(c)) {
            if (categories.length === 1) return; // keep at least one
            setCategories(categories.filter((x) => x !== c));
        } else {
            setCategories([...categories, c]);
        }
    }
    return (
        <div>
            <h2 style={{ fontSize: 32, marginBottom: 8 }}>
                Name &amp; <em>license.</em>
            </h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
                A bloom needs a name to be remembered. License terms are public and inform
                downstream forks.
            </p>

            <Field label={`Bloom name (max ${META_LIMITS.name} chars)`}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, META_LIMITS.name))}
                    maxLength={META_LIMITS.name}
                    placeholder="e.g. Jasmine-Indo-7B"
                    style={inputStyle}
                />
            </Field>

            <Field label="Capabilities (pick one or more — describes what this agent does)">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {allCategories.map((c) => {
                        const active = categories.includes(c);
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => toggleCategory(c)}
                                className={`pill ${active ? "active" : ""}`}
                                style={{ textTransform: "none" }}
                                aria-pressed={active}
                            >
                                {active ? "✓ " : ""}
                                {CATEGORY_LABELS[c]}
                            </button>
                        );
                    })}
                </div>
                <p
                    style={{
                        fontSize: 11,
                        color: "var(--ink-soft)",
                        marginTop: 6,
                        fontFamily: "var(--mono)",
                    }}
                >
                    First pick becomes the primary tag (drives bloom name). Up to 7 tags —
                    explorer filters and badges show all of them. At least one is required.
                </p>
            </Field>

            <Field label={`Description (max ${META_LIMITS.description} chars)`}>
                <textarea
                    value={description}
                    onChange={(e) =>
                        setDescription(e.target.value.slice(0, META_LIMITS.description))
                    }
                    maxLength={META_LIMITS.description}
                    rows={3}
                    placeholder="What does this agent do?"
                    style={{ ...inputStyle, resize: "vertical" }}
                />
                <p
                    style={{
                        fontSize: 11,
                        color: "var(--ink-soft)",
                        marginTop: 4,
                        fontFamily: "var(--mono)",
                        textAlign: "right",
                    }}
                >
                    {description.length} / {META_LIMITS.description}
                </p>
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
