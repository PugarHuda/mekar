"use client";

import Link from "next/link";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useLineageData, type LineageNode } from "@/hooks/useLineageData";
import { isDeployed } from "@/contracts/addresses";
import { explorerLink } from "@/lib/chains";
import { shortAddress, formatTimeAgo } from "@/lib/utils";
import { Loader2, Search, ExternalLink, Hand, Maximize2 } from "lucide-react";
import type { LineageGardenHandle } from "@/components/LineageGarden";
import { Bloom } from "@/components/Bloom";

/**
 * LineageGarden pulls in D3 (~the heaviest dep on this route). It's
 * lazy-loaded so the chunk only downloads when the graph actually
 * renders — i.e. on desktop. Mobile shows MobileLineageList instead
 * and never triggers this import, so phone users skip the entire D3
 * payload. React.lazy forwards the ref correctly because the module
 * export is a forwardRef component; we adapt the named export to the
 * default-export shape lazy expects.
 */
const LineageGarden = lazy(() =>
    import("@/components/LineageGarden").then((m) => ({ default: m.LineageGarden }))
);
import {
    agentName,
    agentFocus,
    agentCategory,
    CATEGORY_LABELS,
    type AgentCategory,
} from "@/lib/agentNaming";

/**
 * Track viewport width via matchMedia. The D3 force graph chokes
 * on small screens — both because of layout (600px tall + zoom
 * controls compete with thumb area) and because force simulation
 * over 50+ nodes is expensive on mid-tier Android. Returning true
 * here flips the explorer into a list view that scales better.
 */
function useIsNarrow(maxWidth = 700): boolean {
    // SSR-safe default: assume wide. Hydration sets the real value.
    const [narrow, setNarrow] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
        const update = () => setNarrow(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, [maxWidth]);
    return narrow;
}

type Filter = "All" | "Genesis" | "Forks" | "Composed";
const FILTERS: Filter[] = ["All", "Genesis", "Forks", "Composed"];

type CategoryFilter = "all" | AgentCategory;
const CATEGORY_FILTERS: CategoryFilter[] = [
    "all",
    "translate",
    "code",
    "math",
    "vision",
    "retrieval",
    "reasoning",
    "general",
];

export default function ExplorerPage() {
    const { nodes, edges, isLoading, totalAgents } = useLineageData();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("All");
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [selected, setSelected] = useState<LineageNode | null>(null);
    const gardenRef = useRef<LineageGardenHandle>(null);
    const isNarrow = useIsNarrow();

    const visible = nodes.filter((n) => {
        // Kind filter (genesis/fork/composed)
        if (filter === "Genesis" && n.parents.length !== 0) return false;
        if (filter === "Forks" && n.parents.length !== 1) return false;
        if (filter === "Composed" && n.parents.length < 2) return false;

        // Category filter (translate/code/vision/...)
        if (categoryFilter !== "all") {
            const cat = agentCategory(n.id, n.parents.length);
            if (cat !== categoryFilter) return false;
        }

        // Search — id, owner/creator address, AND synthesised name + focus
        if (!search) return true;
        const name = agentName(n.id, n.parents.length).toLowerCase();
        const focus = agentFocus(n.id, n.parents.length).toLowerCase();
        const haystack =
            `${n.id} ${n.creator ?? ""} ${n.owner ?? ""} ${name} ${focus}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
    });
    const visibleIds = new Set(visible.map((n) => n.id));
    const visibleEdges = edges.filter(
        (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );

    const genesisCount = nodes.filter((n) => n.parents.length === 0).length;

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
                                            placeholder="Search name, focus, hash, or 0x address…"
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
                                            onClick={() => gardenRef.current?.zoomOut()}
                                            aria-label="Zoom out"
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
                                        <span>zoom</span>
                                        <button
                                            type="button"
                                            onClick={() => gardenRef.current?.zoomIn()}
                                            aria-label="Zoom in"
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
                                        <span
                                            aria-hidden
                                            style={{
                                                width: 1,
                                                height: 14,
                                                background: "var(--rule)",
                                                margin: "0 2px",
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => gardenRef.current?.reset()}
                                            aria-label="Reset view"
                                            title="Reset zoom + pan"
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "var(--ink)",
                                                cursor: "pointer",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                padding: 0,
                                            }}
                                        >
                                            <Maximize2 size={13} />
                                        </button>
                                    </div>
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontFamily: "var(--mono)",
                                            fontSize: 11,
                                            letterSpacing: "0.06em",
                                            color: "var(--ink-soft)",
                                        }}
                                    >
                                        <Hand size={12} /> drag a bloom · scroll empty area to pan
                                        · ⌘/ctrl+scroll to zoom
                                    </span>
                                </div>

                                {/* Secondary filter row — capability category.
                                    Orthogonal to the kind pills above: a Genesis
                                    can be Code, a Fork can be Translate, a Compose
                                    can be Multi-modal. */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 6,
                                        padding: "10px 16px",
                                        borderTop: "1px solid var(--rule)",
                                        background: "var(--bg-alt)",
                                        alignItems: "center",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "var(--mono)",
                                            fontSize: 10.5,
                                            letterSpacing: "0.16em",
                                            textTransform: "uppercase",
                                            color: "var(--ink-soft)",
                                            marginRight: 8,
                                        }}
                                    >
                                        Capability
                                    </span>
                                    {CATEGORY_FILTERS.map((c) => {
                                        const label =
                                            c === "all" ? "All" : CATEGORY_LABELS[c];
                                        const active = categoryFilter === c;
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setCategoryFilter(c)}
                                                className={`pill ${active ? "active" : ""}`}
                                                style={{ fontSize: 11.5, padding: "3px 10px" }}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
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
                                    ) : isNarrow ? (
                                        <MobileLineageList
                                            nodes={visible}
                                            onSelect={setSelected}
                                            selectedId={selected?.id ?? null}
                                        />
                                    ) : (
                                        <Suspense
                                            fallback={
                                                <div
                                                    style={{
                                                        height: 600,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 10,
                                                        color: "var(--ink-soft)",
                                                        fontFamily: "var(--mono)",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    <Loader2
                                                        className="animate-spin"
                                                        size={16}
                                                    />
                                                    Loading the garden…
                                                </div>
                                            }
                                        >
                                            <LineageGarden
                                                ref={gardenRef}
                                                nodes={visible}
                                                edges={visibleEdges}
                                                onSelect={setSelected}
                                                selectedId={selected?.id ?? null}
                                                height={600}
                                            />
                                        </Suspense>
                                    )}
                                </div>
                            </div>

                            {selected && (
                                <AgentSlideover
                                    node={selected}
                                    nodes={nodes}
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

function AgentSlideover({
    node,
    nodes,
    onClose,
}: {
    node: LineageNode;
    nodes: LineageNode[];
    onClose: () => void;
}) {
    const kind =
        node.parents.length === 0 ? "genesis" : node.parents.length === 1 ? "fork" : "compose";
    const name = agentName(node.id, node.parents.length);
    const focus = agentFocus(node.id, node.parents.length);

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
                    {kind === "genesis" ? "Genesis bloom" : kind === "fork" ? "Fork" : "Composed"}{" "}
                    · {focus}
                </span>
                <h2 style={{ marginTop: 8, fontSize: 36 }}>{name}</h2>

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
                    Token #{node.id} · gen {node.generation} · created{" "}
                    {formatTimeAgo(node.createdAt)}
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
                            {node.parents.map((p) => {
                                const parentNode = nodes.find((n) => n.id === p);
                                const parentLabel = parentNode
                                    ? agentName(p, parentNode.parents.length)
                                    : `Token #${p}`;
                                return (
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
                                        ← {parentLabel}
                                    </Link>
                                );
                            })}
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

/**
 * Phone-shaped list view of the lineage. Each agent renders as a row
 * with bloom preview, name, capability + gen badges, and the steward
 * address. Tap → opens the same slideover the desktop garden does.
 *
 * We deliberately don't try to render edges here — on a 360px screen the
 * graph would be unreadable. Users who want the topology can rotate to
 * landscape or open the desktop view; the list still surfaces every
 * node, just laid out vertically.
 */
function MobileLineageList({
    nodes,
    onSelect,
    selectedId,
}: {
    nodes: LineageNode[];
    onSelect: (n: LineageNode) => void;
    selectedId: number | null;
}) {
    // Sort newest first — mobile users skimming the list usually care
    // about recent activity over total mass.
    const sorted = [...nodes].sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 10,
            }}
        >
            {sorted.map((n) => {
                const parentCount = n.parents.length;
                const kind: "genesis" | "fork" | "compose" =
                    parentCount === 0 ? "genesis" : parentCount === 1 ? "fork" : "compose";
                const name = agentName(n.id, parentCount);
                const focus = agentFocus(n.id, parentCount);
                const cat = CATEGORY_LABELS[agentCategory(n.id, parentCount)];
                const active = selectedId === n.id;
                return (
                    <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelect(n)}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "56px 1fr",
                            gap: 12,
                            padding: 12,
                            alignItems: "center",
                            background: active ? "var(--gold)" : "var(--surface)",
                            border: active
                                ? "1.5px solid var(--cocoa)"
                                : "1px solid var(--rule)",
                            borderRadius: "var(--radius)",
                            cursor: "pointer",
                            textAlign: "left",
                            color: "var(--ink)",
                            fontFamily: "inherit",
                        }}
                    >
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                display: "grid",
                                placeItems: "center",
                            }}
                        >
                            <Bloom kind={kind} seed={String(n.id)} size={56} sw={1.2} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div
                                style={{
                                    fontFamily: "var(--display)",
                                    fontStyle: "italic",
                                    fontSize: 18,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {name}
                            </div>
                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 10.5,
                                    color: active ? "var(--cocoa)" : "var(--ink-soft)",
                                    marginTop: 3,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                }}
                            >
                                {cat} · {focus}
                            </div>
                            <div
                                style={{
                                    fontFamily: "var(--mono)",
                                    fontSize: 10,
                                    color: active ? "var(--cocoa)" : "var(--ink-soft)",
                                    opacity: 0.7,
                                    marginTop: 4,
                                }}
                            >
                                #{n.id} · gen {n.generation}
                                {n.owner && ` · ${shortAddress(n.owner, 4)}`}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

