"use client";

import { useState } from "react";
import {
    useAccount,
    useWriteContract,
    useWaitForTransactionReceipt,
    useReadContract,
    useBalance,
} from "wagmi";
import { toast } from "sonner";
import Link from "next/link";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import { ROYALTY_VAULT_ABI } from "@/contracts/abis";
import { explorerLink } from "@/lib/chains";
import { formatOG } from "@/lib/utils";
import { Loader2, ExternalLink } from "lucide-react";

type Props = {
    agentId: number;
    inferencePrice: bigint;
};

const labelStyle: React.CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--ink-soft)",
};

export function InferencePay({ agentId, inferencePrice }: Props) {
    const { address, isConnected } = useAccount();
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

            <div>
                <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>
                    Prompt (mock)
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={2}
                    placeholder="Ask the agent something…"
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
