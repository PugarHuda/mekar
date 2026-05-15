/**
 * GET /api/brand/logo?variant=mark|wordmark|square&size=1024&download=0|1
 *
 * Always returns SVG. PNG conversion happens client-side via canvas
 * in /brand — that path is more reliable than next/og's Satori
 * rasteriser (which had font-fetch failures + data-URI corner cases
 * causing the original 500s on download).
 *
 * Variants:
 *   mark      → bloom flower only, transparent background, no chrome.
 *               Matches what users see in the header / favicon.
 *   wordmark  → bloom + "Mekar" italic + tagline on cream tile.
 *   square    → vertical stack on cream tile (submission-tile fmt).
 *
 * Sizes are clamped to [128, 4096]. `?download=1` flips Content-
 * Disposition to attachment so the browser saves instead of rendering
 * inline.
 */

import { NextRequest, NextResponse } from "next/server";
import { renderBloomSvg } from "@/lib/bloom";

type Variant = "mark" | "wordmark" | "square";

const DEFAULT_SIZE: Record<Variant, { w: number; h: number }> = {
    mark: { w: 1024, h: 1024 },
    wordmark: { w: 1600, h: 480 },
    square: { w: 1024, h: 1024 },
};

const CREAM = "#f4ead8";
const COCOA = "#4a3424";
const GOLD = "#b9882c";

// The logo mark in lib/bloom.ts is drawn with **fixed absolute
// coordinates** (peakR = 16, so the bloom spans ~±18 units once you
// account for the stroke). The size param only changes the outer
// viewBox, NOT the path coordinates — which means at size=1024 the
// bloom only fills 3% of the canvas.
//
// Solution: ignore renderBloomSvg's size parameter for download, use
// a TIGHT viewBox that matches the bloom's natural bounds so the
// shape fills the canvas regardless of pixel size.
const BLOOM_BOUNDS = 40; // ±20 units around origin, padded for stroke

/** Strip the outer <svg> wrapper from a renderBloomSvg() result so we
 *  can embed its paths into a different coordinate system. */
function bloomInner(): string {
    // markPx doesn't matter — the inner paths use fixed coordinates.
    // We pass 100 so any size-dependent stroke math inside the bloom
    // resolves predictably.
    const raw = renderBloomSvg("logo", "logo", { size: 100, sw: 1.8 });
    const m = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    return m ? m[1] : raw;
}

function svgMark(size: number): string {
    // Tight viewBox so the bloom shape fills the canvas. width/height
    // give the requested pixel size; browsers + canvas scale the
    // viewBox content to fit. Transparent — no rect background.
    const inner = bloomInner();
    const half = BLOOM_BOUNDS / 2;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-${half} -${half} ${BLOOM_BOUNDS} ${BLOOM_BOUNDS}" width="${size}" height="${size}">
    ${inner}
</svg>`;
}

function svgWordmark(w: number, h: number): string {
    const markSize = Math.round(h * 0.72);
    const cy = h / 2;
    const padding = h * 0.18;
    const bloomCx = padding + markSize / 2;
    const textX = padding + markSize + h * 0.15;
    const inner = bloomInner();
    // Scale the bloom from its natural ~40-unit bounds to markSize px.
    const scale = markSize / BLOOM_BOUNDS;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${CREAM}"/>
    <g transform="translate(${bloomCx}, ${cy}) scale(${scale})">${inner}</g>
    <text
        x="${textX}"
        y="${cy}"
        fill="${COCOA}"
        font-family="Cormorant Garamond, Georgia, serif"
        font-size="${h * 0.6}"
        font-style="italic"
        font-weight="500"
        dominant-baseline="central"
    >Mekar</text>
    <text
        x="${textX}"
        y="${cy + h * 0.32}"
        fill="${COCOA}"
        fill-opacity="0.7"
        font-family="JetBrains Mono, monospace"
        font-size="${h * 0.11}"
        letter-spacing="${h * 0.012}"
        dominant-baseline="central"
    >ON-CHAIN ROYALTY FOR AI</text>
</svg>`;
}

function svgSquare(w: number, h: number): string {
    // Vertical stack — bloom in upper half, name + tagline below.
    const aspect = h / w;
    const isWide = aspect <= 0.8;
    const markSize = Math.round((isWide ? h * 0.62 : w * 0.5));
    const bloomCy = h * 0.4;
    const nameY = h * (isWide ? 0.7 : 0.72);
    const taglineY = h * (isWide ? 0.86 : 0.84);
    const nameSize = h * (isWide ? 0.16 : 0.2);
    const taglineSize = h * (isWide ? 0.035 : 0.045);
    const inner = bloomInner();
    const scale = markSize / BLOOM_BOUNDS;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${CREAM}"/>
    <g transform="translate(${w / 2}, ${bloomCy}) scale(${scale})">${inner}</g>
    <text
        x="${w / 2}"
        y="${nameY}"
        fill="${COCOA}"
        font-family="Cormorant Garamond, Georgia, serif"
        font-size="${nameSize}"
        font-style="italic"
        font-weight="500"
        text-anchor="middle"
        dominant-baseline="central"
    >Mekar</text>
    <text
        x="${w / 2}"
        y="${taglineY}"
        fill="${GOLD}"
        font-family="JetBrains Mono, monospace"
        font-size="${taglineSize}"
        letter-spacing="${h * 0.006}"
        text-anchor="middle"
        dominant-baseline="central"
    >ON-CHAIN ROYALTY FOR AI · BUILT ON 0G</text>
</svg>`;
}

function buildSvg(variant: Variant, w: number, h: number): string {
    if (variant === "mark") return svgMark(w);
    if (variant === "wordmark") return svgWordmark(w, h);
    return svgSquare(w, h);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const variant = (searchParams.get("variant") ?? "mark") as Variant;
    if (!["mark", "wordmark", "square"].includes(variant)) {
        return NextResponse.json({ error: "invalid variant" }, { status: 400 });
    }

    const sizeRaw = parseInt(searchParams.get("size") ?? "", 10);
    const defaults = DEFAULT_SIZE[variant];
    let w = defaults.w;
    let h = defaults.h;
    if (Number.isFinite(sizeRaw)) {
        const clamped = Math.max(128, Math.min(4096, sizeRaw));
        if (variant === "wordmark") {
            w = clamped;
            h = Math.round(clamped * (defaults.h / defaults.w));
        } else {
            // mark is square — w and h track together.
            w = clamped;
            h = clamped;
        }
    }

    let svg: string;
    try {
        svg = buildSvg(variant, w, h);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: "svg build failed", detail: msg }, { status: 500 });
    }

    const download = searchParams.get("download") === "1";
    return new NextResponse(svg, {
        headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400, immutable",
            "Content-Disposition": `${download ? "attachment" : "inline"}; filename="mekar-${variant}-${w}x${h}.svg"`,
            // Permissive CORS so the /brand client-side PNG converter
            // can `fetch()` the SVG without tripping browser policy.
            "Access-Control-Allow-Origin": "*",
        },
    });
}

export const runtime = "nodejs";
