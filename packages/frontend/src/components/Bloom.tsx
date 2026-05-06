"use client";

import { useMemo } from "react";
import { renderBloomSvg, svgToDataUri, variantFromLineage, type BloomKind } from "@/lib/bloom";

type Props = {
    /** Override the bloom variant directly (else derived from `parentCount`). */
    kind?: BloomKind;
    /** Lineage shape: 0 → genesis, 1 → fork, 2+ → compose. Ignored if `kind` is set. */
    parentCount?: number;
    /** Token id or any string used to seed the procedural variation. */
    seed: number | string;
    size?: number;
    /** Stroke weight modifier; 1.2 default, 1.6 for emphasis. */
    sw?: number;
    className?: string;
    alt?: string;
};

/**
 * Render a procedural Mekar bloom as an inline `<img>` driven by a data URI.
 *
 * The SVG is generated locally from numeric inputs only; nothing
 * user-supplied ends up inside the markup, so there is no XSS surface.
 */
export function Bloom({ kind, parentCount = 0, seed, size = 120, sw, className, alt = "Agent bloom" }: Props) {
    const dataUri = useMemo(() => {
        const resolved: BloomKind = kind ?? variantFromLineage(parentCount);
        const svg = renderBloomSvg(resolved, seed, { size, sw });
        return svgToDataUri(svg);
    }, [kind, parentCount, seed, size, sw]);

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUri} width={size} height={size} alt={alt} className={className} />
    );
}

/**
 * The lotus mark — used in nav, footer, favicons. Always woodcut, always seeded
 * with "logo" so it stays consistent across renders.
 */
export function BloomLogo({ size = 36, sw = 1.6, className }: { size?: number; sw?: number; className?: string }) {
    return <Bloom kind="logo" seed="logo" size={size} sw={sw} className={className} alt="Mekar logo" />;
}
