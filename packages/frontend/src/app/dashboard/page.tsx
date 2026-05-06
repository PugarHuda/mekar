"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Bloom } from "@/components/Bloom";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { MEKAR_REGISTRY_ABI } from "@/contracts/abis";
import { useAgent, modeLabel } from "@/hooks/useAgent";
import { useUserStats } from "@/hooks/useUserStats";
import { explorerLink } from "@/lib/chains";
import { formatOG, shortAddress } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export default function DashboardPage() {
    const { address, isConnected } = useAccount();

    const { data: myAgentIds, isLoading } = useReadContract({
        address: CONTRACT_ADDRESSES.MekarRegistry,
        abi: MEKAR_REGISTRY_ABI,
        functionName: "getAgentsByCreator",
        args: address ? [address] : undefined,
        query: { enabled: isConnected && isDeployed },
    });

    const ids = (myAgentIds as readonly bigint[] | undefined) ?? [];
    const stats = useUserStats(isConnected ? address : undefined);

    return (
        <div>
            <Header />
            <main style={{ padding: "var(--pad-section) 0" }}>
                <div className="container">
                    <header
                        style={{
                            marginBottom: 56,
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            alignItems: "end",
                            gap: 24,
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <span className="eyebrow">/dashboard</span>
                            <h1 style={{ fontSize: "clamp(48px, 6vw, 80px)", marginTop: 12 }}>
                                Your <em>garden bed.</em>
                            </h1>
                            <p style={{ color: "var(--ink-soft)", marginTop: 12, maxWidth: "60ch" }}>
                                Every bloom you&apos;ve planted, every seed scattered through the
                                lineage cascade. All settled on 0G.
                            </p>
                        </div>
                        {isConnected && address && (
                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 12,
                                    color: "var(--ink-soft)",
                                    textAlign: "right",
                                }}
                            >
                                <div
                                    style={{
                                        textTransform: "uppercase",
                                        letterSpacing: "0.18em",
                                    }}
                                >
                                    Steward
                                </div>
                                <Link
                                    href={explorerLink(address, "address")}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                        fontSize: 14,
                                        color: "var(--ink)",
                                        marginTop: 4,
                                        display: "inline-block",
                                    }}
                                >
                                    {shortAddress(address, 6)}
                                </Link>
                            </div>
                        )}
                    </header>

                    {!isConnected && <ConnectPrompt />}

                    {isConnected && !isDeployed && (
                        <div
                            style={{
                                border: "1.5px solid var(--rule)",
                                background: "var(--bg-alt)",
                                padding: "48px 32px",
                                textAlign: "center",
                                borderRadius: "var(--radius)",
                            }}
                        >
                            <p style={{ color: "var(--ink-soft)" }}>
                                Contracts not yet deployed on this network.
                            </p>
                        </div>
                    )}

                    {isConnected && isDeployed && (
                        <>
                            {/* KPI strip */}
                            <section
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                                    border: "1.5px solid var(--cocoa)",
                                    background: "var(--surface)",
                                    marginBottom: 64,
                                }}
                            >
                                <Kpi label="Blooms planted" big={ids.length.toString()} />
                                <Kpi
                                    label="Royalty earned"
                                    big={stats.isLoading ? "…" : formatOG(stats.totalRoyaltyEarned, 6)}
                                    sub="0G"
                                />
                                <Kpi
                                    label="Royalty events"
                                    big={
                                        stats.isLoading
                                            ? "…"
                                            : stats.inferencesAsRecipient.length.toString()
                                    }
                                />
                                <Kpi
                                    label="Network"
                                    big="Galileo"
                                    sub="chain 16602"
                                    italic
                                />
                            </section>

                            {/* My blooms */}
                            <section style={{ marginBottom: 80 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "end",
                                        gap: 16,
                                        flexWrap: "wrap",
                                        marginBottom: 24,
                                    }}
                                >
                                    <div>
                                        <span className="eyebrow">My garden</span>
                                        <h2
                                            style={{
                                                fontSize: "clamp(28px, 3.2vw, 40px)",
                                                marginTop: 8,
                                            }}
                                        >
                                            Blooms you&apos;ve <em>planted.</em>
                                        </h2>
                                    </div>
                                    <Link
                                        href="/mint"
                                        className="btn btn--ghost"
                                        style={{ marginLeft: "auto" }}
                                    >
                                        Plant a new bloom →
                                    </Link>
                                </div>

                                {isLoading ? (
                                    <p style={{ color: "var(--ink-soft)" }}>
                                        Loading blooms…
                                    </p>
                                ) : ids.length === 0 ? (
                                    <div
                                        style={{
                                            border: "1px dashed var(--rule)",
                                            padding: "60px 32px",
                                            textAlign: "center",
                                            color: "var(--ink-soft)",
                                            fontStyle: "italic",
                                            fontFamily: "var(--display)",
                                            fontSize: 22,
                                        }}
                                    >
                                        No blooms yet. Plant your first agent and watch the garden
                                        grow.
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(auto-fill, minmax(220px, 1fr))",
                                            gap: 16,
                                        }}
                                    >
                                        {ids.map((id) => (
                                            <BloomCard
                                                key={id.toString()}
                                                agentId={Number(id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Royalty stream history */}
                            <section style={{ marginBottom: 80 }}>
                                <div style={{ marginBottom: 24 }}>
                                    <span className="eyebrow">Royalty stream</span>
                                    <h2
                                        style={{
                                            fontSize: "clamp(28px, 3.2vw, 40px)",
                                            marginTop: 8,
                                        }}
                                    >
                                        Recent <em>scatter.</em>
                                    </h2>
                                </div>

                                {stats.inferencesAsRecipient.length === 0 ? (
                                    <div
                                        style={{
                                            border: "1px dashed var(--rule)",
                                            padding: "40px 24px",
                                            textAlign: "center",
                                            color: "var(--ink-soft)",
                                            fontStyle: "italic",
                                            fontFamily: "var(--display)",
                                            fontSize: 20,
                                        }}
                                    >
                                        No royalty events yet. When a descendant is invoked, you
                                        earn here.
                                    </div>
                                ) : (
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            fontFamily: "var(--mono)",
                                            fontSize: 13,
                                        }}
                                    >
                                        <thead
                                            style={{
                                                fontFamily: "var(--mono)",
                                                fontSize: 11,
                                                letterSpacing: "0.12em",
                                                textTransform: "uppercase",
                                                color: "var(--ink-soft)",
                                                borderBottom: "1.5px solid var(--cocoa)",
                                                textAlign: "left",
                                            }}
                                        >
                                            <tr>
                                                <th style={{ padding: 14 }}>Agent</th>
                                                <th style={{ padding: 14 }}>Generation</th>
                                                <th style={{ padding: 14 }}>Block</th>
                                                <th
                                                    style={{
                                                        padding: 14,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Amount
                                                </th>
                                                <th
                                                    style={{
                                                        padding: 14,
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Tx
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.inferencesAsRecipient
                                                .slice(0, 20)
                                                .map((evt) => (
                                                    <tr
                                                        key={`${evt.txHash}-${evt.agentId}`}
                                                        style={{
                                                            borderBottom: "1px solid var(--rule)",
                                                        }}
                                                    >
                                                        <td style={{ padding: 14 }}>
                                                            <Link
                                                                href={`/agent/${evt.agentId}`}
                                                                style={{
                                                                    color: "var(--gold-deep)",
                                                                    textDecoration: "underline",
                                                                    textDecorationColor:
                                                                        "var(--rule)",
                                                                }}
                                                            >
                                                                #{evt.agentId}
                                                            </Link>
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: 14,
                                                                color: "var(--ink-soft)",
                                                            }}
                                                        >
                                                            L{evt.generation}
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: 14,
                                                                color: "var(--ink-soft)",
                                                            }}
                                                        >
                                                            #{evt.blockNumber.toString()}
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: 14,
                                                                textAlign: "right",
                                                                color: "var(--gold-deep)",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            +{formatOG(evt.amount, 6)} 0G
                                                        </td>
                                                        <td
                                                            style={{
                                                                padding: 14,
                                                                textAlign: "right",
                                                            }}
                                                        >
                                                            <Link
                                                                href={explorerLink(evt.txHash, "tx")}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                    color: "var(--ink-soft)",
                                                                }}
                                                            >
                                                                view <ExternalLink size={12} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </section>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

function ConnectPrompt() {
    return (
        <div
            style={{
                border: "1.5px dashed var(--rule)",
                padding: "60px 32px",
                textAlign: "center",
                background: "var(--bg-alt)",
                borderRadius: "var(--radius)",
            }}
        >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <Bloom kind="bud" seed="connect" size={80} sw={1.4} />
            </div>
            <h2 style={{ fontSize: 36, marginBottom: 8 }}>Connect your wallet.</h2>
            <p style={{ color: "var(--ink-soft)", maxWidth: "60ch", margin: "0 auto" }}>
                Sign in to see the blooms you&apos;ve planted, the royalty cascade flowing
                back, and the lineage tree underneath your garden.
            </p>
        </div>
    );
}

function Kpi({
    label,
    big,
    sub,
    italic,
}: {
    label: string;
    big: string;
    sub?: string;
    italic?: boolean;
}) {
    return (
        <div
            style={{
                padding: 28,
                borderRight: "1.5px solid var(--cocoa)",
            }}
        >
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontFamily: italic ? "var(--display)" : "var(--display)",
                    fontStyle: italic ? "italic" : "normal",
                    fontSize: 36,
                    color: "var(--ink)",
                    marginTop: 8,
                    lineHeight: 1.1,
                }}
            >
                {big}
                {sub && (
                    <span
                        style={{
                            fontSize: 14,
                            color: "var(--ink-soft)",
                            marginLeft: 8,
                            fontStyle: "italic",
                        }}
                    >
                        {sub}
                    </span>
                )}
            </div>
        </div>
    );
}

function BloomCard({ agentId }: { agentId: number }) {
    const { agent } = useAgent(agentId);
    if (!agent) {
        return (
            <div
                style={{
                    border: "1px solid var(--rule)",
                    padding: 24,
                    background: "var(--surface)",
                    height: 240,
                    animation: "fade-in 200ms ease-out",
                }}
            />
        );
    }
    const kind =
        agent.parents.length === 0 ? "genesis" : agent.parents.length === 1 ? "fork" : "compose";

    return (
        <Link
            href={`/agent/${agent.id}`}
            style={{
                display: "block",
                border: "1.5px solid var(--rule)",
                padding: 22,
                background: "var(--surface)",
                textDecoration: "none",
                color: "var(--ink)",
                transition: "all 180ms ease",
                borderRadius: "var(--radius)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--cocoa)";
                e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--rule)";
                e.currentTarget.style.transform = "translateY(0)";
            }}
        >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <Bloom kind={kind} seed={String(agent.id)} size={100} sw={1.2} />
            </div>
            <div
                style={{
                    fontFamily: "var(--display)",
                    fontStyle: "italic",
                    fontSize: 24,
                }}
            >
                Agent #{agent.id}
            </div>
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: "var(--ink-soft)",
                    marginTop: 6,
                }}
            >
                gen {agent.generation} · {modeLabel(agent.mode)}
            </div>
        </Link>
    );
}
