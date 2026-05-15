"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BloomLogo, Bloom } from "@/components/Bloom";

/**
 * Single-file slide deck. Each <Slide> is one screen; the keyboard
 * cycles between them. We keep the count + bullet density low — at
 * 3-min pitch length, the deck reads more as cue cards than as a
 * dense info dump. Every slide stays under ~40 words of body text.
 */

type SlideContent = {
    eyebrow?: string;
    title: ReactNode;
    body?: ReactNode;
    /** Optional aside on the right of the title (numbers, callout). */
    aside?: ReactNode;
};

// Shared style tokens — declared before SLIDES so the slide body
// references can use them (otherwise TS const-temporal-dead-zone
// trips the build with "used before declaration").
const ulStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    fontSize: 17,
};
const ulSmall: React.CSSProperties = { ...ulStyle, fontSize: 14, gap: 7 };

const subhStyle: React.CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--cocoa)",
    marginBottom: 12,
};

const SLIDES: SlideContent[] = [
    // 1 — Cover
    {
        eyebrow: "0G APAC Hackathon · Track 3 · Agentic Economy",
        title: (
            <>
                Mekar<em>.</em>
            </>
        ),
        body: (
            <>
                <p style={{ fontSize: 22, lineHeight: 1.4, marginBottom: 18 }}>
                    Spotify-style royalty for AI agents.
                </p>
                <p style={{ fontSize: 16, color: "var(--ink-soft)" }}>
                    Every AI has a lineage.
                    <br />
                    Every inference pays its ancestors.
                </p>
            </>
        ),
        aside: <BloomLogo size={180} sw={1.4} />,
    },

    // 2 — Problem
    {
        eyebrow: "01 · Problem",
        title: (
            <>
                The AI industry has <em>no royalty rail.</em>
            </>
        ),
        body: (
            <>
                <ul style={ulStyle}>
                    <li>Stability AI bankrupt. Open-source AI starved.</li>
                    <li>NYT vs OpenAI, Getty vs Stability — lawsuit chaos.</li>
                    <li>EU AI Act 2026 mandates training-data provenance.</li>
                    <li>Fine-tuners build on LoRAs they can&apos;t pay back.</li>
                </ul>
                <p style={{ marginTop: 18, fontSize: 18, color: "var(--cocoa)" }}>
                    Creators have no way to get paid when their work is used downstream.
                </p>
            </>
        ),
    },

    // 3 — Solution
    {
        eyebrow: "02 · Solution",
        title: (
            <>
                Royalty <em>cascades on chain.</em>
            </>
        ),
        body: (
            <>
                <p style={{ fontSize: 18, marginBottom: 14 }}>
                    Every model registers as an INFT (ERC-7857) on 0G. Every inference
                    splits the fee atomically through the lineage:
                </p>
                <ul style={{ ...ulStyle, fontFamily: "var(--mono)", fontSize: 16 }}>
                    <li>50% → direct owner</li>
                    <li>25% → gen-1 parents (split equally)</li>
                    <li>15% → gen-2 ancestors</li>
                    <li>&nbsp;7% → gen-3+ (capped depth 10)</li>
                    <li>&nbsp;3% → training data contributors</li>
                </ul>
                <p style={{ marginTop: 14, fontSize: 15, color: "var(--ink-soft)" }}>
                    Dust + slashed shares sweep to a protocol treasury. One tx settles
                    everything.
                </p>
            </>
        ),
    },

    // 4 — Architecture
    {
        eyebrow: "03 · Architecture",
        title: (
            <>
                Five contracts <em>on 0G.</em>
            </>
        ),
        body: (
            <>
                <Code>
                    {`USER LAYER\n├── Creator Dashboard\n├── Fine-tuner Studio (Fork / Compose)\n└── End-user UI (Pay & invoke)\n\nPROTOCOL LAYER\n├── MekarRegistry      lineage graph + metadata KV\n├── AgentINFT          ERC-7857 + mode + alignment\n├── RoyaltyVault       atomic BFS distribution\n├── TrainingDataRegistry Merkle root anchor\n└── AlignmentAuditor   drift / bias scoring\n\n0G INFRA\n  Chain (16661) · Storage Log · KV · Compute (TEE)`}
                </Code>
            </>
        ),
    },

    // 5 — Demo flow
    {
        eyebrow: "04 · How it works",
        title: (
            <>
                Three blooms, <em>one cascade.</em>
            </>
        ),
        body: (
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
                <FlowCard kind="genesis" step="Step 1" title="Mint Genesis">
                    Alice trains Lotus-Base-3B. Anchors weight manifest on 0G Storage.
                    Mints INFT #1.
                </FlowCard>
                <FlowCard kind="fork" step="Step 2" title="Fork">
                    Bob fine-tunes for Indonesian. Mints INFT #2 → parent = #1.
                </FlowCard>
                <FlowCard kind="compose" step="Step 3" title="Pay & cascade">
                    User pays 0.0012 OG → vault splits to #2 (50%) + #1 (25%) + dust to
                    treasury — all in one tx.
                </FlowCard>
            </div>
        ),
    },

    // 6 — Why 0G
    {
        eyebrow: "05 · Why 0G",
        title: (
            <>
                Mekar needs <em>every</em> 0G primitive.
            </>
        ),
        body: (
            <ul style={ulStyle}>
                <li>
                    <strong>0G Chain</strong> — EVM-compat where the cascade settles
                    atomically.
                </li>
                <li>
                    <strong>0G Storage Log</strong> — weight manifests anchored,
                    rootHash on chain.
                </li>
                <li>
                    <strong>0G Storage Specialized Flow</strong> — encrypted weights
                    for the Strict tier.
                </li>
                <li>
                    <strong>0G Compute (TEE)</strong> — sealed inference with
                    attestation hashing.
                </li>
                <li>
                    <strong>0G Data Serving Network</strong> — provider registration
                    + auto-billing.
                </li>
            </ul>
        ),
    },

    // 7 — What's real today
    {
        eyebrow: "06 · Honesty audit",
        title: (
            <>
                Live <em>vs</em> Phase 2.
            </>
        ),
        body: (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                <div>
                    <h3 style={subhStyle}>✓ Live on Aristotle mainnet</h3>
                    <ul style={ulSmall}>
                        <li>5 contracts deployed + wired</li>
                        <li>59/59 forge tests pass</li>
                        <li>Real 0G Storage upload (AES-GCM, client-side)</li>
                        <li>Multi-wallet cascade seed proven</li>
                        <li>Q1–Q5 honesty fixes shipped (sweep, slash, burn-safe)</li>
                    </ul>
                </div>
                <div>
                    <h3 style={subhStyle}>○ Phase 2</h3>
                    <ul style={ulSmall}>
                        <li>0G Compute DSN providers register (broker reachable, no providers yet)</li>
                        <li>MekarMultisig + AlignmentMultiAuditor take ownership</li>
                        <li>Specialized Flow tier for paid storage permanence</li>
                        <li>0G KV writeback as the source of metadata truth</li>
                    </ul>
                </div>
            </div>
        ),
    },

    // 8 — Multi-tenancy / access control
    {
        eyebrow: "07 · As infrastructure",
        title: (
            <>
                Open rail, <em>wallet-bound</em> ownership.
            </>
        ),
        body: (
            <>
                <p style={{ fontSize: 17, marginBottom: 14 }}>
                    Any project, any wallet, any model — same protocol.
                </p>
                <ul style={ulStyle}>
                    <li>
                        <strong>Multi-tenant</strong>: each agent owned by the wallet
                        that minted it. No approval, no central marketplace.
                    </li>
                    <li>
                        <strong>Pay-to-use</strong>: anyone can call{" "}
                        <code>payInference(id)</code>; cascade auto-settles.
                    </li>
                    <li>
                        <strong>Strict mode</strong> encrypts weights — only key-holders
                        can run inference. Compute provider gates the response.
                    </li>
                    <li>
                        <strong>License</strong> field carries attribution norms (MIT /
                        Apache / CC-BY) for fork compliance.
                    </li>
                </ul>
            </>
        ),
    },

    // 9 — Numbers / proof
    {
        eyebrow: "08 · Proof",
        title: (
            <>
                Numbers that <em>matter.</em>
            </>
        ),
        body: (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
                <Stat label="Contract tests" value="56 / 56" />
                <Stat label="Routes prerendered" value="14 / 14" />
                <Stat label="ESLint / TS errors" value="0" />
                <Stat label="0G primitives used" value="5" />
                <Stat label="Lineage depth cap" value="10 gens" />
                <Stat label="Compose parents max" value="8" />
                <Stat label="Storage encryption" value="AES-256-GCM" />
                <Stat label="Multisig variant" value="k-of-n ready" />
                <Stat label="Languages (i18n)" value="EN · ID" />
            </div>
        ),
    },

    // 10 — Ask / Closing
    {
        eyebrow: "09 · Closing",
        title: (
            <>
                The missing rail for the <em>agentic economy.</em>
            </>
        ),
        body: (
            <>
                <p style={{ fontSize: 19, marginBottom: 14 }}>
                    AI without a royalty rail kills open source.
                    <br />
                    Mekar makes every inference pay back.
                </p>
                <p style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 20 }}>
                    Built for Track 3. Indonesian creator economy + EU AI Act
                    compliance. Live, audited, ready to anchor any AI model on 0G.
                </p>
                <div
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 13,
                        color: "var(--cocoa)",
                        background: "var(--bg-alt)",
                        border: "1.5px solid var(--cocoa)",
                        borderRadius: 4,
                        padding: "10px 14px",
                        display: "inline-block",
                    }}
                >
                    mekar.vercel.app · github.com/PugarHuda/mekar
                </div>
            </>
        ),
        aside: <Bloom kind="compose" seed="closing" size={160} sw={1.4} />,
    },
];

export function SlideDeck() {
    const [index, setIndex] = useState(0);

    // Keyboard nav. Arrow / Space / J K / Home / End.
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "ArrowRight" || e.key === " " || e.key === "j") {
                setIndex((i) => Math.min(SLIDES.length - 1, i + 1));
            } else if (e.key === "ArrowLeft" || e.key === "k") {
                setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Home") {
                setIndex(0);
            } else if (e.key === "End") {
                setIndex(SLIDES.length - 1);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const slide = SLIDES[index];

    return (
        <div
            onClick={() =>
                setIndex((i) => Math.min(SLIDES.length - 1, i + 1))
            }
            style={{
                position: "fixed",
                inset: 0,
                background: "var(--bg)",
                color: "var(--ink)",
                padding: "clamp(32px, 6vh, 80px) clamp(40px, 8vw, 120px)",
                fontFamily: "var(--body)",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                overflowY: "auto",
            }}
        >
            {/* Eyebrow + progress dots */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 48,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <span
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "var(--ink-soft)",
                    }}
                >
                    {slide.eyebrow ?? `${index + 1} / ${SLIDES.length}`}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Jump to slide ${i + 1}`}
                            style={{
                                width: i === index ? 24 : 8,
                                height: 4,
                                borderRadius: 999,
                                background:
                                    i === index ? "var(--cocoa)" : "var(--rule)",
                                border: 0,
                                cursor: "pointer",
                                transition: "all 0.25s",
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Title + aside */}
            <div
                style={{
                    display: "flex",
                    gap: 40,
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                }}
            >
                <h1
                    style={{
                        fontFamily: "var(--display)",
                        fontStyle: "italic",
                        fontSize: "clamp(48px, 7vw, 96px)",
                        lineHeight: 1.05,
                        margin: 0,
                        flex: "1 1 auto",
                    }}
                >
                    {slide.title}
                </h1>
                {slide.aside && (
                    <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        {slide.aside}
                    </div>
                )}
            </div>

            {/* Body */}
            <div
                style={{ marginTop: 36, fontSize: 18, lineHeight: 1.6, maxWidth: "62ch" }}
                onClick={(e) => e.stopPropagation()}
            >
                {slide.body}
            </div>

            {/* Footer hint */}
            <div
                style={{
                    marginTop: "auto",
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    color: "var(--ink-soft)",
                    paddingTop: 32,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <span>
                    ← / → to navigate · Space to advance · F11 for fullscreen
                </span>
                <span>
                    Mekar · 0G Hackathon · {index + 1} / {SLIDES.length}
                </span>
            </div>
        </div>
    );
}

/* ─────────────── Bits ─────────────── */

function Code({ children }: { children: ReactNode }) {
    return (
        <pre
            style={{
                background: "var(--surface)",
                border: "1.5px solid var(--rule)",
                borderRadius: 6,
                padding: "20px 24px",
                fontFamily: "var(--mono)",
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "var(--ink)",
                overflowX: "auto",
                whiteSpace: "pre",
            }}
        >
            {children}
        </pre>
    );
}

function FlowCard({
    kind,
    step,
    title,
    children,
}: {
    kind: "genesis" | "fork" | "compose";
    step: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                border: "1.5px solid var(--rule)",
                background: "var(--surface)",
                borderRadius: 6,
                padding: 20,
                width: 240,
                display: "flex",
                flexDirection: "column",
                gap: 10,
            }}
        >
            <Bloom kind={kind} seed={step} size={64} sw={1.2} />
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                }}
            >
                {step}
            </div>
            <h3
                style={{
                    fontFamily: "var(--display)",
                    fontStyle: "italic",
                    fontSize: 22,
                    margin: 0,
                }}
            >
                {title}
            </h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>{children}</p>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div
            style={{
                padding: "14px 18px",
                border: "1.5px solid var(--rule)",
                background: "var(--surface)",
                borderRadius: 4,
            }}
        >
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginBottom: 4,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontFamily: "var(--display)",
                    fontStyle: "italic",
                    fontSize: 26,
                    color: "var(--cocoa)",
                }}
            >
                {value}
            </div>
        </div>
    );
}
