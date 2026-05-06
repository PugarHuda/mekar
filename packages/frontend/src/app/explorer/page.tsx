"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Bloom } from "@/components/Bloom";
import { useLineageData, type LineageNode } from "@/hooks/useLineageData";
import { isDeployed } from "@/contracts/addresses";
import { explorerLink } from "@/lib/chains";
import { shortAddress, formatTimeAgo } from "@/lib/utils";
import { Loader2, Search, ExternalLink } from "lucide-react";

type Filter = "All" | "Genesis" | "Forks" | "Composed";
const FILTERS: Filter[] = ["All", "Genesis", "Forks", "Composed"];

export default function ExplorerPage() {
    const { nodes, edges, isLoading, totalAgents } = useLineageData();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("All");
    const [selected, setSelected] = useState<LineageNode | null>(null);
    const [zoom, setZoom] = useState(1);

    const positioned = useMemo(() => layoutGarden(nodes, edges), [nodes, edges]);

    const visible = positioned.filter((n) => {
        if (filter === "Genesis" && n.parents.length !== 0) return false;
        if (filter === "Forks" && n.parents.length !== 1) return false;
        if (filter === "Composed" && n.parents.length < 2) return false;
        if (!search) return true;
        const haystack = `${n.id} ${n.creator ?? ""} ${n.owner ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
    });
    const visibleIds = new Set(visible.map((n) => n.id));

    const connectors = positioned.flatMap((n) => {
        if (!n.parents || n.parents.length === 0) return [];
        return n.parents
            .filter((p) => visibleIds.has(p) && visibleIds.has(n.id))
            .map((p) => {
                const parent = positioned.find((x) => x.id === p);
                if (!parent) return null;
                return {
                    key: `${p}-${n.id}`,
                    from: { x: parent.x, y: parent.y + 6 },
                    to: { x: n.x, y: n.y - 6 },
                };
            })
            .filter(Boolean) as Array<{
            key: string;
            from: { x: number; y: number };
            to: { x: number; y: number };
        }>;
    });

    const genesisCount = positioned.filter((n) => n.parents.length === 0).length;

    return (
        <div>
            <Header />
            <main className="explorer-page" style={{ padding: "var(--pad-section) 0" }}>
                <div className="container">
                    <header
                        style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: 24,
                            alignItems: "end",
                            marginBottom: 40,
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <span className="eyebrow">/explorer</span>
                            <h1
                                style={{
                                    fontSize: "clamp(48px, 6vw, 80px)",
                                    marginTop: 12,
                                }}
                            >
                                The Lineage <em>Garden.</em>
                            </h1>
                            <p style={{ color: "var(--ink-soft)", marginTop: 12, maxWidth: "60ch" }}>
                                {totalAgents} agents bloomed · {genesisCount} genesis lineages ·
                                live data from 0G Galileo testnet.
                            </p>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 16,
                                fontFamily: "var(--mono)",
                                fontSize: 12,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "var(--ink-soft)",
                            }}
                        >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: "#d4a437",
                                        border: "1px solid var(--cocoa)",
                                    }}
                                />
                                Genesis
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: "#f5b7a0",
                                        border: "1px solid var(--cocoa)",
                                    }}
                                />
                                Fork
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span
                                    style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: "#c25a4a",
                                        border: "1px solid var(--cocoa)",
                                    }}
                                />
                                Composed
                            </span>
                        </div>
                    </header>

                    {!isDeployed && <NotDeployedNotice />}

                    {isDeployed && (
                        <>
                            <div className="explorer-frame">
                                <div
                                    className="explorer-frame__top"
                                    style={{ flexWrap: "wrap", gap: 12 }}
                                >
                                    <div className="explorer-search">
                                        <Search size={14} style={{ opacity: 0.6 }} />
                                        <input
                                            placeholder="Search by name, hash, or 0x address…"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="explorer-pills">
                                        {FILTERS.map((f) => (
                                            <button
                                                key={f}
                                                className={`pill ${filter === f ? "active" : ""}`}
                                                onClick={() => setFilter(f)}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 8,
                                            border: "1px solid var(--rule)",
                                            borderRadius: 999,
                                            padding: "4px 10px",
                                            fontFamily: "var(--mono)",
                                            fontSize: 12,
                                            background: "var(--surface)",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))
                                            }
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "var(--ink)",
                                                fontSize: 16,
                                                width: 18,
                                                cursor: "pointer",
                                            }}
                                        >
                                            −
                                        </button>
                                        <span>{Math.round(zoom * 100)}%</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))
                                            }
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "var(--ink)",
                                                fontSize: 16,
                                                width: 18,
                                                cursor: "pointer",
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className="explorer-canvas"
                                    style={{
                                        height: 600,
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    {isLoading ? (
                                        <div
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Loader2
                                                className="animate-spin"
                                                size={32}
                                                color="var(--gold-deep)"
                                            />
                                        </div>
                                    ) : visible.length === 0 ? (
                                        <div
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "var(--ink-soft)",
                                                fontStyle: "italic",
                                                fontFamily: "var(--display)",
                                                fontSize: 24,
                                                textAlign: "center",
                                                padding: 40,
                                            }}
                                        >
                                            {totalAgents === 0
                                                ? "An empty garden. Plant the first seed."
                                                : "No blooms in this filter. Try another petal."}
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                position: "relative",
                                                width: "100%",
                                                height: "100%",
                                                transform: `scale(${zoom})`,
                                                transformOrigin: "top left",
                                                transition: "transform 220ms ease",
                                            }}
                                        >
                                            <svg
                                                className="connectors"
                                                preserveAspectRatio="none"
                                                viewBox="0 0 100 100"
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    width: "100%",
                                                    height: "100%",
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                {connectors.map((c) => {
                                                    const mx = (c.from.x + c.to.x) / 2;
                                                    const cy = (c.from.y + c.to.y) / 2;
                                                    return (
                                                        <g key={c.key}>
                                                            <path
                                                                d={`M ${c.from.x} ${c.from.y} Q ${mx} ${cy + 4}, ${c.to.x} ${c.to.y}`}
                                                                fill="none"
                                                                stroke="#3d2817"
                                                                strokeWidth="0.32"
                                                                opacity="0.7"
                                                                vectorEffect="non-scaling-stroke"
                                                            />
                                                            <ellipse
                                                                cx={mx}
                                                                cy={cy + 2}
                                                                rx="1.2"
                                                                ry="0.6"
                                                                fill="#6b8a4b"
                                                                stroke="#3d2817"
                                                                strokeWidth="0.15"
                                                                opacity="0.85"
                                                                vectorEffect="non-scaling-stroke"
                                                            />
                                                        </g>
                                                    );
                                                })}
                                            </svg>

                                            {visible.map((n) => {
                                                const kind =
                                                    n.parents.length === 0
                                                        ? "genesis"
                                                        : n.parents.length === 1
                                                          ? "fork"
                                                          : "compose";
                                                return (
                                                    <button
                                                        key={n.id}
                                                        type="button"
                                                        className="tree-node"
                                                        style={{
                                                            left: `${n.x}%`,
                                                            top: `${n.y}%`,
                                                            background: "transparent",
                                                            border: "none",
                                                            padding: 0,
                                                        }}
                                                        onClick={() => setSelected(n)}
                                                    >
                                                        <Bloom
                                                            kind={kind}
                                                            seed={String(n.id)}
                                                            size={
                                                                kind === "genesis"
                                                                    ? 110
                                                                    : kind === "compose"
                                                                      ? 92
                                                                      : 72
                                                            }
                                                            sw={1.1}
                                                        />
                                                        <span className="tree-node__label">
                                                            #{n.id}
                                                            <span className="tree-node__hash">
                                                                gen {n.generation}
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selected && (
                                <AgentSlideover
                                    node={selected}
                                    onClose={() => setSelected(null)}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

/* ─────────────── Slideover with agent detail ─────────────── */

function AgentSlideover({ node, onClose }: { node: LineageNode; onClose: () => void }) {
    const kind =
        node.parents.length === 0 ? "genesis" : node.parents.length === 1 ? "fork" : "compose";

    return (
        <>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close detail"
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,12,9,0.4)",
                    backdropFilter: "blur(2px)",
                    border: "none",
                    cursor: "pointer",
                    zIndex: 60,
                }}
            />
            <aside
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: "min(480px, 100vw)",
                    background: "var(--surface)",
                    borderLeft: "1.5px solid var(--cocoa)",
                    boxShadow: "-32px 0 80px -32px rgba(61, 40, 23, 0.35)",
                    padding: "32px 36px",
                    overflowY: "auto",
                    zIndex: 70,
                    animation: "fade-in 220ms ease-out",
                }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                        position: "absolute",
                        top: 18,
                        right: 18,
                        background: "transparent",
                        border: "1px solid var(--rule)",
                        borderRadius: "50%",
                        width: 32,
                        height: 32,
                        cursor: "pointer",
                        color: "var(--ink)",
                        fontSize: 18,
                        lineHeight: 1,
                    }}
                >
                    ×
                </button>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                    <Bloom kind={kind} seed={String(node.id)} size={160} sw={1.4} />
                </div>

                <span className="eyebrow">
                    {kind === "genesis" ? "Genesis bloom" : kind === "fork" ? "Fork" : "Composed"}
                </span>
                <h2 style={{ marginTop: 8, fontSize: 36 }}>Agent #{node.id}</h2>

                <code
                    style={{
                        display: "block",
                        fontFamily: "var(--mono)",
                        fontSize: 12,
                        color: "var(--ink-soft)",
                        marginTop: 8,
                        marginBottom: 18,
                        letterSpacing: "0.04em",
                    }}
                >
                    Generation {node.generation} · created {formatTimeAgo(node.createdAt)}
                </code>

                <p
                    style={{
                        color: "var(--ink-soft)",
                        marginBottom: 24,
                        maxWidth: "60ch",
                    }}
                >
                    {kind === "genesis"
                        ? "A foundational bloom — the seed of its lineage. Every fork that descends from it inherits a share of the royalty cascade."
                        : kind === "fork"
                          ? `A fine-tune of agent #${node.parents[0]}. Inference earnings split with the parent and any further ancestors.`
                          : `A composed bloom merged from ${node.parents.length} parents. Royalty obligations carry forward to every ancestor.`}
                </p>

                <dl
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                        margin: 0,
                        padding: "20px 0",
                        borderTop: "1px solid var(--rule)",
                        borderBottom: "1px solid var(--rule)",
                    }}
                >
                    <DLRow label="Owner">
                        <Link
                            href={explorerLink(node.owner ?? node.creator, "address")}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                color: "var(--ink)",
                                fontFamily: "var(--mono)",
                                fontSize: 13,
                                textDecoration: "underline",
                                textDecorationColor: "var(--rule)",
                            }}
                        >
                            {shortAddress(node.owner ?? node.creator, 4)}
                        </Link>
                    </DLRow>
                    <DLRow label="Generation">{node.generation}</DLRow>
                    <DLRow label="Alignment">
                        {(node.alignmentHealth / 100).toFixed(1)}%
                    </DLRow>
                    <DLRow label="Mode">
                        {["Strict", "Voluntary", "Audit-Only"][node.mode] ?? "Unknown"}
                    </DLRow>
                </dl>

                {node.parents.length > 0 && (
                    <div style={{ marginTop: 20 }}>
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
                            Parents
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {node.parents.map((p) => (
                                <Link
                                    key={p}
                                    href={`/agent/${p}`}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "6px 12px",
                                        border: "1px solid var(--rule)",
                                        borderRadius: 999,
                                        fontFamily: "var(--mono)",
                                        fontSize: 12,
                                        color: "var(--ink)",
                                        background: "var(--bg-alt)",
                                    }}
                                >
                                    ← #{p}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        marginTop: 28,
                        flexWrap: "wrap",
                    }}
                >
                    <Link href={`/agent/${node.id}`} className="btn">
                        Open agent →
                    </Link>
                    <Link
                        href={explorerLink(
                            node.weightsPointer ?? "0x",
                            "address"
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn--ghost"
                    >
                        View on 0G <ExternalLink size={14} />
                    </Link>
                </div>
            </aside>
        </>
    );
}

function DLRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginBottom: 4,
                }}
            >
                {label}
            </dt>
            <dd
                style={{
                    margin: 0,
                    fontFamily: "var(--display)",
                    fontStyle: "italic",
                    fontSize: 22,
                    color: "var(--ink)",
                }}
            >
                {children}
            </dd>
        </div>
    );
}

function NotDeployedNotice() {
    return (
        <div
            style={{
                border: "1.5px solid var(--rule)",
                background: "var(--bg-alt)",
                padding: "48px 32px",
                textAlign: "center",
                borderRadius: "var(--radius)",
            }}
        >
            <h2 style={{ fontSize: 32, marginBottom: 12 }}>
                Contracts not deployed yet.
            </h2>
            <p style={{ color: "var(--ink-soft)" }}>
                Run the deploy script against 0G Galileo, then update <code>.env</code> with the
                new addresses.
            </p>
        </div>
    );
}

/* ─────────────── Garden layout (depth × siblings) ─────────────── */

type Positioned = LineageNode & { x: number; y: number };

function layoutGarden(nodes: LineageNode[], _edges: { source: number; target: number }[]): Positioned[] {
    if (nodes.length === 0) return [];

    // Group by generation
    const byGen = new Map<number, LineageNode[]>();
    for (const n of nodes) {
        const arr = byGen.get(n.generation) ?? [];
        arr.push(n);
        byGen.set(n.generation, arr);
    }
    const maxGen = Math.max(...byGen.keys());

    const result: Positioned[] = [];
    for (let gen = 0; gen <= maxGen; gen++) {
        const row = byGen.get(gen) ?? [];
        const yPct = maxGen === 0 ? 50 : 12 + (gen / maxGen) * 76;
        const count = row.length;
        row.forEach((n, idx) => {
            const xPct = count === 1 ? 50 : 12 + (idx / (count - 1)) * 76;
            result.push({ ...n, x: xPct, y: yPct });
        });
    }
    return result;
}
