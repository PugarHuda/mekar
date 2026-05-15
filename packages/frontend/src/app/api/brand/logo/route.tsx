/**
 * GET /api/brand/logo?variant=mark|wordmark|square&size=1024&format=svg|png
 *
 * Renders the Mekar logo at any size in either SVG (vector) or PNG
 * (raster). Used by the in-app /brand download page + as a permanent
 * deep-link that brand partners can use to fetch a fresh asset
 * without us having to mail PNGs.
 *
 * SVG path is the canonical source — every PNG is rasterised from
 * the same vector. Sizes are clamped to [128, 4096] so a careless
 * `?size=99999` doesn't OOM the server.
 */

import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { renderBloomSvg } from "@/lib/bloom";

type Variant = "mark" | "wordmark" | "square";
type Format = "svg" | "png";

const SIZE_DEFAULTS: Record<Variant, { w: number; h: number }> = {
    mark: { w: 1024, h: 1024 },
    wordmark: { w: 1600, h: 480 },
    square: { w: 1024, h: 1024 },
};

function buildSvg(variant: Variant, w: number, h: number): string {
    // The bloom mark itself — server-renderable, no DOM required.
    const markSize = variant === "wordmark" ? Math.round(h * 0.7) : Math.round(Math.min(w, h) * 0.7);
    const bloom = renderBloomSvg("logo", "logo", {
        size: markSize,
        sw: 1.8,
    });
    // Strip the outer <svg> wrapper from the bloom so we can compose it
    // inside our own canvas — we keep the bloom's group, drop its svg
    // shell, and re-wrap with the target dimensions.
    const innerMatch = bloom.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    const bloomInner = innerMatch ? innerMatch[1] : bloom;

    // Coordinate system: the bloom uses viewBox="-half -half size size",
    // so its origin is at the centre of a `markSize` box.
    const cream = "#f4ead8";
    const cocoa = "#4a3424";
    const gold = "#b9882c";

    if (variant === "mark") {
        // Just the bloom on a cream background, centred.
        return svgWrap(
            w,
            h,
            cream,
            `
                <g transform="translate(${w / 2}, ${h / 2})">
                    ${bloomInner}
                </g>
            `
        );
    }

    if (variant === "wordmark") {
        // Bloom on the left, "Mekar" italic display type on the right.
        const cy = h / 2;
        const padding = h * 0.2;
        const bloomCx = padding + markSize / 2;
        const textX = padding + markSize + h * 0.15;
        return svgWrap(
            w,
            h,
            cream,
            `
                <g transform="translate(${bloomCx}, ${cy})">
                    ${bloomInner}
                </g>
                <text
                    x="${textX}"
                    y="${cy}"
                    fill="${cocoa}"
                    font-family="Cormorant Garamond, Georgia, serif"
                    font-size="${h * 0.62}"
                    font-style="italic"
                    font-weight="500"
                    dominant-baseline="central"
                >Mekar</text>
                <text
                    x="${textX}"
                    y="${cy + h * 0.32}"
                    fill="${cocoa}"
                    fill-opacity="0.7"
                    font-family="JetBrains Mono, monospace"
                    font-size="${h * 0.12}"
                    letter-spacing="${h * 0.012}"
                    dominant-baseline="central"
                >ON-CHAIN ROYALTY FOR AI</text>
            `
        );
    }

    // square — bloom on top, name + tagline below. Optimised for the
    // hackathon submission tile (Image 500x300 or 1280x720 also works).
    const aspect = h / w;
    // Vertical stack: bloom roughly 50% of width, centred, with the
    // wordmark + tagline below.
    const bloomCx = w / 2;
    const bloomCy = h * 0.42;
    return svgWrap(
        w,
        h,
        cream,
        `
            <g transform="translate(${bloomCx}, ${bloomCy})">
                ${bloomInner}
            </g>
            <text
                x="${w / 2}"
                y="${h * (aspect > 0.8 ? 0.78 : 0.7)}"
                fill="${cocoa}"
                font-family="Cormorant Garamond, Georgia, serif"
                font-size="${h * (aspect > 0.8 ? 0.16 : 0.22)}"
                font-style="italic"
                font-weight="500"
                text-anchor="middle"
                dominant-baseline="central"
            >Mekar</text>
            <text
                x="${w / 2}"
                y="${h * (aspect > 0.8 ? 0.88 : 0.82)}"
                fill="${gold}"
                font-family="JetBrains Mono, monospace"
                font-size="${h * (aspect > 0.8 ? 0.035 : 0.05)}"
                letter-spacing="${h * 0.006}"
                text-anchor="middle"
                dominant-baseline="central"
            >ON-CHAIN ROYALTY FOR AI · BUILT ON 0G</text>
        `
    );
}

function svgWrap(w: number, h: number, bg: string, inner: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="${bg}"/>
    ${inner}
</svg>`;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const variant = ((searchParams.get("variant") ?? "mark") as Variant);
    if (!["mark", "wordmark", "square"].includes(variant)) {
        return NextResponse.json({ error: "invalid variant" }, { status: 400 });
    }
    const format = (searchParams.get("format") ?? "svg") as Format;
    if (!["svg", "png"].includes(format)) {
        return NextResponse.json({ error: "invalid format" }, { status: 400 });
    }
    const sizeRaw = parseInt(searchParams.get("size") ?? "", 10);

    // Resolve dimensions. Square + mark use one number for w & h.
    // Wordmark preserves its aspect ratio at the requested width.
    const defaults = SIZE_DEFAULTS[variant];
    let w = defaults.w;
    let h = defaults.h;
    if (Number.isFinite(sizeRaw)) {
        const clamped = Math.max(128, Math.min(4096, sizeRaw));
        if (variant === "wordmark") {
            const aspectH = clamped * (defaults.h / defaults.w);
            w = clamped;
            h = Math.round(aspectH);
        } else {
            w = clamped;
            h = clamped;
        }
    }

    const svg = buildSvg(variant, w, h);

    // `?download=1` flips disposition to `attachment` so the browser
    // saves the file instead of rendering it inline. Cross-origin / cache
    // edge cases sometimes ignore the anchor's `download` attribute, but
    // disposition=attachment is honoured even then.
    const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";

    if (format === "svg") {
        return new NextResponse(svg, {
            headers: {
                "Content-Type": "image/svg+xml; charset=utf-8",
                "Cache-Control": "public, max-age=86400, immutable",
                "Content-Disposition": `${disposition}; filename="mekar-${variant}-${w}x${h}.svg"`,
            },
        });
    }

    // PNG path via next/og. Satori renders the SVG to a raster: we put
    // the SVG content into an <img src="data:..."> inside the JSX so
    // next/og doesn't have to parse our wordmark by itself — it just
    // rasterises the embedded image.
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    try {
        return new ImageResponse(
            (
                <div
                    style={{
                        width: w,
                        height: h,
                        display: "flex",
                        alignItems: "stretch",
                        justifyContent: "stretch",
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={dataUri} width={w} height={h} alt="Mekar logo" />
                </div>
            ),
            {
                width: w,
                height: h,
                headers: {
                    "Content-Disposition": `${disposition}; filename="mekar-${variant}-${w}x${h}.png"`,
                    "Cache-Control": "public, max-age=86400, immutable",
                },
            }
        );
    } catch (err) {
        // If Satori chokes on the embedded SVG (font fetch failed,
        // unsupported element, etc.), fall back to returning the SVG
        // directly with a polite header that signals "you asked for PNG
        // but here's vector instead — your browser will still render
        // it." Better than a 500 mid-download.
        const reason = err instanceof Error ? err.message : "image-response failed";
        return new NextResponse(svg, {
            headers: {
                "Content-Type": "image/svg+xml; charset=utf-8",
                "Cache-Control": "no-store",
                "X-Mekar-Logo-Fallback": reason.slice(0, 120),
                "Content-Disposition": `${disposition}; filename="mekar-${variant}-${w}x${h}.svg"`,
            },
        });
    }
}

// Node runtime (not edge) so renderBloomSvg's Buffer base64 path works.
export const runtime = "nodejs";
