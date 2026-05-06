/**
 * Procedural flower SVG generator for MEKAR agents.
 *
 * Each agent's lineage type maps to a flower archetype:
 *   - Genesis (no parents)        → lotus (5 wide petals, stately)
 *   - Fork (1 parent)             → jasmine (5 narrow petals, side-blossom)
 *   - Compose (multi-parent)      → marigold (double-petal, layered)
 *
 * Within each archetype, the agent's tokenId / hash seeds:
 *   - Petal angle offset
 *   - Petal width variance
 *   - Stamen size
 *   - Hue rotation within the brand palette
 *
 * Output: a self-contained SVG string suitable for inline rendering
 * (lineage tree node, agent detail hero, NFT metadata image).
 */

export type BloomVariant = "lotus" | "jasmine" | "marigold";

export type BloomColors = {
  petalFill: string;
  petalStroke: string;
  centerFill: string;
  leafStroke: string;
};

export const BLOOM_PALETTES: Record<BloomVariant, BloomColors> = {
  lotus: {
    // Genesis — gold lotus
    petalFill: "#f1c95b",
    petalStroke: "#a87f1f",
    centerFill: "#fdf3d0",
    leafStroke: "#1c3b2f",
  },
  jasmine: {
    // Fork — pink jasmine
    petalFill: "#f5b7a0",
    petalStroke: "#a8533f",
    centerFill: "#fdf3d0",
    leafStroke: "#1c3b2f",
  },
  marigold: {
    // Compose — orange-gold marigold
    petalFill: "#e8884f",
    petalStroke: "#8a3815",
    centerFill: "#f1c95b",
    leafStroke: "#1c3b2f",
  },
};

/**
 * Determine bloom variant from lineage shape.
 */
export function variantFromLineage(parentCount: number): BloomVariant {
  if (parentCount === 0) return "lotus";
  if (parentCount === 1) return "jasmine";
  return "marigold";
}

/**
 * Deterministic pseudo-random based on a 32-byte hash or tokenId.
 * Returns a value in [0, 1).
 */
function seedRandom(seed: string | number, salt: number = 0): () => number {
  let state =
    typeof seed === "number"
      ? seed * 2654435761
      : Number(BigInt("0x" + seed.replace(/^0x/, "").slice(0, 8)) ?? 1);
  state = (state + salt * 16777619) >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

type RenderOptions = {
  size?: number;             // pixel size of the viewBox (square)
  alignmentHealth?: number;  // 0–10000 bp; affects petal wilt
  showLeaves?: boolean;
  className?: string;
};

/**
 * Render a bloom SVG string for the given agent.
 *
 * @param tokenId  — the agent's INFT id (used to seed variation)
 * @param variant  — bloom archetype derived from lineage
 * @param opts     — visual modifiers
 */
export function renderBloomSvg(
  tokenId: number,
  variant: BloomVariant,
  opts: RenderOptions = {}
): string {
  const size = opts.size ?? 120;
  const cx = size / 2;
  const cy = size / 2;
  const palette = BLOOM_PALETTES[variant];

  const rng = seedRandom(tokenId);

  const petalCount = variant === "marigold" ? 8 : 5;
  const petalLen = size * (variant === "lotus" ? 0.36 : variant === "marigold" ? 0.32 : 0.34);
  const petalWidthBase = size * (variant === "marigold" ? 0.13 : 0.18);
  const angleOffset = rng() * 360;
  const wiltRatio = opts.alignmentHealth !== undefined ? opts.alignmentHealth / 10_000 : 1;

  // ─────────── Petals ───────────
  const petalPaths: string[] = [];
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * 360 + angleOffset;
    const wobble = (rng() - 0.5) * 0.3;
    const len = petalLen * (1 - wobble * 0.2) * wiltRatio;
    const w = petalWidthBase * (1 + wobble * 0.4);
    petalPaths.push(makePetalPath(cx, cy, angle, len, w));
  }

  // For marigold, render an inner ring of smaller petals
  const innerPetals: string[] = [];
  if (variant === "marigold") {
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * 360 + angleOffset + 22.5;
      const len = petalLen * 0.6;
      const w = petalWidthBase * 0.85;
      innerPetals.push(makePetalPath(cx, cy, angle, len, w));
    }
  }

  // ─────────── Center stamen / coin ───────────
  const stamenR = size * (variant === "lotus" ? 0.08 : 0.07);

  // ─────────── Optional leaves ───────────
  const leafBlocks: string[] = [];
  if (opts.showLeaves !== false) {
    const leafAngles = [200, 340];
    for (const a of leafAngles) {
      leafBlocks.push(makeLeaf(cx, cy + size * 0.36, a, size * 0.18, palette.leafStroke));
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="${opts.className ?? ""}">
    <g transform="translate(0,0)">
      ${leafBlocks.join("")}
      ${innerPetals
        .map(
          (d) =>
            `<path d="${d}" fill="${palette.petalFill}" fill-opacity="0.6" stroke="${palette.petalStroke}" stroke-width="0.6" stroke-linejoin="round"/>`
        )
        .join("")}
      ${petalPaths
        .map(
          (d) =>
            `<path d="${d}" fill="${palette.petalFill}" stroke="${palette.petalStroke}" stroke-width="1" stroke-linejoin="round"/>`
        )
        .join("")}
      <circle cx="${cx}" cy="${cy}" r="${stamenR + 3}" fill="${palette.centerFill}" stroke="${palette.petalStroke}" stroke-width="0.8"/>
      <circle cx="${cx}" cy="${cy}" r="${stamenR}" fill="${palette.petalStroke}"/>
      <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle"
            font-family="JetBrains Mono, monospace" font-size="${stamenR * 0.9}" fill="${palette.centerFill}" font-weight="700">
        0G
      </text>
    </g>
  </svg>`;
}

function makePetalPath(cx: number, cy: number, angleDeg: number, length: number, width: number): string {
  const rad = (angleDeg * Math.PI) / 180;
  const tipX = cx + Math.cos(rad) * length;
  const tipY = cy + Math.sin(rad) * length;
  // Two control points perpendicular to the petal axis
  const perpRad = rad + Math.PI / 2;
  const c1x = cx + Math.cos(rad) * length * 0.3 + Math.cos(perpRad) * width;
  const c1y = cy + Math.sin(rad) * length * 0.3 + Math.sin(perpRad) * width;
  const c2x = cx + Math.cos(rad) * length * 0.7 + Math.cos(perpRad) * width;
  const c2y = cy + Math.sin(rad) * length * 0.7 + Math.sin(perpRad) * width;
  const c3x = cx + Math.cos(rad) * length * 0.7 - Math.cos(perpRad) * width;
  const c3y = cy + Math.sin(rad) * length * 0.7 - Math.sin(perpRad) * width;
  const c4x = cx + Math.cos(rad) * length * 0.3 - Math.cos(perpRad) * width;
  const c4y = cy + Math.sin(rad) * length * 0.3 - Math.sin(perpRad) * width;

  return `M ${cx},${cy} C ${c1x},${c1y} ${c2x},${c2y} ${tipX},${tipY} C ${c3x},${c3y} ${c4x},${c4y} ${cx},${cy} Z`;
}

function makeLeaf(cx: number, cy: number, angleDeg: number, length: number, color: string): string {
  const rad = (angleDeg * Math.PI) / 180;
  const tipX = cx + Math.cos(rad) * length;
  const tipY = cy + Math.sin(rad) * length;
  const perpRad = rad + Math.PI / 2;
  const sideX = cx + Math.cos(rad) * length * 0.5 + Math.cos(perpRad) * length * 0.25;
  const sideY = cy + Math.sin(rad) * length * 0.5 + Math.sin(perpRad) * length * 0.25;
  return `<path d="M ${cx},${cy} Q ${sideX},${sideY} ${tipX},${tipY}"
    fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.55"/>`;
}

/**
 * Convert an SVG string to a Base64 data URI suitable for an `<img src>`.
 */
export function svgToDataUri(svg: string): string {
  const encoded = typeof window === "undefined"
    ? Buffer.from(svg).toString("base64")
    : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}
