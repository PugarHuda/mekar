"use client";

import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Bloom } from "@/components/Bloom";
import { useLineageData } from "@/hooks/useLineageData";
import {
    agentName,
    agentCategory,
    CATEGORY_LABELS,
} from "@/lib/agentNaming";
import { shortAddress } from "@/lib/utils";

type Mode = "earners" | "growing" | "forked" | "fresh";

const MODES: { id: Mode; label: string; copy: string }[] = [
    { id: "earners", label: "Top earners", copy: "Highest lifetime royalty distributed (24h)." },
    { id: "growing", label: "Fastest growing", copy: "Steepest week-over-week inference growth." },
    { id: "forked", label: "Most forked", copy: "Genesis blooms with the deepest lineage trees." },
    { id: "fresh", label: "Freshly bloomed", copy: "Newest agents minted in the last 72 hours." },
];

export default function TrendingPage() {
    const [mode, setMode] = useState<Mode>("earners");
    const { nodes, isLoading } = useLineageData();

    // Sort by mode (procedural until we have indexer data)
    const sorted = [...nodes].sort((a, b) => {
        if (mode === "fresh") return b.createdAt - a.createdAt;
        if (mode === "forked") return b.id - a.id;
        return b.alignmentHealth - a.alignmentHealth;
    });

    const podium = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    return (
        <div>
            <Header />
            <main style={{ padding: "var(--pad-section) 0" }}>
                <div className="container">
                    <header style={{ marginBottom: 48 }}>
                        <span className="eyebrow">/trending</span>
                        <h1 style={{ fontSize: "clamp(48px, 6vw, 80px)", marginTop: 12 }}>
                            What&apos;s <em>blooming</em> this week.
                        </h1>
                        <p style={{ color: "var(--ink-soft)", marginTop: 12, maxWidth: "60ch" }}>
                            A leaderboard of agents on 0G Galileo. Switch view to slice by
                            earnings, growth, lineage depth, or freshness.
                        </p>
                    </header>

                    {/* Mode pills */}
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 32,
                        }}
                    >
                        {MODES.map((m) => (
                            <button
                                key={m.id}
                                className={`pill ${mode === m.id ? "active" : ""}`}
                                onClick={() => setMode(m.id)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <p
                        style={{
                            color: "var(--ink-soft)",
                            marginBottom: 16,
                            fontStyle: "italic",
                            fontFamily: "var(--display)",
                            fontSize: 18,
                        }}
                    >
                        {MODES.find((m) => m.id === mode)?.copy}
                    </p>

                    {/* Honesty note — until a real indexer aggregates
                        RoyaltyPaid events into "top earners" + growth metrics,
                        the ordering here is procedural (alignment health,
                        id, createdAt). Saying so up-front beats letting the
                        user assume these are live royalty rankings. */}
                    <div
                        style={{
                            padding: "10px 14px",
                            border: "1px solid var(--rule)",
                            background: "var(--bg-alt)",
                            borderRadius: 4,
                            fontFamily: "var(--mono)",
                            fontSize: 11.5,
                            color: "var(--ink-soft)",
                            marginBottom: 40,
                            maxWidth: "70ch",
                        }}
                    >
                        <span style={{ color: "var(--cocoa)", fontWeight: 600 }}>
                            UI demo · indexer Phase 2:
                        </span>{" "}
                        rankings are derived from alignment health + token order until a
                        full RoyaltyPaid log aggregator ships. The agent counts above are
                        real on-chain numbers.
                    </div>

                    {/* Stats strip */}
                    <section
                        className="trending-stats"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            border: "1.5px solid var(--cocoa)",
                            background: "var(--surface)",
                            marginBottom: 56,
                        }}
                    >
                        <Stat label="Agents bloomed" big={nodes.length.toString()} />
                        <Stat
                            label="Genesis lineages"
                            big={nodes.filter((n) => n.parents.length === 0).length.toString()}
                        />
                        <Stat
                            label="Composed"
                            big={nodes.filter((n) => n.parents.length >= 2).length.toString()}
                        />
                    </section>

                    {/* Podium */}
                    {!isLoading && podium.length > 0 && (
                        <section
                            className="trending-podium"
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                gap: 24,
                                marginBottom: 56,
                            }}
                        >
                            {podium.map((n, i) => (
                                <Link
                                    key={n.id}
                                    href={`/agent/${n.id}`}
                                    style={{
                                        textDecoration: "none",
                                        color: "var(--ink)",
                                        textAlign: "center",
                                        padding: 24,
                                        border: "1.5px solid var(--cocoa)",
                                        background:
                                            i === 0
                                                ? "var(--gold)"
                                                : i === 1
                                                  ? "var(--bg-alt)"
                                                  : "var(--surface)",
                                        borderRadius: "var(--radius)",
                                        position: "relative",
                                    }}
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 12,
                                            left: 16,
                                            fontFamily: "var(--display)",
                                            fontStyle: "italic",
                                            fontSize: 32,
                                            color: i === 0 ? "var(--cocoa)" : "var(--ink-soft)",
                                        }}
                                    >
                                        {i + 1}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "center" }}>
                                        <Bloom
                                            kind={
                                                n.parents.length === 0
                                                    ? "genesis"
                                                    : n.parents.length === 1
                                                      ? "fork"
                                                      : "compose"
                                            }
                                            seed={String(n.id)}
                                            size={i === 0 ? 140 : 100}
                                            sw={1.4}
                                        />
                                    </div>
                                    <h3 style={{ marginTop: 16, fontSize: 24 }}>
                                        {agentName(n.id, n.parents.length)}
                                    </h3>
                                    <code
                                        style={{
                                            fontFamily: "var(--mono)",
                                            fontSize: 11,
                                            color: i === 0 ? "var(--cocoa)" : "var(--ink-soft)",
                                            letterSpacing: "0.06em",
                                            display: "block",
                                            marginTop: 4,
                                        }}
                                    >
                                        {CATEGORY_LABELS[agentCategory(n.id, n.parents.length)]} ·
                                        gen {n.generation} ·{" "}
                                        {(n.alignmentHealth / 100).toFixed(0)}% aligned
                                    </code>
                                    <code
                                        style={{
                                            fontFamily: "var(--mono)",
                                            fontSize: 10,
                                            color: i === 0 ? "var(--cocoa)" : "var(--ink-soft)",
                                            display: "block",
                                            marginTop: 4,
                                            opacity: 0.7,
                                        }}
                                    >
                                        owner {shortAddress(n.owner ?? n.creator, 4)}
                                    </code>
                                </Link>
                            ))}
                        </section>
                    )}

                    {/* Leaderboard table — horizontal scroll wrapper for narrow viewports */}
                    {!isLoading && rest.length > 0 && (
                        <div className="trending-table-wrap">
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontFamily: "var(--mono)",
                                fontSize: 13,
                                minWidth: 720,
                            }}
                        >
                            <thead
                                style={{
                                    borderBottom: "1.5px solid var(--cocoa)",
                                    fontFamily: "var(--mono)",
                                    fontSize: 11,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-soft)",
                                    textAlign: "left",
                                }}
                            >
                                <tr>
                                    <th style={{ padding: 14, width: 60 }}>#</th>
                                    <th style={{ padding: 14 }}>Agent</th>
                                    <th style={{ padding: 14 }}>Capability</th>
                                    <th style={{ padding: 14 }}>Kind</th>
                                    <th style={{ padding: 14 }}>Owner</th>
                                    <th style={{ padding: 14 }}>Alignment</th>
                                    <th style={{ padding: 14 }}>Gen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rest.map((n, i) => (
                                    <tr
                                        key={n.id}
                                        style={{ borderBottom: "1px solid var(--rule)" }}
                                    >
                                        <td
                                            style={{
                                                padding: 14,
                                                color: "var(--ink-soft)",
                                            }}
                                        >
                                            {i + 4}
                                        </td>
                                        <td style={{ padding: 14 }}>
                                            <Link
                                                href={`/agent/${n.id}`}
                                                style={{
                                                    color: "var(--ink)",
                                                    textDecoration: "underline",
                                                    textDecorationColor: "var(--rule)",
                                                }}
                                            >
                                                {agentName(n.id, n.parents.length)}
                                            </Link>
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    color: "var(--ink-soft)",
                                                    marginTop: 2,
                                                    opacity: 0.7,
                                                }}
                                            >
                                                #{n.id}
                                            </div>
                                        </td>
                                        <td style={{ padding: 14, color: "var(--ink-soft)" }}>
                                            {CATEGORY_LABELS[
                                                agentCategory(n.id, n.parents.length)
                                            ]}
                                        </td>
                                        <td style={{ padding: 14, color: "var(--ink-soft)" }}>
                                            {n.parents.length === 0
                                                ? "Genesis"
                                                : n.parents.length === 1
                                                  ? "Fork"
                                                  : "Composed"}
                                        </td>
                                        <td
                                            style={{
                                                padding: 14,
                                                color: "var(--ink-soft)",
                                                fontSize: 12,
                                            }}
                                        >
                                            {shortAddress(n.owner ?? n.creator, 4)}
                                        </td>
                                        <td style={{ padding: 14 }}>
                                            {(n.alignmentHealth / 100).toFixed(0)}%
                                        </td>
                                        <td style={{ padding: 14, color: "var(--ink-soft)" }}>
                                            {n.generation}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}

                    {!isLoading && nodes.length === 0 && (
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
                            No blooms have settled on chain yet. The leaderboard fills as the
                            garden grows.
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

function Stat({ label, big }: { label: string; big: string }) {
    return (
        <div style={{ padding: 24, borderRight: "1.5px solid var(--cocoa)" }}>
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
                    fontFamily: "var(--display)",
                    fontStyle: "italic",
                    fontSize: 40,
                    color: "var(--ink)",
                    marginTop: 8,
                }}
            >
                {big}
            </div>
        </div>
    );
}
