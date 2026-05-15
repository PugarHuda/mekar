"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { Bloom } from "@/components/Bloom";
import { InferencePay, RegisterProviderButton } from "@/components/InferencePay";
import { useAgent, modeLabel } from "@/hooks/useAgent";
import { useAgentInferenceHistory } from "@/hooks/useUserStats";
import { useLineageData, type LineageNode } from "@/hooks/useLineageData";
import { explorerLink } from "@/lib/chains";
import { formatOG, formatTimeAgo, shortAddress } from "@/lib/utils";
import {
    agentName,
    agentFocus,
    agentCategory,
    agentCategories,
    kindFromParents,
    CATEGORY_LABELS,
} from "@/lib/agentNaming";
import { getAgentMetadata } from "@/lib/agentMetadata";
import { EditMetadataPanel } from "@/components/EditMetadataPanel";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const agentId = parseInt(id, 10);
    const { agent, isLoading } = useAgent(agentId);
    const history = useAgentInferenceHistory(Number.isFinite(agentId) ? agentId : undefined);
    const [selectedTx, setSelectedTx] = useState<(typeof history.inferences)[number] | null>(null);

    // Pull the full lineage list so we can resolve parent + descendant
    // ids back to real identity (name + category + owner) for the
    // lineage strip render below. Without this each parent/descendant
    // ends up labelled "Agent bloom #N" with no signal about what it does.
    const { nodes: allNodes } = useLineageData();
    const lookupNode = (id: number): LineageNode | undefined =>
        allNodes.find((n) => n.id === id);

    // Real 30-day activity series — replaces the old proceduralSeries
    // placeholder. Buckets RoyaltyPaid events by approximate day using
    // block-number deltas (Galileo ≈ 1 block/sec, so 86400 blocks = 1 day).
    // No extra RPC required: useAgentInferenceHistory already fetched the
    // events; we just rebucket them client-side.
    //
    // Series layout: oldest day at index 0, today at the rightmost edge.
    // Empty arrays (no royalty earned yet) render as a flat zero line —
    // the Sparkline component handles min === max gracefully.
    const { sparkInferences, sparkAmounts } = useMemo(() => {
        if (history.inferences.length === 0) {
            return {
                sparkInferences: new Array<number>(30).fill(0),
                sparkAmounts: new Array<number>(30).fill(0),
            };
        }
        const BLOCKS_PER_DAY = 86400n; // 1 block/sec * 86400 sec/day
        const anchor =
            history.inferences[0].blockNumber + BLOCKS_PER_DAY; // newest event = "yesterday"
        const counts = new Array<number>(30).fill(0);
        const amounts = new Array<number>(30).fill(0);
        for (const inf of history.inferences) {
            const blocksAgo = anchor > inf.blockNumber ? anchor - inf.blockNumber : 0n;
            const daysAgo = Number(blocksAgo / BLOCKS_PER_DAY);
            const idx = 30 - 1 - daysAgo;
            if (idx >= 0 && idx < 30) {
                counts[idx] += 1;
                amounts[idx] += Number(inf.amount) / 1e18;
            }
        }
        return { sparkInferences: counts, sparkAmounts: amounts };
    }, [history.inferences]);

    return (
        <div>
            <main style={{ padding: "var(--pad-section) 0" }}>
                <div className="container">
                    <div
                        style={{
                            display: "flex",
                            gap: 14,
                            alignItems: "center",
                            color: "var(--ink-soft)",
                            fontFamily: "var(--mono)",
                            fontSize: 12,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            marginBottom: 28,
                        }}
                    >
                        <Link
                            href="/explorer"
                            style={{
                                color: "var(--ink-soft)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <ArrowLeft size={14} />
                            Lineage Garden
                        </Link>
                        <span>·</span>
                        <span>
                            {agent
                                ? agent.parents.length === 0
                                    ? "Genesis"
                                    : agent.parents.length === 1
                                      ? "Fork"
                                      : "Composed"
                                : "Loading"}
                        </span>
                    </div>

                    {isLoading && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "100px 0",
                            }}
                        >
                            <Loader2 className="animate-spin" size={36} color="var(--gold-deep)" />
                        </div>
                    )}

                    {!isLoading && !agent && (
                        <div
                            style={{
                                border: "1.5px solid var(--rule)",
                                background: "var(--bg-alt)",
                                padding: "60px 32px",
                                textAlign: "center",
                                borderRadius: "var(--radius)",
                            }}
                        >
                            <h2 style={{ marginBottom: 16 }}>Agent #{agentId} not found.</h2>
                            <p style={{ color: "var(--ink-soft)", maxWidth: "60ch", margin: "0 auto" }}>
                                This bloom hasn&apos;t been planted on this network. Try the
                                explorer for the full garden.
                            </p>
                        </div>
                    )}

                    {agent && (
                        <>
                            {/* HERO */}
                            <header
                                className="agent-hero"
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "260px 1fr auto",
                                    gap: 48,
                                    alignItems: "center",
                                    paddingBottom: 56,
                                    borderBottom: "1px solid var(--rule)",
                                    marginBottom: 56,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        filter: "drop-shadow(0 12px 28px rgba(61, 40, 23, 0.18))",
                                    }}
                                >
                                    <Bloom
                                        kind={
                                            agent.parents.length === 0
                                                ? "genesis"
                                                : agent.parents.length === 1
                                                  ? "fork"
                                                  : "compose"
                                        }
                                        seed={String(agent.id)}
                                        size={220}
                                        sw={1.6}
                                    />
                                </div>

                                <div>
                                    <span className="eyebrow">
                                        /
                                        {agent.parents.length === 0
                                            ? "genesis"
                                            : agent.parents.length === 1
                                              ? "fork"
                                              : "composed"}{" "}
                                        bloom
                                    </span>
                                    <h1
                                        style={{
                                            fontSize: "clamp(40px, 5vw, 64px)",
                                            marginTop: 12,
                                            lineHeight: 1.05,
                                        }}
                                    >
                                        <em>{agentName(agent.id, agent.parents.length)}</em>
                                    </h1>
                                    <code
                                        style={{
                                            fontFamily: "var(--mono)",
                                            fontSize: 13,
                                            color: "var(--ink-soft)",
                                            display: "block",
                                            marginTop: 8,
                                        }}
                                    >
                                        Token #{agent.id} · gen {agent.generation} ·{" "}
                                        {modeLabel(agent.mode)}
                                    </code>
                                    <div
                                        style={{
                                            marginTop: 14,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "6px 14px",
                                            border: "1.5px solid var(--cocoa)",
                                            borderRadius: 999,
                                            background: "var(--gold)",
                                            color: "var(--cocoa)",
                                            fontFamily: "var(--mono)",
                                            fontSize: 12,
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {agentCategories(agent.id, agent.parents.length).map(
                                            (c, i, arr) => (
                                                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {CATEGORY_LABELS[c]}
                                                    </span>
                                                    {i < arr.length - 1 && (
                                                        <span style={{ opacity: 0.45 }}>+</span>
                                                    )}
                                                </span>
                                            )
                                        )}
                                        <span style={{ opacity: 0.6 }}>·</span>
                                        <span>{agentFocus(agent.id, agent.parents.length)}</span>
                                    </div>
                                    {/* License chip — soft norm, not on-chain.
                                        Sits right under the capability so downstream
                                        forkers can see attribution terms at a glance. */}
                                    {(() => {
                                        const meta = getAgentMetadata(agent.id);
                                        const lic = meta?.license;
                                        if (!lic) return null;
                                        return (
                                            <div
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    marginTop: 8,
                                                    padding: "3px 10px",
                                                    border: "1px solid var(--rule)",
                                                    background: "var(--bg-alt)",
                                                    borderRadius: 999,
                                                    fontFamily: "var(--mono)",
                                                    fontSize: 10.5,
                                                    color: "var(--ink-soft)",
                                                    letterSpacing: "0.06em",
                                                }}
                                                title="License chosen at mint. Soft norm — not enforced on chain, but inherited as attribution requirement by downstream forks."
                                            >
                                                <span style={{ opacity: 0.6 }}>license</span>
                                                <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                                                    {lic}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                    <p
                                        style={{
                                            color: "var(--ink-soft)",
                                            marginTop: 18,
                                            maxWidth: "60ch",
                                            fontSize: 16,
                                        }}
                                    >
                                        {agent.parents.length === 0
                                            ? "A foundational bloom — the seed of its lineage. Every fork that descends from it inherits a share of the royalty cascade."
                                            : agent.parents.length === 1
                                              ? `A fine-tune of agent #${agent.parents[0]}. Inferences split between this bloom, its parent, and any further ancestors.`
                                              : `A composed bloom merged from ${agent.parents.length} parents. Royalty obligations carry forward through every ancestor.`}
                                    </p>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            marginTop: 18,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span className="chip">
                                            {agent.descendants.length} descendants
                                        </span>
                                        <span
                                            className="chip"
                                            title="Inference count from RoyaltyPaid events"
                                        >
                                            {history.totalInferences} inferences
                                        </span>
                                        <span
                                            className="chip"
                                            title="Lifetime royalty distributed through this agent"
                                        >
                                            {formatOG(history.totalDistributed, 6)} OG distributed
                                        </span>
                                        <span className="chip">
                                            alignment {(agent.alignmentHealth / 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 16,
                                        minWidth: 220,
                                    }}
                                >
                                    <div
                                        style={{
                                            border: "1.5px solid var(--cocoa)",
                                            borderRadius: "var(--radius)",
                                            padding: "20px 22px",
                                            background: "var(--surface)",
                                            boxShadow: "var(--shadow-paper)",
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
                                            Per inference
                                        </div>
                                        <div
                                            style={{
                                                fontFamily: "var(--display)",
                                                fontSize: 36,
                                                fontStyle: "italic",
                                                color: "var(--ink)",
                                                marginTop: 4,
                                                lineHeight: 1,
                                            }}
                                        >
                                            {formatOG(agent.inferencePrice, 6)}{" "}
                                            <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                                                0G
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                marginTop: 4,
                                                fontSize: 12,
                                                color: "var(--ink-soft)",
                                            }}
                                        >
                                            Cascade: 50% / 25% / 15% / 7% / 3%
                                        </div>
                                    </div>
                                    <a href="#try" className="btn">
                                        Try it →
                                    </a>
                                    <Link href={`/mint?fork=${agent.id}`} className="btn btn--ghost">
                                        Fork this bloom
                                    </Link>
                                </div>
                            </header>

                            {/* LINEAGE STRIP */}
                            <section style={{ marginBottom: 80 }}>
                                <div style={{ marginBottom: 24 }}>
                                    <span className="eyebrow">Lineage</span>
                                    <h2
                                        style={{
                                            fontSize: "clamp(32px, 3.6vw, 48px)",
                                            marginTop: 8,
                                        }}
                                    >
                                        Ancestors and <em>descendants</em>.
                                    </h2>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 24,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        padding: "28px 0",
                                        borderTop: "1px solid var(--rule)",
                                        borderBottom: "1px solid var(--rule)",
                                    }}
                                >
                                    {agent.parents.map((p) => {
                                        const pNode = lookupNode(p);
                                        const pParentCount = pNode?.parents.length ?? 0;
                                        const pName = agentName(p, pParentCount);
                                        const pCat = CATEGORY_LABELS[agentCategory(p, pParentCount)];
                                        const pFocus = agentFocus(p, pParentCount);
                                        const tip = `${pName}\n${pCat} · ${pFocus}\nToken #${p} · gen ${pNode?.generation ?? "?"}${pNode?.owner ? `\nowner ${shortAddress(pNode.owner, 4)}` : ""}`;
                                        return (
                                            <Link
                                                key={p}
                                                href={`/agent/${p}`}
                                                title={tip}
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    textDecoration: "none",
                                                    color: "var(--ink)",
                                                    opacity: 0.9,
                                                    maxWidth: 140,
                                                }}
                                            >
                                                <Bloom
                                                    kind={kindFromParents(pParentCount)}
                                                    seed={String(p)}
                                                    size={70}
                                                    sw={1.2}
                                                />
                                                <span
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        fontFamily: "var(--mono)",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        maxWidth: 130,
                                                    }}
                                                >
                                                    {pName}
                                                </span>
                                                <code
                                                    style={{
                                                        fontFamily: "var(--mono)",
                                                        fontSize: 10,
                                                        color: "var(--ink-soft)",
                                                    }}
                                                >
                                                    {pCat} · ancestor
                                                </code>
                                            </Link>
                                        );
                                    })}

                                    {agent.parents.length > 0 && (
                                        <span
                                            style={{
                                                fontFamily: "var(--display)",
                                                fontSize: 32,
                                                color: "var(--ink-soft)",
                                            }}
                                        >
                                            →
                                        </span>
                                    )}

                                    <div
                                        title={`${agentName(agent.id, agent.parents.length)}\n${CATEGORY_LABELS[agentCategory(agent.id, agent.parents.length)]} · ${agentFocus(agent.id, agent.parents.length)}\nToken #${agent.id} · gen ${agent.generation}`}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "12px 18px",
                                            background: "var(--bg-alt)",
                                            border: "1.5px solid var(--cocoa)",
                                            borderRadius: 8,
                                            maxWidth: 180,
                                        }}
                                    >
                                        <Bloom
                                            kind={kindFromParents(agent.parents.length)}
                                            seed={String(agent.id)}
                                            size={88}
                                            sw={1.4}
                                        />
                                        <span
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                fontFamily: "var(--mono)",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                maxWidth: 160,
                                            }}
                                        >
                                            {agentName(agent.id, agent.parents.length)}
                                        </span>
                                        <code
                                            style={{
                                                fontFamily: "var(--mono)",
                                                fontSize: 10,
                                                color: "var(--ink-soft)",
                                            }}
                                        >
                                            {CATEGORY_LABELS[
                                                agentCategory(agent.id, agent.parents.length)
                                            ]}{" "}
                                            · this bloom
                                        </code>
                                    </div>

                                    {agent.descendants.length > 0 && (
                                        <span
                                            style={{
                                                fontFamily: "var(--display)",
                                                fontSize: 32,
                                                color: "var(--ink-soft)",
                                            }}
                                        >
                                            →
                                        </span>
                                    )}

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 16,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        {agent.descendants.map((d) => {
                                            const dNode = lookupNode(d);
                                            const dParentCount = dNode?.parents.length ?? 1;
                                            const dName = agentName(d, dParentCount);
                                            const dCat = CATEGORY_LABELS[agentCategory(d, dParentCount)];
                                            const dFocus = agentFocus(d, dParentCount);
                                            const tip = `${dName}\n${dCat} · ${dFocus}\nToken #${d} · gen ${dNode?.generation ?? "?"}${dNode?.owner ? `\nowner ${shortAddress(dNode.owner, 4)}` : ""}`;
                                            return (
                                                <Link
                                                    key={d}
                                                    href={`/agent/${d}`}
                                                    title={tip}
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        gap: 2,
                                                        textDecoration: "none",
                                                        color: "var(--ink)",
                                                        opacity: 0.9,
                                                        maxWidth: 110,
                                                    }}
                                                >
                                                    <Bloom
                                                        kind={kindFromParents(dParentCount)}
                                                        seed={String(d)}
                                                        size={56}
                                                        sw={1}
                                                    />
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            fontFamily: "var(--mono)",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            maxWidth: 100,
                                                        }}
                                                    >
                                                        {dName}
                                                    </span>
                                                    <code
                                                        style={{
                                                            fontFamily: "var(--mono)",
                                                            fontSize: 9,
                                                            color: "var(--ink-soft)",
                                                        }}
                                                    >
                                                        {dCat}
                                                    </code>
                                                </Link>
                                            );
                                        })}
                                        {agent.descendants.length === 0 && (
                                            <span
                                                style={{
                                                    color: "var(--ink-soft)",
                                                    fontStyle: "italic",
                                                    fontFamily: "var(--display)",
                                                    fontSize: 18,
                                                }}
                                            >
                                                No descendants yet — this lineage hasn&apos;t
                                                bloomed further.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* STATS GRID */}
                            <section
                                className="agent-stats"
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                                    gap: 0,
                                    border: "1.5px solid var(--cocoa)",
                                    background: "var(--surface)",
                                    marginBottom: 80,
                                }}
                            >
                                <StatCell
                                    big={history.totalInferences.toString()}
                                    label="Total inferences"
                                    sub={
                                        history.inferences.length > 0
                                            ? `${history.inferences.length} RoyaltyPaid events (30-day view)`
                                            : "No settled activity yet"
                                    }
                                    spark={sparkInferences}
                                />
                                <StatCell
                                    big={`${formatOG(history.totalDistributed, 5)}`}
                                    label="0G distributed"
                                    sub={
                                        history.totalInferences > 0
                                            ? `${(Number(history.totalDistributed) / 1e18 / history.totalInferences).toFixed(6)} avg / call`
                                            : "Waiting on first settle"
                                    }
                                    spark={sparkAmounts}
                                    sparkColor="var(--gold)"
                                />
                                <StatCell
                                    big={agent.descendants.length.toString()}
                                    label="Direct descendants"
                                    sub={`royalty depth ${agent.parents.length === 0 ? 0 : agent.generation}`}
                                />
                                <StatCell
                                    big={shortAddress(agent.owner ?? agent.creator, 4)}
                                    label="Steward"
                                    sub={`Created ${formatTimeAgo(agent.createdAt)}`}
                                />
                            </section>

                            {/* Owner-only metadata editor. Renders nothing if
                                the connected wallet doesn't own this token. */}
                            <EditMetadataPanel
                                agentId={agent.id}
                                ownerAddress={agent.owner ?? agent.creator}
                            />

                            {/* TRY IT */}
                            <section id="try" style={{ marginBottom: 80 }}>
                                <div style={{ marginBottom: 24 }}>
                                    <span className="eyebrow">/inference</span>
                                    <h2
                                        style={{
                                            fontSize: "clamp(32px, 3.6vw, 48px)",
                                            marginTop: 8,
                                        }}
                                    >
                                        Try a single <em>inference.</em>
                                    </h2>
                                    <p
                                        style={{
                                            color: "var(--ink-soft)",
                                            maxWidth: "60ch",
                                            marginTop: 8,
                                        }}
                                    >
                                        Pay {formatOG(agent.inferencePrice, 6)} 0G to invoke this
                                        agent. The royalty cascade settles atomically across the
                                        full lineage in a single on-chain transaction.
                                    </p>
                                </div>

                                <div
                                    className="agent-body-grid"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 380px",
                                        gap: 24,
                                        alignItems: "start",
                                    }}
                                >
                                    <div
                                        style={{
                                            border: "1.5px solid var(--rule)",
                                            background: "var(--surface)",
                                            padding: 24,
                                            borderRadius: "var(--radius)",
                                            minHeight: 240,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontFamily: "var(--mono)",
                                                fontSize: 11,
                                                letterSpacing: "0.18em",
                                                textTransform: "uppercase",
                                                color: "var(--ink-soft)",
                                                marginBottom: 12,
                                            }}
                                        >
                                            Sample prompt · UI demo
                                        </div>
                                        <p
                                            style={{
                                                color: "var(--ink)",
                                                fontStyle: "italic",
                                                fontFamily: "var(--display)",
                                                fontSize: 22,
                                                margin: 0,
                                            }}
                                        >
                                            &ldquo;Translate this README into Bahasa Indonesia,
                                            preserving code blocks.&rdquo;
                                        </p>
                                        <hr className="divider" style={{ margin: "20px 0" }} />
                                        <div
                                            style={{
                                                color: "var(--ink-soft)",
                                                fontSize: 14,
                                                lineHeight: 1.55,
                                            }}
                                        >
                                            ▍ Live inference output is wired to 0G Compute on
                                            mainnet. For Galileo testnet, payment settles on
                                            chain and routes royalties via{" "}
                                            <code style={{ fontFamily: "var(--mono)" }}>
                                                RoyaltyVault.settleInference
                                            </code>
                                            . Connect a wallet to try it.
                                        </div>
                                    </div>

                                    <div>
                                        <InferencePay
                                            agentId={agent.id}
                                            inferencePrice={agent.inferencePrice}
                                            onSettled={history.refetch}
                                            onOptimistic={history.addOptimistic}
                                        />
                                        <div style={{ marginTop: 12 }}>
                                            <RegisterProviderButton />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* RECENT INFERENCES */}
                            <section style={{ marginBottom: 80 }}>
                                <div style={{ marginBottom: 24 }}>
                                    <span className="eyebrow">Settlement log</span>
                                    <h2
                                        style={{
                                            fontSize: "clamp(32px, 3.6vw, 48px)",
                                            marginTop: 8,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 14,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        Recent <em>inferences.</em>
                                        {/* Tiny inline "refreshing" pip — shows up
                                            during the post-payment delta scan so the
                                            user knows the table is being re-fetched
                                            and not just stuck on a cached snapshot. */}
                                        {history.isLoading && history.inferences.length > 0 && (
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    fontSize: 11,
                                                    fontFamily: "var(--mono)",
                                                    letterSpacing: "0.16em",
                                                    textTransform: "uppercase",
                                                    color: "var(--ink-soft)",
                                                }}
                                            >
                                                <Loader2 className="animate-spin" size={11} />
                                                refreshing
                                            </span>
                                        )}
                                    </h2>
                                </div>

                                {history.inferences.length === 0 ? (
                                    <div
                                        style={{
                                            border: "1px dashed var(--rule)",
                                            padding: "60px 24px",
                                            textAlign: "center",
                                            color: "var(--ink-soft)",
                                            fontStyle: "italic",
                                            fontFamily: "var(--display)",
                                            fontSize: 22,
                                        }}
                                    >
                                        {history.isLoading
                                            ? "Scanning RoyaltyPaid events…"
                                            : "No inference activity yet. Be the first to bloom this agent."}
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
                                        <thead>
                                            <tr
                                                style={{
                                                    borderBottom: "1.5px solid var(--cocoa)",
                                                    textAlign: "left",
                                                    fontFamily: "var(--mono)",
                                                    fontSize: 11,
                                                    letterSpacing: "0.12em",
                                                    textTransform: "uppercase",
                                                    color: "var(--ink-soft)",
                                                }}
                                            >
                                                <th style={{ padding: "12px 12px" }}>Block</th>
                                                <th style={{ padding: "12px 12px" }}>Recipient</th>
                                                <th style={{ padding: "12px 12px" }}>Generation</th>
                                                <th
                                                    style={{
                                                        padding: "12px 12px",
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Amount
                                                </th>
                                                <th
                                                    style={{
                                                        padding: "12px 12px",
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Tx
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.inferences.slice(0, 10).map((inf) => (
                                                <tr
                                                    key={`${inf.txHash}-${inf.recipient}`}
                                                    onClick={() => setSelectedTx(inf)}
                                                    style={{
                                                        borderBottom: "1px solid var(--rule)",
                                                        cursor: "pointer",
                                                        transition: "background 160ms ease",
                                                        // Pending rows render slightly faded + with a
                                                        // pulse so users know they're optimistic until
                                                        // the on-chain event is picked up.
                                                        opacity: inf.pending ? 0.7 : 1,
                                                    }}
                                                    onMouseEnter={(e) =>
                                                        (e.currentTarget.style.background =
                                                            "var(--bg-alt)")
                                                    }
                                                    onMouseLeave={(e) =>
                                                        (e.currentTarget.style.background = "")
                                                    }
                                                >
                                                    <td
                                                        style={{
                                                            padding: "14px 12px",
                                                            color: "var(--ink-soft)",
                                                        }}
                                                    >
                                                        {inf.pending ? (
                                                            <span
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: 6,
                                                                    color: "var(--gold-deep)",
                                                                    fontWeight: 600,
                                                                }}
                                                                title="Optimistic — your tx confirmed; RoyaltyPaid event will replace this row in 1-3s"
                                                            >
                                                                <Loader2
                                                                    className="animate-spin"
                                                                    size={10}
                                                                />
                                                                pending
                                                            </span>
                                                        ) : (
                                                            `#${inf.blockNumber.toString()}`
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "14px 12px" }}>
                                                        {shortAddress(inf.recipient, 4)}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "14px 12px",
                                                            color: "var(--ink-soft)",
                                                        }}
                                                    >
                                                        gen {inf.generation}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "14px 12px",
                                                            textAlign: "right",
                                                            color: "var(--gold-deep)",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        +{formatOG(inf.amount, 6)} 0G
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: "14px 12px",
                                                            textAlign: "right",
                                                        }}
                                                    >
                                                        →
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

            {selectedTx && (
                <TxModal
                    tx={selectedTx}
                    agentId={agent?.id ?? agentId}
                    onClose={() => setSelectedTx(null)}
                />
            )}
        </div>
    );
}

/* ─────────────── Helpers ─────────────── */

function StatCell({
    big,
    label,
    sub,
    spark,
    sparkColor = "var(--primary)",
}: {
    big: string;
    label: string;
    sub: string;
    spark?: number[];
    sparkColor?: string;
}) {
    return (
        <div
            style={{
                padding: 24,
                borderRight: "1.5px solid var(--cocoa)",
                minHeight: 180,
            }}
        >
            <div
                style={{
                    fontFamily: "var(--display)",
                    fontStyle: "italic",
                    fontSize: 36,
                    color: "var(--ink)",
                    lineHeight: 1.1,
                }}
            >
                {big}
            </div>
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginTop: 8,
                }}
            >
                {label}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>{sub}</div>
            {spark && (
                <div style={{ marginTop: 16 }}>
                    <Sparkline data={spark} color={sparkColor} />
                </div>
            )}
        </div>
    );
}

function Sparkline({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const w = 220;
    const h = 50;
    const step = w / (data.length - 1);
    const pts = data
        .map((v, i) => {
            const x = i * step;
            const y = h - ((v - min) / (max - min || 1)) * h;
            return `${x},${y}`;
        })
        .join(" ");
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
            <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity="0.08" />
        </svg>
    );
}

/* ─────────────── Tx Modal ─────────────── */

function TxModal({
    tx,
    agentId,
    onClose,
}: {
    tx: { txHash: `0x${string}`; recipient: `0x${string}`; generation: number; amount: bigint; blockNumber: bigint };
    agentId: number;
    onClose: () => void;
}) {
    return (
        <>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,12,9,0.5)",
                    backdropFilter: "blur(4px)",
                    border: "none",
                    cursor: "pointer",
                    zIndex: 80,
                }}
            />
            <div
                role="dialog"
                aria-modal="true"
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(560px, 92vw)",
                    background: "var(--surface)",
                    border: "1.5px solid var(--cocoa)",
                    borderRadius: "var(--radius)",
                    padding: 32,
                    boxShadow: "0 32px 80px -32px rgba(15,12,9,0.5)",
                    zIndex: 90,
                }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        border: "1px solid var(--rule)",
                        borderRadius: "50%",
                        width: 32,
                        height: 32,
                        background: "transparent",
                        color: "var(--ink)",
                        fontSize: 18,
                        cursor: "pointer",
                    }}
                >
                    ×
                </button>

                <span className="eyebrow">/royalty paid · {formatTimeAgo(Number(tx.blockNumber))}</span>
                <h2 style={{ fontSize: 36, marginTop: 8 }}>
                    Inference <em>settled.</em>
                </h2>

                <dl
                    style={{
                        marginTop: 20,
                        padding: "20px 0",
                        borderTop: "1px solid var(--rule)",
                        borderBottom: "1px solid var(--rule)",
                    }}
                >
                    <ModalDL
                        label="Tx hash"
                        value={
                            <Link
                                href={explorerLink(tx.txHash, "tx")}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 12,
                                    color: "var(--ink)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    textDecoration: "underline",
                                    textDecorationColor: "var(--rule)",
                                }}
                            >
                                {tx.txHash.slice(0, 12)}…{tx.txHash.slice(-6)}
                                <ExternalLink size={12} />
                            </Link>
                        }
                    />
                    <ModalDL label="Block" value={`#${tx.blockNumber.toString()}`} />
                    <ModalDL label="Agent" value={`#${agentId}`} />
                    <ModalDL label="Recipient" value={shortAddress(tx.recipient, 6)} />
                    <ModalDL label="Generation" value={`L${tx.generation}`} />
                    <ModalDL
                        label="Royalty amount"
                        value={
                            <span
                                style={{
                                    color: "var(--gold-deep)",
                                    fontFamily: "var(--display)",
                                    fontStyle: "italic",
                                    fontSize: 22,
                                }}
                            >
                                +{formatOG(tx.amount, 6)} 0G
                            </span>
                        }
                    />
                </dl>

                <p style={{ color: "var(--ink-soft)", marginTop: 20, fontSize: 14 }}>
                    Royalty was distributed atomically as part of the inference settlement
                    transaction. The cascade walked the lineage tree, deduplicated multi-path
                    ancestors, and paid every owner in the same block.
                </p>
            </div>
        </>
    );
}

function ModalDL({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 16,
                padding: "10px 0",
            }}
        >
            <dt
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                }}
            >
                {label}
            </dt>
            <dd style={{ margin: 0, color: "var(--ink)" }}>{value}</dd>
        </div>
    );
}
