/**
 * /brand — logo + brand asset download hub.
 *
 * Pre-renders preview tiles for each logo variant and exposes
 * one-click downloads in SVG + PNG at common sizes. Useful for
 * the hackathon submission tile, blog covers, and press kit.
 *
 * No nav link — reach via direct URL. Marked noindex so the
 * crawler doesn't surface it ahead of the real product.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
    title: "Mekar — Brand assets",
    description: "Logo downloads for partners + submissions.",
    robots: { index: false, follow: false },
};

type Variant = {
    id: "mark" | "wordmark" | "square";
    label: string;
    description: string;
    /** Aspect for the preview tile background. */
    previewW: number;
    previewH: number;
    /** Sizes offered for PNG download. */
    pngSizes: number[];
};

const VARIANTS: Variant[] = [
    {
        id: "mark",
        label: "Mark only",
        description:
            "Just the bloom. Use as a square avatar, favicon, or stamp inside a layout that already says “Mekar” somewhere.",
        previewW: 320,
        previewH: 320,
        pngSizes: [256, 512, 1024, 2048],
    },
    {
        id: "wordmark",
        label: "Wordmark (horizontal)",
        description:
            "Bloom + “Mekar” in display italic + on-chain tagline. Fits a 3.33:1 aspect, ideal for page headers + blog covers.",
        previewW: 480,
        previewH: 144,
        pngSizes: [800, 1280, 1600, 2400],
    },
    {
        id: "square",
        label: "Square submission tile",
        description:
            "Vertical stack: bloom + Mekar + tagline. The submission-tile format for HackQuest and partner directories.",
        previewW: 320,
        previewH: 320,
        pngSizes: [500, 720, 1024, 1280],
    },
];

function url(variant: string, format: "svg" | "png", size?: number) {
    const params = new URLSearchParams({ variant, format });
    if (size) params.set("size", String(size));
    return `/api/brand/logo?${params.toString()}`;
}

export default function BrandPage() {
    return (
        <div>
            <Header />
            <main style={{ padding: "var(--pad-section) 0" }}>
                <div className="container" style={{ maxWidth: 920 }}>
                    <header style={{ marginBottom: 48 }}>
                        <span className="eyebrow">/brand</span>
                        <h1
                            style={{
                                fontSize: "clamp(40px, 5.5vw, 72px)",
                                marginTop: 12,
                                lineHeight: 1.05,
                            }}
                        >
                            Brand <em>assets.</em>
                        </h1>
                        <p
                            style={{
                                color: "var(--ink-soft)",
                                marginTop: 14,
                                maxWidth: "60ch",
                                fontSize: 16.5,
                            }}
                        >
                            Logo downloads for partner sites, hackathon submissions, and
                            press kit use. SVG is the canonical source — every PNG is
                            rasterised from the same vector at request time.
                        </p>
                    </header>

                    <section style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                        {VARIANTS.map((v) => (
                            <div
                                key={v.id}
                                style={{
                                    border: "1.5px solid var(--rule)",
                                    background: "var(--surface)",
                                    borderRadius: "var(--radius)",
                                    padding: 24,
                                    display: "grid",
                                    gridTemplateColumns: "minmax(0, 280px) 1fr",
                                    gap: 28,
                                    alignItems: "start",
                                }}
                                className="brand-card"
                            >
                                {/* Preview tile — fetches the SVG variant inline */}
                                <div
                                    style={{
                                        width: v.previewW,
                                        height: v.previewH,
                                        maxWidth: "100%",
                                        border: "1px solid var(--rule)",
                                        background: "var(--bg-alt)",
                                        borderRadius: 4,
                                        overflow: "hidden",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={url(v.id, "svg")}
                                        alt={`Mekar ${v.label} preview`}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "contain",
                                        }}
                                    />
                                </div>

                                <div>
                                    <h2
                                        style={{
                                            fontFamily: "var(--display)",
                                            fontStyle: "italic",
                                            fontSize: 28,
                                            marginBottom: 6,
                                        }}
                                    >
                                        {v.label}
                                    </h2>
                                    <p
                                        style={{
                                            color: "var(--ink-soft)",
                                            fontSize: 14.5,
                                            lineHeight: 1.55,
                                            marginBottom: 16,
                                            maxWidth: "52ch",
                                        }}
                                    >
                                        {v.description}
                                    </p>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            flexWrap: "wrap",
                                            marginBottom: 10,
                                        }}
                                    >
                                        <DownloadLink
                                            href={url(v.id, "svg")}
                                            file={`mekar-${v.id}.svg`}
                                            primary
                                        >
                                            Download SVG
                                        </DownloadLink>
                                        {v.pngSizes.map((s) => (
                                            <DownloadLink
                                                key={s}
                                                href={url(v.id, "png", s)}
                                                file={`mekar-${v.id}-${s}.png`}
                                            >
                                                PNG · {s}px
                                            </DownloadLink>
                                        ))}
                                    </div>

                                    <p
                                        style={{
                                            fontFamily: "var(--mono)",
                                            fontSize: 10.5,
                                            color: "var(--ink-soft)",
                                            opacity: 0.7,
                                        }}
                                    >
                                        Direct deep-link: <code>{url(v.id, "svg")}</code>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </section>

                    <section
                        style={{
                            marginTop: 56,
                            padding: 24,
                            border: "1.5px solid var(--rule)",
                            background: "var(--bg-alt)",
                            borderRadius: "var(--radius)",
                        }}
                    >
                        <h3
                            style={{
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                color: "var(--ink-soft)",
                                marginBottom: 12,
                            }}
                        >
                            Palette
                        </h3>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            <Swatch hex="#f4ead8" name="Cream" use="Background" />
                            <Swatch hex="#4a3424" name="Cocoa" use="Primary text" />
                            <Swatch hex="#b9882c" name="Gold" use="Accent + active" />
                            <Swatch hex="#c25a4a" name="Coral" use="Warning + slash" />
                            <Swatch hex="#2e6856" name="Tea" use="Success + provider" />
                        </div>
                    </section>

                    <p
                        style={{
                            marginTop: 36,
                            color: "var(--ink-soft)",
                            fontSize: 13,
                            fontFamily: "var(--mono)",
                        }}
                    >
                        Need a colour, format, or layout that isn&apos;t here? Open an issue
                        at{" "}
                        <Link
                            href="https://github.com/PugarHuda/mekar/issues"
                            target="_blank"
                            rel="noreferrer"
                        >
                            github.com/PugarHuda/mekar
                        </Link>
                        .
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function DownloadLink({
    href,
    file,
    children,
    primary,
}: {
    href: string;
    file: string;
    children: React.ReactNode;
    primary?: boolean;
}) {
    return (
        <a
            href={href}
            download={file}
            className={primary ? "btn" : "btn btn--ghost"}
            style={{ fontSize: 12.5 }}
        >
            {children}
        </a>
    );
}

function Swatch({ hex, name, use }: { hex: string; name: string; use: string }) {
    return (
        <div
            style={{
                width: 120,
                border: "1px solid var(--rule)",
                background: "var(--surface)",
                borderRadius: 4,
                padding: 10,
                fontFamily: "var(--mono)",
                fontSize: 11,
            }}
        >
            <div
                style={{
                    height: 48,
                    background: hex,
                    border: "1px solid var(--cocoa)",
                    borderRadius: 3,
                    marginBottom: 6,
                }}
            />
            <div style={{ fontWeight: 600, color: "var(--ink)" }}>{name}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 10 }}>{hex}</div>
            <div
                style={{
                    color: "var(--ink-soft)",
                    fontSize: 10,
                    marginTop: 2,
                    fontStyle: "italic",
                }}
            >
                {use}
            </div>
        </div>
    );
}
