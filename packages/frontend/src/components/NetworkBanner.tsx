"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ACTIVE_CHAIN } from "@/lib/chains";
import { AlertTriangle } from "lucide-react";

/**
 * Renders nothing in the happy path. Surfaces a wrong-network warning
 * (with a one-click switch button) when the connected wallet is on a
 * chain other than `ACTIVE_CHAIN`. Wired into the top of `Header` so
 * every page picks it up site-wide.
 *
 * Styled with inline CSS variables to match the woodcut palette used
 * across the rest of the app rather than the legacy Tailwind classes
 * the early scaffold shipped with.
 */
export function NetworkBanner() {
    const { isConnected } = useAccount();
    const currentChainId = useChainId();
    const { switchChain, isPending } = useSwitchChain();

    if (!isConnected) return null;
    const isWrongChain = currentChainId !== ACTIVE_CHAIN.id;
    if (!isWrongChain) return null;

    return (
        <div
            role="status"
            style={{
                borderBottom: "1.5px solid var(--cocoa)",
                background: "var(--coral, #f5b7a0)",
                color: "var(--cocoa)",
                padding: "10px 0",
                fontFamily: "var(--mono)",
                fontSize: 13,
            }}
        >
            <div
                style={{
                    maxWidth: "var(--max-w)",
                    margin: "0 auto",
                    padding: "0 var(--pad-edge)",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                }}
            >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={14} aria-hidden />
                    <span style={{ fontWeight: 600 }}>Wrong network.</span>
                    <span style={{ opacity: 0.85 }}>
                        Connect on{" "}
                        <strong style={{ fontWeight: 600 }}>
                            {ACTIVE_CHAIN.name} (chain {ACTIVE_CHAIN.id})
                        </strong>{" "}
                        to interact with MEKAR contracts.
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}
                    disabled={isPending}
                    style={{
                        background: "var(--cocoa)",
                        color: "var(--surface)",
                        border: "1.5px solid var(--cocoa)",
                        borderRadius: 999,
                        padding: "5px 14px",
                        fontFamily: "var(--mono)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isPending ? "wait" : "pointer",
                        opacity: isPending ? 0.6 : 1,
                    }}
                >
                    {isPending ? "Switching…" : `Switch to ${ACTIVE_CHAIN.name}`}
                </button>
            </div>
        </div>
    );
}
