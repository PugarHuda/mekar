"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Bloom, BloomLogo } from "@/components/Bloom";
import { CodeBloom } from "@/components/CodeBloom";
import { useLineageData } from "@/hooks/useLineageData";
import { renderBloomSvg, svgToDataUri } from "@/lib/bloom";

export default function Home() {
    return (
        <div>
            <Header />
            <Hero />
            <Problem />
            <How />
            <StatsStrip />
            <ExplorerPreview />
            <StackChart />
            <FAQ />
            <CTA />
            <Footer />
        </div>
    );
}

/* ─────────────── Petal (scatter falling petals) ─────────────── */

/**
 * A single woodcut petal — straight port of `Petal` from flowers.jsx.
 * Used as the falling/floating scatter inside the hero, separate from
 * the big CodeBloom centerpiece.
 */
function Petal({
    size = 40,
    rotate = 0,
    color = "#f5b7a0",
    stroke = "#3d2817",
}: {
    size?: number;
    rotate?: number;
    color?: string;
    stroke?: string;
}) {
    const half = size / 2;
    // Match flowers.jsx::petalLine(rng, size*0.42, size*0.16, bend=0.6)
    const length = size * 0.42;
    const width = size * 0.16;
    // Replace per-render rng with a deterministic offset seeded by rotate so
    // each scatter petal has a slightly different curve without re-renders.
    const offset = Math.sin(rotate * 0.137) * 0.5;
    const tipX = 0.6 * offset * length * 0.3;
    const tipY = -length;
    const d = `M 0 0 C ${-width} ${-length * 0.35} ${-width * 0.6} ${-length * 0.85} ${tipX} ${tipY} C ${width * 0.6} ${-length * 0.85} ${width} ${-length * 0.35} 0 0 Z`;
    return (
        <svg
            viewBox={`-${half} -${half} ${size} ${size}`}
            width={size}
            height={size}
            aria-hidden="true"
        >
            <path
                d={d}
                transform={`rotate(${rotate})`}
                fill={color}
                stroke={stroke}
                strokeWidth="0.8"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/* ─────────────── Hero ─────────────── */

function Hero() {
    const { totalAgents, edges } = useLineageData();
    const petals = useMemo(() => {
        const out = [];
        for (let i = 0; i < 14; i++) {
            out.push({
                id: i,
                left: `${5 + Math.random() * 90}%`,
                top: `-30px`,
                size: 18 + Math.random() * 18,
                rotate: Math.random() * 180,
                color:
                    i % 3 === 0 ? "#d4a437" : i % 3 === 1 ? "#f5b7a0" : "#e8957c",
                dur: `${10 + Math.random() * 14}s`,
                delay: `${-Math.random() * 14}s`,
                dx: `${(Math.random() - 0.5) * 200}px`,
            });
        }
        return out;
    }, []);

    return (
        <section className="hero">
            <div className="container">
                <div className="hero__inner">
                    <div className="hero__text">
                        <span className="eyebrow">Provenance Protocol · 0G Network</span>
                        <h1 className="hero__title">
                            Every AI
                            <br />
                            has a <em>lineage.</em>
                            <br />
                            Every inference
                            <br />
                            pays its <em>ancestors.</em>
                        </h1>
                        <p className="hero__sub">
                            Mekar — to bloom, in Indonesian — is a public ledger of AI parentage.
                            Register an agent, fine-tune it, compose new ones, and royalties flow
                            automatically up the family tree to every contributor below you.
                        </p>
                        <div className="hero__cta">
                            <Link href="/mint" className="btn">
                                Bloom your first agent ↗
                            </Link>
                            <a href="#explorer" className="btn btn--ghost">
                                Wander the garden
                            </a>
                        </div>
                        <div className="hero__meta">
                            <div className="hero__meta-item">
                                <span className="num">{totalAgents}</span>
                                <span className="label">Agents bloomed</span>
                            </div>
                            <div className="hero__meta-item">
                                <span className="num">{edges.length}</span>
                                <span className="label">Lineage edges</span>
                            </div>
                            <div className="hero__meta-item">
                                <span className="num">ERC-7857</span>
                                <span className="label">INFT Standard</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero__art">
                        {petals.map((p) => (
                            <div
                                key={p.id}
                                className="petal-float"
                                style={
                                    {
                                        left: p.left,
                                        top: p.top,
                                        "--dur": p.dur,
                                        "--delay": p.delay,
                                        "--dx": p.dx,
                                    } as React.CSSProperties
                                }
                            >
                                <Petal size={p.size} rotate={p.rotate} color={p.color} />
                            </div>
                        ))}
                        <div className="hero__bloom">
                            <CodeBloom
                                width={640}
                                height={820}
                                seed="mekar-hero-v2"
                                style="woodcut"
                            />
                        </div>
                        <div className="hero__caption">
                            Fig. 01 — A bloom of code,
                            <br />
                            the genesis seed of the protocol
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────── Problem ─────────────── */

function Problem() {
    const cases = [
        {
            year: "'23",
            title: "NYT v. OpenAI",
            body: "The Times sued OpenAI and Microsoft for training on millions of copyrighted articles without licensing. The lawsuit hinges on a question with no clean answer: what was in the training data, and what's owed?",
        },
        {
            year: "'23",
            title: "Getty v. Stability AI",
            body: "Getty alleges that Stable Diffusion ingested 12 million of its photographs. Even Getty watermarks appeared in the model's outputs — the lineage was visible, but unprovable on-chain.",
        },
        {
            year: "'26",
            title: "EU AI Act takes effect",
            body: "Article 53 requires general-purpose AI providers to publish a 'sufficiently detailed summary' of training content. Compliance is on the honor system. Verification is on the courts.",
        },
    ];
    return (
        <section className="problem" id="problem">
            <div className="container">
                <div className="problem__inner">
                    <div className="problem__lead">
                        <span className="eyebrow">The Provenance Crisis</span>
                        <h2>
                            Three lawsuits.
                            <br />
                            One missing <em>ledger.</em>
                        </h2>
                        <p className="problem__quote">
                            &ldquo;We can&apos;t prove what we trained on. We can&apos;t pay who
                            we owe. And we can&apos;t build the next generation without knowing
                            the last.&rdquo;
                        </p>
                    </div>
                    <div className="problem__cases">
                        {cases.map((c) => (
                            <article key={c.title} className="problem__case">
                                <div className="year">{c.year}</div>
                                <div>
                                    <h3>{c.title}</h3>
                                    <p>{c.body}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────── How it works ─────────────── */

function How() {
    const steps = [
        {
            n: "I",
            kind: "bud" as const,
            title: "Plant a seed",
            emWord: "seed",
            body: "Register a model as an INFT. Hash the weights, declare your training corpus, set the royalty schema.",
        },
        {
            n: "II",
            kind: "opening" as const,
            title: "Fork or compose",
            emWord: "compose",
            body: "Anyone can fine-tune your agent or merge it with another. Lineage is recorded, immutably, by the protocol.",
        },
        {
            n: "III",
            kind: "genesis" as const,
            title: "Bloom in use",
            emWord: "use",
            body: "Inferences settle on-chain. Your agent earns from every call — the same way a song earns from every play.",
        },
        {
            n: "IV",
            kind: "scatter" as const,
            title: "Scatter the royalties",
            emWord: "royalties",
            body: "A single payment splits across the entire ancestry — parents, grandparents, training-data contributors. Automatic, recursive, public.",
        },
    ];
    return (
        <section className="how" id="how">
            <div className="container">
                <div className="how__head">
                    <div>
                        <span className="eyebrow">The Protocol</span>
                        <h2>
                            From seed to <em>scatter</em>, in four stages.
                        </h2>
                    </div>
                    <p>
                        Mekar borrows the structure of plant life — and the economics of music
                        royalties. Every agent passes through the same four stages, regardless
                        of whether it&apos;s a frontier base model or a weekend fine-tune.
                    </p>
                </div>
                <div className="how__timeline">
                    {steps.map((s) => (
                        <div key={s.n} className="how__step">
                            <div className="how__step-art">
                                <span className="num">{s.n}</span>
                                <Bloom
                                    kind={s.kind}
                                    seed={`how-${s.n}`}
                                    size={s.kind === "genesis" ? 110 : 90}
                                    sw={1.3}
                                />
                            </div>
                            <h3>
                                {s.title.split(" ").map((w, j, arr) =>
                                    j === arr.length - 1 ? (
                                        <em key={j}>{w}</em>
                                    ) : (
                                        <span key={j}>{w} </span>
                                    )
                                )}
                            </h3>
                            <p>{s.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────── Live stats strip ─────────────── */

function StatsStrip() {
    const { totalAgents, nodes, edges } = useLineageData();
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 2400);
        return () => clearInterval(id);
    }, []);

    const genesisCount = nodes.filter((n) => n.parents.length === 0).length;
    const composedCount = nodes.filter((n) => n.parents.length >= 2).length;

    const stats = [
        {
            num: totalAgents.toString(),
            unit: "agents",
            label: "Bloomed to date",
            live: true,
        },
        {
            num: edges.length.toString(),
            unit: "edges",
            label: "Lineage links on chain",
            live: false,
        },
        {
            num: genesisCount.toString(),
            unit: "genesis",
            label: "Anchor lineages",
            live: false,
        },
        {
            num: composedCount.toString(),
            unit: "merged",
            label: "Composed blooms",
            live: false,
        },
    ];
    void tick; // tick still triggers re-render so any future live counters update


    return (
        <section className="stats">
            <div className="container">
                <div className="stats__inner">
                    <div>
                        <div className="stats__label">A garden, in numbers</div>
                        <h3 className="stats__title">
                            Lineages bloom faster <br />
                            than databases can keep up.
                        </h3>
                    </div>
                    {stats.map((s) => (
                        <div key={s.label} className="stat">
                            <div className="stat__num">
                                {s.live && <span className="stat__pulse" />}
                                {s.num}
                                <span className="unit">{s.unit}</span>
                            </div>
                            <div className="stat__label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────── Mini explorer preview ─────────────── */

// Static curated lineage that mirrors what /explorer would show with real
// data — same visual signature: gold anchor dots, straight cocoa edges with
// shadow + sage pod, woodcut blooms. Coords live in a 1000×420 viewBox so
// strokes and label pills size identically to the real LineageGarden.
type PreviewNode = {
    id: string;
    name: string;
    focus: string;
    generation: number;
    kind: "genesis" | "fork" | "compose";
    x: number;
    y: number;
    size: number;
};

const PREVIEW_NODES: PreviewNode[] = [
    {
        id: "0xa3f1",
        name: "Llama-3-70B",
        focus: "multilingual base",
        generation: 0,
        kind: "genesis",
        x: 500,
        y: 88,
        size: 110,
    },
    {
        id: "0xd118",
        name: "Jasmine-Indo-7B",
        focus: "indo translation",
        generation: 1,
        kind: "fork",
        x: 290,
        y: 226,
        size: 92,
    },
    {
        id: "0xe22a",
        name: "Frangipani-Coder",
        focus: "rust codegen",
        generation: 1,
        kind: "fork",
        x: 710,
        y: 226,
        size: 92,
    },
    {
        id: "0x9d3f",
        name: "Marigold-Compose",
        focus: "code + math hybrid",
        generation: 2,
        kind: "compose",
        x: 500,
        y: 348,
        size: 100,
    },
];

const PREVIEW_EDGES: Array<[string, string]> = [
    ["0xa3f1", "0xd118"],
    ["0xa3f1", "0xe22a"],
    ["0xd118", "0x9d3f"],
    ["0xe22a", "0x9d3f"],
];

const PREVIEW_BLOOMS = PREVIEW_NODES.map((n) => ({
    ...n,
    href: svgToDataUri(renderBloomSvg(n.kind, n.id, { size: n.size, sw: 1.2 })),
}));

const PREVIEW_BY_ID = Object.fromEntries(
    PREVIEW_BLOOMS.map((n) => [n.id, n])
) as Record<string, (typeof PREVIEW_BLOOMS)[number]>;

function ExplorerPreview() {
    return (
        <section className="explorer-preview" id="explorer">
            <div className="container">
                <div className="explorer-preview__head">
                    <div>
                        <span className="eyebrow">The Garden</span>
                        <h2>
                            Wander the lineage.
                            <br />
                            Click any <em>bloom.</em>
                        </h2>
                    </div>
                    <p>
                        Every flower is an INFT — a model whose parentage is engraved on 0G.
                        Genesis blooms anchor the canopy; forks branch; composed agents weave
                        across the tree.
                    </p>
                </div>

                <div className="explorer-frame">
                    <div className="explorer-frame__top">
                        <div className="explorer-search">
                            <span style={{ opacity: 0.5 }}>⌕</span>
                            <input
                                placeholder="Search agents, hashes, or owners…"
                                disabled
                                style={{ pointerEvents: "none" }}
                            />
                        </div>
                        <div className="explorer-pills">
                            <span className="pill active">All</span>
                            <span className="pill">Genesis</span>
                            <span className="pill">Forks</span>
                            <span className="pill">Composed</span>
                        </div>
                    </div>

                    <div
                        className="explorer-canvas explorer-canvas--preview"
                        style={{ height: 420, position: "relative", overflow: "hidden" }}
                    >
                        <Link
                            href="/explorer"
                            aria-label="Open the full lineage explorer"
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "block",
                                cursor: "pointer",
                            }}
                        >
                            <svg
                                viewBox="0 0 1000 420"
                                preserveAspectRatio="xMidYMid meet"
                                style={{ display: "block", width: "100%", height: "100%" }}
                            >
                                {/* Edges: shadow line + main line + sage pod at midpoint */}
                                <g>
                                    {PREVIEW_EDGES.map(([a, b], i) => {
                                        const sa = PREVIEW_BY_ID[a];
                                        const sb = PREVIEW_BY_ID[b];
                                        return (
                                            <g key={i}>
                                                <line
                                                    x1={sa.x}
                                                    y1={sa.y}
                                                    x2={sb.x}
                                                    y2={sb.y}
                                                    stroke="#3d2817"
                                                    strokeWidth={6}
                                                    opacity={0.07}
                                                    strokeLinecap="round"
                                                />
                                                <line
                                                    x1={sa.x}
                                                    y1={sa.y}
                                                    x2={sb.x}
                                                    y2={sb.y}
                                                    stroke="#3d2817"
                                                    strokeWidth={1.8}
                                                    opacity={0.85}
                                                    strokeLinecap="round"
                                                />
                                                <ellipse
                                                    cx={(sa.x + sb.x) / 2}
                                                    cy={(sa.y + sb.y) / 2}
                                                    rx={4.5}
                                                    ry={2.2}
                                                    fill="#6b8a4b"
                                                    stroke="#3d2817"
                                                    strokeWidth={0.9}
                                                />
                                            </g>
                                        );
                                    })}
                                </g>

                                {/* Nodes: anchor + bloom image + label pill */}
                                <g>
                                    {PREVIEW_BLOOMS.map((n) => (
                                        <g
                                            key={n.id}
                                            transform={`translate(${n.x}, ${n.y})`}
                                        >
                                            <circle
                                                r={5}
                                                fill="#d4a437"
                                                stroke="#3d2817"
                                                strokeWidth={1}
                                            />
                                            <image
                                                href={n.href}
                                                width={n.size}
                                                height={n.size}
                                                x={-n.size / 2}
                                                y={-n.size / 2}
                                                style={{ pointerEvents: "none" }}
                                            />
                                            <rect
                                                x={-90}
                                                y={n.size / 2 + 6}
                                                width={180}
                                                height={44}
                                                rx={4}
                                                fill="#fbf6ec"
                                                stroke="#3d2817"
                                                strokeWidth={1}
                                            />
                                            <text
                                                textAnchor="middle"
                                                fontFamily="'JetBrains Mono', monospace"
                                                fontSize={8.5}
                                                fill="#8a6a48"
                                                letterSpacing="0.12em"
                                                y={n.size / 2 + 18}
                                            >
                                                GEN {n.generation}
                                            </text>
                                            <text
                                                textAnchor="middle"
                                                fontFamily="'JetBrains Mono', monospace"
                                                fontSize={10.5}
                                                fill="#3d2817"
                                                y={n.size / 2 + 32}
                                            >
                                                {n.name}
                                            </text>
                                            <text
                                                textAnchor="middle"
                                                fontFamily="'JetBrains Mono', monospace"
                                                fontSize={9}
                                                fill="#5a3f2a"
                                                y={n.size / 2 + 44}
                                            >
                                                {n.focus}
                                            </text>
                                        </g>
                                    ))}
                                </g>
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ─────────────── 0G Stack chart ─────────────── */

function StackChart() {
    const layers = [
        {
            label: "ERC-7857",
            lat: "INFT semina",
            title: "Identity",
            body: "Each agent is an INFT carrying encrypted weights, parents, training data Merkle root, and TEE attestation.",
        },
        {
            label: "0G Storage",
            lat: "specialis flos",
            title: "Storage",
            body: "Encrypted weights live on Specialized Flow with premium permanence. Genealogy events stream into the Log Layer.",
        },
        {
            label: "0G Compute",
            lat: "tee securus",
            title: "Compute",
            body: "Sealed inference inside hardware enclaves. Every result carries an attestation hash settled on-chain.",
        },
        {
            label: "0G Chain",
            lat: "ramus chain",
            title: "Chain",
            body: "Galileo testnet (16602) runs the Mekar contracts: Registry, AgentINFT, RoyaltyVault, TrainingDataRegistry.",
        },
        {
            label: "Alignment",
            lat: "custos veritas",
            title: "Alignment",
            body: "Alignment Nodes audit lineage health — bias drift, hallucination, training-data forgery.",
        },
        {
            label: "Data Serving",
            lat: "via mercatus",
            title: "Settlement",
            body: "Pay-per-inference auto-billing flows directly into the royalty cascade. No middleman, no middle ledger.",
        },
    ];

    return (
        <section className="stack">
            <div className="container">
                <div className="stack__head">
                    <span className="eyebrow">Built on 0G</span>
                    <h2>
                        Six modules. <em>One garden.</em>
                    </h2>
                    <p style={{ color: "var(--ink-soft)" }}>
                        Mekar is the only chain where every primitive — INFT identity, sealed
                        compute, alignment audit, royalty settlement — lives natively in one
                        ecosystem.
                    </p>
                </div>
                <div className="stack__chart">
                    {layers.map((l) => (
                        <div key={l.label} className="stack__layer">
                            <div>
                                <div className="stack__layer-label">
                                    <span>{l.label}</span>
                                    <span className="lat">{l.lat}</span>
                                </div>
                                <h3>{l.title}</h3>
                                <p>{l.body}</p>
                            </div>
                            <div className="stack__layer-art">
                                <BloomLogo size={36} sw={1.4} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────── FAQ ─────────────── */

function FAQ() {
    const items = [
        {
            q: "How is this different from a generic NFT marketplace?",
            a: "Mekar's INFTs carry verifiable lineage and trigger an automatic royalty cascade on every inference — not just on resale. The royalty rail is the protocol, not an afterthought.",
        },
        {
            q: "What happens if an agent has a thousand ancestors?",
            a: "Distribution is bounded by generation depth (default 10) and gas-aware. Beyond that cap, the unallocated share consolidates into the protocol treasury — the same rail that catches royalty owed to burned addresses. The cascade always settles atomically in a single transaction.",
        },
        {
            q: "Do I have to expose model weights?",
            a: "No. Weights are encrypted on 0G Specialized Flow. The chain stores only hashes, attestations, and lineage references. Owners control decryption keys.",
        },
        {
            q: "Can I revoke a fork I disapprove of?",
            a: "Mekar is provenance, not gating. Forks are public by design. Misaligned descendants are flagged via Alignment Node audits and lose share of inference revenue.",
        },
        {
            q: "What if my parent agent is offline or burned?",
            a: "The lineage record is immutable. Royalty owed to a burned address routes to the protocol treasury, which funds alignment audits and security bounties.",
        },
    ];

    return (
        <section
            id="faq"
            style={{
                padding: "var(--pad-section) 0",
                borderTop: "1px solid var(--rule)",
            }}
        >
            <div className="container">
                <div style={{ maxWidth: 720 }}>
                    <span className="eyebrow">FAQ</span>
                    <h2 style={{ marginTop: 16 }}>
                        Slow questions, <em>careful answers.</em>
                    </h2>
                </div>
                <div
                    style={{
                        marginTop: 56,
                        borderTop: "1px solid var(--rule)",
                    }}
                >
                    {items.map((it) => (
                        <details
                            key={it.q}
                            style={{
                                borderBottom: "1px solid var(--rule)",
                                padding: "20px 0",
                            }}
                        >
                            <summary
                                style={{
                                    fontFamily: "var(--display)",
                                    fontStyle: "italic",
                                    fontSize: 24,
                                    color: "var(--ink)",
                                    cursor: "pointer",
                                    listStyle: "none",
                                }}
                            >
                                {it.q}
                            </summary>
                            <p
                                style={{
                                    marginTop: 12,
                                    color: "var(--ink-soft)",
                                    maxWidth: "60ch",
                                }}
                            >
                                {it.a}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────── Final CTA ─────────────── */

function CTA() {
    return (
        <section
            style={{
                padding: "var(--pad-section) 0",
                background: "var(--bg-alt)",
                borderTop: "1px solid var(--rule)",
                textAlign: "center",
            }}
        >
            <div
                className="container"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}
            >
                <BloomLogo size={64} sw={1.6} />
                <h2 style={{ maxWidth: "16ch" }}>
                    The garden grows when <em>you</em> plant.
                </h2>
                <p
                    className="lede"
                    style={{ maxWidth: 560 }}
                >
                    Bloom your first agent in minutes. Pin its weights to 0G Storage. Watch the
                    cascade flow.
                </p>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                    <Link href="/mint" className="btn">
                        Bloom your first agent ↗
                    </Link>
                    <Link href="/explorer" className="btn btn--ghost">
                        Wander the garden
                    </Link>
                </div>
            </div>
        </section>
    );
}
