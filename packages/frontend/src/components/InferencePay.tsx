"use client";

import { useEffect, useState } from "react";
import {
    useAccount,
    useChainId,
    useSwitchChain,
    useWriteContract,
    useWaitForTransactionReceipt,
    useReadContract,
    useBalance,
} from "wagmi";
import { keccak256, toHex, parseEventLogs } from "viem";
import { toast } from "sonner";
import Link from "next/link";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import { ROYALTY_VAULT_ABI } from "@/contracts/abis";
import { ACTIVE_CHAIN, explorerLink } from "@/lib/chains";
import { formatOG } from "@/lib/utils";
import { Loader2, ExternalLink } from "lucide-react";

type Props = {
    agentId: number;
    inferencePrice: bigint;
    /**
     * Optional callback fired once the `settleInference` receipt lands —
     * i.e. the moment royalty actually distributes. Parents pass
     * `useAgentInferenceHistory().refetch` so the settlement log table
     * updates without a page reload.
     */
    onSettled?: () => void;
    /**
     * Optional optimistic insert. Called when the SETTLE receipt arrives
     * (before the RPC scan picks up the RoyaltyPaid event) so the table
     * shows a pending row immediately. Parents typically pass
     * useAgentInferenceHistory().addOptimistic.
     */
    onOptimistic?: (row: {
        txHash: `0x${string}`;
        recipient: `0x${string}`;
        generation: number;
        amount: bigint;
        blockNumber: bigint;
    }) => void;
    /**
     * Capability-matched example prompt (see `agentSamplePrompt`). Pre-fills
     * the textarea so the demo prompt reflects what THIS agent does — a Code
     * agent shows a coding task, a Vision agent an image task. Falls back to
     * a generic greeting when the parent doesn't pass one.
     */
    samplePrompt?: string;
    /**
     * Whether this agent has on-chain ancestors (a fork or compose).
     * Genesis agents have none — so the royalty copy must NOT claim a
     * cascade "to ancestors": for a genesis, `settleInference` pays the
     * owner 50% and sweeps the unfilled tiers to the protocol treasury.
     */
    hasAncestors?: boolean;
};

const labelStyle: React.CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--ink-soft)",
};

/**
 * Inference is a TWO-STEP on-chain flow, and this component runs both:
 *
 *   1. `payInference(agentId)` — escrows the fee, emits `InferenceRequested`
 *      with a fresh `requestId`. Money is held, NOT yet distributed.
 *   2. `settleInference(requestId, …)` — walks the lineage and pays the
 *      royalty cascade (the `RoyaltyPaid` events). Guarded by
 *      `onlyRegisteredProvider`.
 *
 * If the connected wallet is a registered compute provider we fire step 2
 * automatically, so "Try it" completes the real cascade. If it is not, we
 * stop honestly at the escrow and point the user at provider registration —
 * we never claim "settled" for a payment that is only escrowed.
 */
export function InferencePay({
    agentId,
    inferencePrice,
    onSettled,
    onOptimistic,
    samplePrompt,
    hasAncestors = false,
}: Props) {
    const { address, isConnected } = useAccount();
    const currentChainId = useChainId();
    const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
    // Pre-empt failed tx by checking the wallet is on the right chain
    // BEFORE writeContract fires. Without this, RainbowKit shows a generic
    // error popup after gas estimation fails, which is much more confusing
    // than a clear "switch network" affordance.
    const isWrongChain = isConnected && currentChainId !== ACTIVE_CHAIN.id;
    // Pre-fill with the agent's capability-matched prompt. The parent keys
    // this component by agentId, so navigating to a different agent
    // remounts it and re-seeds the textarea with that agent's prompt.
    const [prompt, setPrompt] = useState(samplePrompt ?? "Hello, agent!");

    const { data: balance } = useBalance({ address });

    // Whether the connected wallet can SETTLE. `settleInference` is
    // `onlyRegisteredProvider`, so only a provider can fire the royalty
    // cascade. Non-providers can still pay (escrow) — they just can't settle.
    const { data: isProvider } = useReadContract({
        address: CONTRACT_ADDRESSES.RoyaltyVault,
        abi: ROYALTY_VAULT_ABI,
        functionName: "isRegisteredProvider",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Step 1 — payInference: escrows the fee, emits InferenceRequested.
    const { writeContract: writePay, data: payHash, isPending: payPending } =
        useWriteContract();
    const {
        data: payReceipt,
        isLoading: payConfirming,
        isSuccess: paySuccess,
    } = useWaitForTransactionReceipt({ hash: payHash });

    // Step 2 — settleInference: distributes the royalty cascade.
    const {
        writeContract: writeSettle,
        data: settleHash,
        isPending: settlePending,
        reset: resetSettle,
    } = useWriteContract();
    const { isLoading: settleConfirming, isSuccess: settleSuccess } =
        useWaitForTransactionReceipt({ hash: settleHash });

    // requestId is minted inside payInference and surfaced via the
    // InferenceRequested event — settleInference needs it as its handle.
    const [requestId, setRequestId] = useState<`0x${string}` | null>(null);
    const [settleStarted, setSettleStarted] = useState(false);

    // Once the pay receipt lands, dig the requestId out of its event logs.
    // A state-changing tx's return value is not readable from the client —
    // only its emitted events are — so the event IS the handle.
    useEffect(() => {
        if (!paySuccess || !payReceipt || requestId) return;
        try {
            const events = parseEventLogs({
                abi: ROYALTY_VAULT_ABI,
                eventName: "InferenceRequested",
                logs: payReceipt.logs,
            });
            const rid = (
                events[0]?.args as { requestId?: `0x${string}` } | undefined
            )?.requestId;
            if (rid) setRequestId(rid);
        } catch {
            // Malformed logs — leave requestId null. The escrow still exists
            // on chain and stays refundable via refundIfTimeout.
        }
    }, [paySuccess, payReceipt, requestId]);

    // Auto-fire step 2 the moment we have a requestId AND the wallet can
    // settle. A non-provider stops at the escrow — surfaced honestly below.
    useEffect(() => {
        if (!requestId || !isProvider || settleStarted) return;
        setSettleStarted(true);
        writeSettle(
            {
                address: CONTRACT_ADDRESSES.RoyaltyVault,
                abi: ROYALTY_VAULT_ABI,
                functionName: "settleInference",
                args: [
                    requestId,
                    // outputHash — keccak of the prompt. The contract MVP
                    // only checks this is non-zero; real TEE output hashing
                    // is Phase 2.
                    keccak256(toHex(prompt || "mekar-inference")),
                    // teeAttestation — non-empty stub. The contract MVP only
                    // checks length > 0; enclave-signature verification is
                    // Phase 2.
                    toHex("mekar-ui-demo-attestation"),
                ],
            },
            {
                onSuccess: () => toast.success("Settling royalty cascade…"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId, isProvider, settleStarted]);

    // Tell the parent to re-scan RoyaltyPaid logs once the SETTLE receipt
    // lands — that is the moment royalty actually distributes. We never
    // fire these for an escrow-only payment.
    useEffect(() => {
        if (!settleSuccess || !settleHash || !address) return;
        if (onOptimistic) {
            onOptimistic({
                txHash: settleHash,
                recipient: address,
                generation: 0,
                amount: inferencePrice / 2n,
                blockNumber: BigInt(Date.now()),
            });
        }
        if (onSettled) onSettled();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settleSuccess, settleHash, address]);

    function handlePay() {
        if (!address) {
            toast.error("Connect wallet first");
            return;
        }
        if (balance && balance.value < inferencePrice) {
            // On testnet point users at the faucet; on mainnet there's
            // no faucet — they need real $0G.
            toast.error(
                `Need ≥ ${formatOG(inferencePrice)} $0G` +
                    (ACTIVE_CHAIN.testnet ? ". Get test $0G from faucet.0g.ai." : ".")
            );
            return;
        }
        // Reset any prior run so a second "Try it" starts clean.
        setRequestId(null);
        setSettleStarted(false);
        resetSettle();
        writePay(
            {
                address: CONTRACT_ADDRESSES.RoyaltyVault,
                abi: ROYALTY_VAULT_ABI,
                functionName: "payInference",
                args: [BigInt(agentId)],
                value: inferencePrice,
            },
            {
                onSuccess: () => toast.success("Payment escrowed"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }

    const insufficientBalance = balance ? balance.value < inferencePrice : false;
    const busy = payPending || payConfirming || settlePending || settleConfirming;
    // Escrowed, but the cascade can't auto-fire because this wallet is not
    // a registered provider. Surfaced honestly — no "settled" claim.
    const escrowStuck = paySuccess && !settleHash && isProvider === false;

    function buttonLabel() {
        if (!isConnected) return "Connect a wallet";
        if (insufficientBalance) return "Insufficient balance";
        if (payPending) return "Confirm payment…";
        if (payConfirming) return "Escrowing payment…";
        if (settlePending) return "Confirm settlement…";
        if (settleConfirming) return "Settling cascade…";
        if (paySuccess && isProvider && !settleSuccess) return "Settling cascade…";
        return "Pay & run inference →";
    }

    return (
        <div
            style={{
                border: "1.5px solid var(--rule)",
                background: "var(--surface)",
                borderRadius: "var(--radius)",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 14,
            }}
        >
            <div>
                <span className="eyebrow">Pay &amp; run</span>
                <h3
                    style={{
                        fontFamily: "var(--display)",
                        fontStyle: "italic",
                        fontSize: 26,
                        margin: "6px 0 0",
                    }}
                >
                    Try this <em>bloom.</em>
                </h3>
            </div>

            {/* "Where does the AI run?" — recurring question. Mekar is the
                royalty rail, not a model host. The royalty cascade is real;
                the AI's generated answer is Phase 2. We say so up-front. */}
            <div
                style={{
                    padding: "11px 13px",
                    background: "var(--bg-alt)",
                    border: "1px solid var(--rule)",
                    borderRadius: 5,
                    fontFamily: "var(--mono)",
                    fontSize: 11.5,
                    color: "var(--ink-soft)",
                    lineHeight: 1.55,
                }}
            >
                <span
                    style={{
                        color: "var(--cocoa)",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                    }}
                >
                    Where does the AI run?
                </span>{" "}
                Mekar settles royalty on chain — that part is live. The actual
                model inference (the AI&apos;s answer) runs on{" "}
                <strong>0G Compute (TEE)</strong> when a provider serves this
                agent&apos;s <code>weightsPointer</code>; that response path is
                Phase 2. So &ldquo;Try it&rdquo; settles a real royalty cascade —
                it does not return a generated answer yet. See{" "}
                <a
                    href="/docs#status"
                    style={{ color: "var(--cocoa)", textDecoration: "underline" }}
                >
                    /docs § Live vs Phase 2
                </a>
                .
            </div>

            <div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 6,
                    }}
                >
                    <label style={labelStyle}>Prompt</label>
                    <span
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color: "var(--ink-soft)",
                            opacity: 0.7,
                        }}
                        title="The royalty cascade is real and settles on chain. The AI response itself is Phase 2 — wires up when 0G Compute providers ship the TEE inference path. See /docs."
                    >
                        UI demo · royalty real
                    </span>
                </div>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={2}
                    placeholder="Ask the agent something… (royalty cascades on chain even though the inference response is Phase 2)"
                    style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid var(--rule)",
                        background: "var(--bg)",
                        fontFamily: "var(--body)",
                        fontSize: 14,
                        color: "var(--ink)",
                        borderRadius: 4,
                        resize: "none",
                    }}
                />
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--ink)",
                }}
            >
                <span style={labelStyle}>Price</span>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>
                    {formatOG(inferencePrice, 6)} 0G
                </span>
            </div>

            {balance && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                    }}
                >
                    <span style={labelStyle}>Your balance</span>
                    <span
                        style={{
                            fontFamily: "var(--mono)",
                            color: insufficientBalance ? "var(--coral)" : "var(--ink-soft)",
                        }}
                    >
                        {formatOG(balance.value)} 0G
                    </span>
                </div>
            )}

            {isWrongChain ? (
                <button
                    type="button"
                    onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}
                    disabled={isSwitchingChain}
                    className="btn"
                    style={{
                        width: "100%",
                        justifyContent: "center",
                        background: "var(--coral, #f5b7a0)",
                        color: "var(--cocoa)",
                        borderColor: "var(--cocoa)",
                    }}
                >
                    {isSwitchingChain
                        ? "Switching…"
                        : `Switch to ${ACTIVE_CHAIN.name} to pay`}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={handlePay}
                    disabled={!isConnected || busy || insufficientBalance}
                    className="btn"
                    style={{
                        width: "100%",
                        justifyContent: "center",
                        opacity:
                            !isConnected || busy || insufficientBalance ? 0.55 : 1,
                        cursor:
                            !isConnected || busy || insufficientBalance
                                ? "not-allowed"
                                : "pointer",
                    }}
                >
                    {busy && (
                        <Loader2
                            className="animate-spin"
                            style={{ width: 14, height: 14, marginRight: 8 }}
                        />
                    )}
                    {buttonLabel()}
                </button>
            )}

            {(payHash || settleHash) && (
                <div
                    style={{
                        border: "1px solid var(--rule)",
                        background: settleSuccess ? "var(--gold)" : "var(--bg-alt)",
                        padding: "10px 12px",
                        fontSize: 12,
                        borderRadius: 4,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span
                            style={{
                                fontFamily: "var(--mono)",
                                color: settleSuccess
                                    ? "var(--cocoa)"
                                    : "var(--ink-soft)",
                            }}
                        >
                            {settleSuccess
                                ? "✓ Royalty cascade settled"
                                : escrowStuck
                                  ? "Payment escrowed — not distributed"
                                  : paySuccess
                                    ? "Escrowed ✓ — settling cascade…"
                                    : "Escrowing payment…"}
                        </span>
                        <Link
                            href={explorerLink(settleHash ?? payHash!, "tx")}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                color: "var(--ink)",
                                fontFamily: "var(--mono)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                textDecoration: "underline",
                                textDecorationColor: "var(--rule)",
                            }}
                        >
                            View tx <ExternalLink size={11} />
                        </Link>
                    </div>
                    {settleSuccess && (
                        <p style={{ color: "var(--ink-soft)", margin: 0 }}>
                            {hasAncestors ? (
                                <>
                                    Royalty cascaded up the lineage inside{" "}
                                    <code style={{ fontFamily: "var(--mono)" }}>
                                        settleInference
                                    </code>
                                    . Check the explorer for{" "}
                                    <code style={{ fontFamily: "var(--mono)" }}>
                                        RoyaltyPaid
                                    </code>{" "}
                                    events.
                                </>
                            ) : (
                                <>
                                    Settled inside{" "}
                                    <code style={{ fontFamily: "var(--mono)" }}>
                                        settleInference
                                    </code>
                                    : 50% to the owner, and — this being a genesis
                                    bloom with no ancestors — the remaining tiers
                                    swept to the protocol treasury.
                                </>
                            )}
                        </p>
                    )}
                    {escrowStuck && (
                        <p style={{ color: "var(--ink-soft)", margin: 0 }}>
                            Your fee is held in escrow — it has{" "}
                            <strong>not</strong> been distributed. The royalty
                            cascade fires when a registered compute provider
                            calls{" "}
                            <code style={{ fontFamily: "var(--mono)" }}>
                                settleInference
                            </code>
                            . Register as a provider below to settle it
                            yourself.
                        </p>
                    )}
                </div>
            )}

            <hr className="divider" style={{ margin: 0 }} />
            <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--ink)" }}>How it works.</strong> Two
                real on-chain txs: <code>payInference</code> escrows the fee, then{" "}
                <code>settleInference</code>{" "}
                {hasAncestors ? (
                    <>
                        walks the lineage and pays 50% direct owner / 25% gen-1 /
                        15% gen-2 / 7% gen-3+ / 3% training contributors — the
                        royalty cascade up the ancestor tree.
                    </>
                ) : (
                    <>
                        pays 50% to this agent&apos;s owner. This is a genesis
                        bloom — it has no ancestors, so the remaining royalty
                        tiers sweep to the protocol treasury.
                    </>
                )}{" "}
                A registered compute provider settles; the deployer wallet is
                registered so the demo runs end to end.
            </p>
        </div>
    );
}

/**
 * Compute-provider status panel — register / unregister + live stake.
 *
 * A registered provider is the role that calls `settleInference` (the
 * royalty cascade) and earns the 10% compute fee. The 0.1 0G stake is
 * collateral, held in `providerStake[wallet]` on chain and fully
 * refundable via `unregisterProvider()`. That stake had no UI before —
 * this panel surfaces it.
 */
export function ProviderPanel() {
    const { address } = useAccount();

    const { data: isRegistered, refetch: refetchRegistered } = useReadContract({
        address: CONTRACT_ADDRESSES.RoyaltyVault,
        abi: ROYALTY_VAULT_ABI,
        functionName: "isRegisteredProvider",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });
    const { data: stake, refetch: refetchStake } = useReadContract({
        address: CONTRACT_ADDRESSES.RoyaltyVault,
        abi: ROYALTY_VAULT_ABI,
        functionName: "providerStake",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // Refresh the on-chain reads once a register/unregister tx confirms.
    useEffect(() => {
        if (!isSuccess) return;
        refetchRegistered();
        refetchStake();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuccess]);

    if (!address) return null;

    const STAKE = BigInt("100000000000000000"); // 0.1 0G — MIN_PROVIDER_STAKE
    const busy = isPending || confirming;
    const registered = isRegistered === true;
    const stakeAmount = (stake as bigint | undefined) ?? 0n;

    function register() {
        writeContract(
            {
                address: CONTRACT_ADDRESSES.RoyaltyVault,
                abi: ROYALTY_VAULT_ABI,
                functionName: "registerProvider",
                args: [address!, STAKE],
                value: STAKE,
            },
            {
                onSuccess: () => toast.success("Registered as compute provider"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }
    function unregister() {
        writeContract(
            {
                address: CONTRACT_ADDRESSES.RoyaltyVault,
                abi: ROYALTY_VAULT_ABI,
                functionName: "unregisterProvider",
                args: [],
            },
            {
                onSuccess: () => toast.success("Unregistered — stake refunded"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }

    return (
        <div
            style={{
                border: "1px solid var(--rule)",
                background: "var(--bg-alt)",
                borderRadius: 5,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <span style={labelStyle}>Compute provider</span>
                <span
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10.5,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid var(--rule)",
                        color: registered ? "var(--cocoa)" : "var(--ink-soft)",
                        background: registered ? "var(--gold)" : "transparent",
                    }}
                >
                    {registered ? "Registered" : "Not registered"}
                </span>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                }}
            >
                <span style={{ fontFamily: "var(--mono)", color: "var(--ink-soft)" }}>
                    Your stake
                </span>
                <span
                    style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 600,
                        color: "var(--ink)",
                    }}
                >
                    {formatOG(stakeAmount, 4)} 0G
                </span>
            </div>

            <button
                type="button"
                onClick={registered ? unregister : register}
                disabled={busy}
                className="btn btn--ghost"
                style={{
                    width: "100%",
                    justifyContent: "center",
                    fontSize: 12,
                    opacity: busy ? 0.55 : 1,
                    cursor: busy ? "not-allowed" : "pointer",
                }}
            >
                {busy
                    ? "Confirming…"
                    : registered
                      ? "Unregister — refund 0.1 0G stake"
                      : "Register as provider — stake 0.1 0G"}
            </button>

            <p
                style={{
                    fontSize: 10.5,
                    color: "var(--ink-soft)",
                    margin: 0,
                    lineHeight: 1.5,
                    fontFamily: "var(--mono)",
                }}
            >
                A provider calls <code>settleInference</code> to fire the royalty
                cascade and earns the 10% compute fee. The stake is collateral —
                fully refundable via <code>unregisterProvider</code>.
            </p>
        </div>
    );
}
