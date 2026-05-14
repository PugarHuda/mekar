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
     * Optional callback fired once the `payInference` tx receipt lands.
     * Parents pass `useAgentInferenceHistory().refetch` so the settlement
     * log table updates without a page reload — fixes the UX gap where
     * users paid successfully but saw an empty log until manual refresh.
     */
    onSettled?: () => void;
    /**
     * Optional optimistic insert. Called the moment the tx receipt arrives
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
};

const labelStyle: React.CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--ink-soft)",
};

export function InferencePay({ agentId, inferencePrice, onSettled, onOptimistic }: Props) {
    const { address, isConnected } = useAccount();
    const currentChainId = useChainId();
    const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
    // Pre-empt failed tx by checking the wallet is on the right chain
    // BEFORE writeContract fires. Without this, RainbowKit shows a generic
    // error popup after gas estimation fails, which is much more confusing
    // than a clear "switch network" affordance.
    const isWrongChain = isConnected && currentChainId !== ACTIVE_CHAIN.id;
    const [prompt, setPrompt] = useState("Hello, agent!");

    const { data: balance } = useBalance({ address });

    useReadContract({
        address: CONTRACT_ADDRESSES.RoyaltyVault,
        abi: ROYALTY_VAULT_ABI,
        functionName: "isRegisteredProvider",
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // Tell the parent to re-scan RoyaltyPaid logs once the receipt lands.
    // We gate on `txHash` so the effect also re-fires for a SECOND payment
    // in the same session (new hash → new settle → onSettled again).
    // We also fire onOptimistic right here with a synthetic row so the
    // settlement log shows the payment immediately, even before the RPC
    // delta scan finishes. The pending row gets replaced by the real one
    // once the scan picks up the event (dedup by txHash inside the hook).
    useEffect(() => {
        if (!isSuccess || !txHash || !address) return;
        if (onOptimistic) {
            onOptimistic({
                txHash,
                recipient: address,
                // Generation 0 = the direct-owner share. Most visible row to
                // the user and the only one we can synthesise with certainty
                // before the scan reads the real event.
                generation: 0,
                amount: inferencePrice / 2n,
                // Synthesise a blockNumber that sorts AFTER the latest
                // real row in the table. Real value backfills on next scan.
                blockNumber: BigInt(Date.now()),
            });
        }
        if (onSettled) onSettled();
        // onSettled / onOptimistic aren't in deps on purpose: parents pass
        // inline arrows; the txHash + isSuccess pair is the real trigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuccess, txHash, address]);

    function handlePay() {
        if (!address) {
            toast.error("Connect wallet first");
            return;
        }

        if (balance && balance.value < inferencePrice) {
            toast.error(`Need ≥ ${formatOG(inferencePrice)} $0G. Get from faucet.`);
            return;
        }

        writeContract(
            {
                address: CONTRACT_ADDRESSES.RoyaltyVault,
                abi: ROYALTY_VAULT_ABI,
                functionName: "payInference",
                args: [BigInt(agentId)],
                value: inferencePrice,
            },
            {
                onSuccess: () => toast.success("Inference payment submitted"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }

    const insufficientBalance = balance ? balance.value < inferencePrice : false;

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

            {/* "Where does the AI think?" — recurring question. Mekar is the
                royalty rail, not a model host. We say so up-front so users
                don't expect a chat response when they pay. */}
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
                Mekar settles royalty on chain. Actual model inference happens on{" "}
                <strong>0G Compute (TEE)</strong> when a provider serves this agent&apos;s{" "}
                <code>weightsPointer</code>. No DSN providers registered on Galileo yet
                — payment cascades, response is Phase 2. See{" "}
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
                    disabled={!isConnected || isPending || isConfirming || insufficientBalance}
                    className="btn"
                    style={{
                        width: "100%",
                        justifyContent: "center",
                        opacity:
                            !isConnected || isPending || isConfirming || insufficientBalance
                                ? 0.55
                                : 1,
                        cursor:
                            !isConnected || isPending || isConfirming || insufficientBalance
                                ? "not-allowed"
                                : "pointer",
                    }}
                >
                    {(isPending || isConfirming) && (
                        <Loader2
                            className="animate-spin"
                            style={{ width: 14, height: 14, marginRight: 8 }}
                        />
                    )}
                    {!isConnected
                        ? "Connect a wallet"
                        : insufficientBalance
                          ? "Insufficient balance"
                          : isPending
                            ? "Confirming…"
                            : isConfirming
                              ? "Mining the bloom…"
                              : "Pay & run inference →"}
                </button>
            )}

            {txHash && (
                <div
                    style={{
                        border: "1px solid var(--rule)",
                        background: isSuccess ? "var(--gold)" : "var(--bg-alt)",
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
                                color: isSuccess ? "var(--cocoa)" : "var(--ink-soft)",
                            }}
                        >
                            {isSuccess ? "✓ Settled" : "Pending…"}
                        </span>
                        <Link
                            href={explorerLink(txHash, "tx")}
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
                    {isSuccess && (
                        <p style={{ color: "var(--ink-soft)", margin: 0 }}>
                            Royalty distributed atomically to all ancestors. Check the explorer
                            for{" "}
                            <code style={{ fontFamily: "var(--mono)" }}>RoyaltyPaid</code>{" "}
                            events.
                        </p>
                    )}
                </div>
            )}

            <hr className="divider" style={{ margin: 0 }} />
            <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--ink)" }}>How it works.</strong> Payment lands in
                RoyaltyVault, walks the lineage, and pays 50% direct owner / 25% gen-1 / 15%
                gen-2 / 7% gen-3+ / 3% training contributors — all in one atomic tx.
            </p>
        </div>
    );
}

export function RegisterProviderButton() {
    const { address } = useAccount();
    const { writeContract, data: txHash, isPending } = useWriteContract();
    const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    function handleRegister() {
        if (!address) return toast.error("Connect wallet");
        const stake = BigInt("100000000000000000");
        writeContract(
            {
                address: CONTRACT_ADDRESSES.RoyaltyVault,
                abi: ROYALTY_VAULT_ABI,
                functionName: "registerProvider",
                args: [address, stake],
                value: stake,
            },
            {
                onSuccess: () => toast.success("Registered as compute provider"),
                onError: (err) => toast.error(err.message.slice(0, 200)),
            }
        );
    }

    return (
        <button
            type="button"
            onClick={handleRegister}
            disabled={isPending || isSuccess}
            style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "var(--ink-soft)",
                textDecoration: "underline",
                textDecorationColor: "var(--rule)",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: isPending || isSuccess ? "not-allowed" : "pointer",
                opacity: isPending || isSuccess ? 0.55 : 1,
            }}
        >
            {isPending
                ? "Registering…"
                : isSuccess
                  ? "✓ Registered as compute provider"
                  : "Register as compute provider (0.1 0G stake)"}
        </button>
    );
}
