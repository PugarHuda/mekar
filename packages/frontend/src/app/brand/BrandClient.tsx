"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Variant = {
    id: "mark" | "wordmark" | "square";
    label: string;
    description: string;
    /** Aspect for the preview tile background. */
    previewW: number;
    previewH: number;
    /** Square (mark + square) or wordmark — affects PNG height calc. */
    aspect: "square" | "horizontal";
    /** Sizes offered for PNG download. */
    pngSizes: number[];
};

const VARIANTS: Variant[] = [
    {
        id: "mark",
        label: "Mark only (flower, transparent)",
        description:
            "Just the bloom — no background, no chrome. Same shape as the header logo. Use as a square avatar, favicon, or stamp on any color.",
        previewW: 320,
        previewH: 320,
        aspect: "square",
        pngSizes: [256, 512, 1024, 2048],
    },
    {
        id: "wordmark",
        label: "Wordmark (horizontal)",
        description:
            "Bloom + “Mekar” in display italic + tagline on a cream tile. Fits a 3.33:1 aspect — ideal for page headers + blog covers.",
        previewW: 480,
        previewH: 144,
        aspect: "horizontal",
        pngSizes: [800, 1280, 1600, 2400],
    },
    {
        id: "square",
        label: "Square submission tile",
        description:
            "Vertical stack: bloom + Mekar + tagline on a cream tile. The submission-tile format for HackQuest + partner directories.",
        previewW: 320,
        previewH: 320,
        aspect: "square",
        pngSizes: [500, 720, 1024, 1280],
    },
];

/**
 * Convert an SVG string into a PNG Blob by rendering it on a canvas
 * at the requested raster size. We resolve the SVG dimensions by
 * letting the browser parse it (so width/height attributes are
 * respected) then upscale the canvas to match the target size for
 * crisp output.
 */
async function svgToPng(svgText: string, width: number, height: number): Promise<Blob> {
    // 1. SVG → blob URL so we can use it as <img src>. We use blob
    //    URLs over data URIs because Safari refuses to decode some
    //    SVG features inside data URIs reliably.
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("SVG failed to load into <img>"));
            img.src = url;
        });

        // 2. Canvas at target raster size.
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas 2d context unavailable");
        // Draw scaled — img dimensions come from the SVG viewBox/width
        // but we want pixel-perfect at the requested raster size.
        ctx.drawImage(img, 0, 0, width, height);

        // 3. Canvas → PNG blob.
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
                "image/png"
            );
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Tiny delay so the browser actually starts the download before
    // we revoke the URL — some browsers race the revoke and abort.
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function svgUrl(variant: string, size?: number, download?: boolean): string {
    const params = new URLSearchParams({ variant });
    if (size) params.set("size", String(size));
    if (download) params.set("download", "1");
    return `/api/brand/logo?${params.toString()}`;
}

export function BrandClient() {
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
                            press kit use. SVG is the canonical source; PNGs are
                            rasterised in your browser from the same vector when you
                            click a size button.
                        </p>
                    </header>

                    <section style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                        {VARIANTS.map((v) => (
                            <VariantCard key={v.id} v={v} />
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
                            <ExternalLink size={11} style={{ marginLeft: 4, verticalAlign: "middle" }} />
                        </Link>
                        .
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}

function VariantCard({ v }: { v: Variant }) {
    const [busySize, setBusySize] = useState<number | null>(null);

    async function downloadPng(size: number) {
        setBusySize(size);
        try {
            // Fetch the SVG at request size — the server already handles
            // wordmark aspect math, so just pass `size` and we'll get
            // back an SVG sized appropriately for the variant.
            const res = await fetch(svgUrl(v.id, size));
            if (!res.ok) throw new Error(`server returned ${res.status}`);
            const svgText = await res.text();
            // For wordmark we need the rastered PNG to match the
            // SVG's actual aspect, not a square. Mirror the route's
            // aspect math.
            let pngW = size;
            let pngH = size;
            if (v.aspect === "horizontal") {
                pngH = Math.round(size * (480 / 1600));
            }
            const blob = await svgToPng(svgText, pngW, pngH);
            downloadBlob(blob, `mekar-${v.id}-${pngW}x${pngH}.png`);
            toast.success(`Downloaded mekar-${v.id}-${pngW}x${pngH}.png`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`PNG export failed: ${msg.slice(0, 160)}`);
        } finally {
            setBusySize(null);
        }
    }

    async function downloadSvg() {
        try {
            const res = await fetch(svgUrl(v.id));
            if (!res.ok) throw new Error(`server returned ${res.status}`);
            const svgText = await res.text();
            const blob = new Blob([svgText], { type: "image/svg+xml" });
            downloadBlob(blob, `mekar-${v.id}.svg`);
            toast.success(`Downloaded mekar-${v.id}.svg`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`SVG download failed: ${msg.slice(0, 160)}`);
        }
    }

    // Preview tile background — only the "mark" variant is transparent
    // so we show a checkerboard pattern behind it. The wordmark/square
    // tiles render their own cream background, so we keep the preview
    // tile neutral.
    const transparentBg = v.id === "mark";

    return (
        <div
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
            <div
                style={{
                    width: v.previewW,
                    height: v.previewH,
                    maxWidth: "100%",
                    border: "1px solid var(--rule)",
                    background: transparentBg
                        ? // checkerboard so users can see the alpha
                          "repeating-conic-gradient(#e9e1cf 0% 25%, #f4ead8 0% 50%) 50% / 24px 24px"
                        : "var(--bg-alt)",
                    borderRadius: 4,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={svgUrl(v.id)}
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
                    <button type="button" onClick={downloadSvg} className="btn">
                        <Download size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                        SVG (vector)
                    </button>
                    {v.pngSizes.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => downloadPng(s)}
                            disabled={busySize !== null}
                            className="btn btn--ghost"
                            style={{ minWidth: 90 }}
                        >
                            {busySize === s ? (
                                <>
                                    <Loader2
                                        className="animate-spin"
                                        size={12}
                                        style={{ marginRight: 6, verticalAlign: "middle" }}
                                    />
                                    …
                                </>
                            ) : (
                                <>PNG · {s}px</>
                            )}
                        </button>
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
                    Preview source: <code>{svgUrl(v.id)}</code>
                </p>
            </div>
        </div>
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
