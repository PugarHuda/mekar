"use client";

import { useMemo } from "react";
import {
  renderBloomSvg,
  svgToDataUri,
  variantFromLineage,
  type BloomVariant,
} from "@/lib/bloom";

type Props = {
  tokenId: number;
  parentCount: number;
  size?: number;
  alignmentHealth?: number;
  showLeaves?: boolean;
  className?: string;
  alt?: string;
};

/**
 * Render a procedural bloom for an agent.
 *
 * The bloom shape is derived from the agent's lineage type:
 *   • 0 parents → lotus (genesis)
 *   • 1 parent  → jasmine (fork)
 *   • 2+ parents → marigold (compose)
 *
 * Variation within an archetype is seeded by the tokenId, so each
 * agent gets a unique bloom that stays consistent across renders.
 *
 * The SVG is built locally from numeric inputs only (no user-provided
 * strings end up inside the markup), then served as a data: URI to
 * avoid any inline-HTML XSS surface.
 */
export function Bloom({
  tokenId,
  parentCount,
  size = 120,
  alignmentHealth,
  showLeaves = true,
  className,
  alt = "Agent bloom",
}: Props) {
  const dataUri = useMemo(() => {
    const variant: BloomVariant = variantFromLineage(parentCount);
    const svg = renderBloomSvg(tokenId, variant, { size, alignmentHealth, showLeaves });
    return svgToDataUri(svg);
  }, [tokenId, parentCount, size, alignmentHealth, showLeaves]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUri} width={size} height={size} alt={alt} className={className} />;
}

// Backwards-compat alias for callers that imported the old name.
export const BloomImage = Bloom;
