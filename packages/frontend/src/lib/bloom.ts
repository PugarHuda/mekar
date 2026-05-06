/**
 * Mekar — Procedural woodcut bloom renderer.
 *
 * Three archetypes mapped from lineage shape:
 *   • genesis  (0 parents)         — gold lotus, 6 petals + 6 inner petals
 *   • fork     (1 parent)          — pink jasmine, 6 petals
 *   • compose  (≥2 parents)        — gold + coral marigold, double-row
 *
 * Each bloom is seeded by tokenId/string so the same agent always renders
 * the same flower. Style is locked to "woodcut" per the Stitch handoff.
 *
 * Ported from .stitch-design/handoff/flowers.jsx (woodcut variant).
 */

export type BloomKind = "genesis" | "fork" | "compose" | "logo" | "bud" | "opening" | "scatter";

export type BloomPalette = {
    stroke: string;
    gold: string;
    pink: string;
    coral: string;
    forest: string;
    green: string;
    sw: number;
};

const DEFAULT_PALETTE: BloomPalette = {
    stroke: "#3d2817",
    gold: "#d4a437",
    pink: "#f5b7a0",
    coral: "#c25a4a",
    forest: "#1c3b2f",
    green: "#6b8a4b",
    sw: 1.2,
};

/* ─────────────── Hash → seeded RNG ─────────────── */

function hashSeed(str: string): () => number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return ((h >>> 0) % 100000) / 100000;
    };
}

/* ─────────────── Woodcut petal + hatching ─────────────── */

function woodPetal(length: number, width: number): string {
    return `M 0 0 C ${-width} ${-length * 0.4} ${-width * 0.4} ${-length} 0 ${-length} C ${width * 0.4} ${-length} ${width} ${-length * 0.4} 0 0 Z`;
}

function woodHatch(length: number, width: number, rng: () => number): string {
    let h = "";
    const lines = 3 + Math.floor(rng() * 2);
    for (let i = 1; i <= lines; i++) {
        const y = -length * (0.2 + i * 0.15);
        const x = width * (0.5 - i * 0.08);
        h += `<line x1="${-x}" y1="${y}" x2="${x}" y2="${y}" stroke="${DEFAULT_PALETTE.stroke}" stroke-width="0.6" stroke-linecap="round" opacity="0.5" />`;
    }
    return h;
}

/* ─────────────── Genesis — gold lotus ─────────────── */

function genesis(seed: string, o: BloomPalette): string {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.6;
    for (let i = 0; i < 6; i++) {
        const a = (360 / 6) * i;
        p += `<g transform="rotate(${a})" color="${o.stroke}">`;
        p += `<path d="${woodPetal(40, 14)}" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
        p += woodHatch(40, 14, rng);
        p += `</g>`;
    }
    for (let i = 0; i < 6; i++) {
        const a = (360 / 6) * i + 30;
        p += `<path d="${woodPetal(22, 9)}" transform="rotate(${a})" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw * 0.8}" stroke-linejoin="round" />`;
    }
    p += `<circle r="10" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="6" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw * 0.6}" />`;
    for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        p += `<line x1="${Math.cos(a) * 6}" y1="${Math.sin(a) * 6}" x2="${Math.cos(a) * 9.5}" y2="${Math.sin(a) * 9.5}" stroke="${o.stroke}" stroke-width="${sw * 0.5}" />`;
    }
    return p;
}

/* ─────────────── Fork — pink jasmine ─────────────── */

function fork(seed: string, o: BloomPalette): string {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.4;
    for (let i = 0; i < 6; i++) {
        const a = (360 / 6) * i;
        p += `<g transform="rotate(${a})" color="${o.stroke}">`;
        p += `<path d="${woodPetal(26, 10)}" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
        p += woodHatch(26, 10, rng);
        p += `</g>`;
    }
    p += `<circle r="6" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        p += `<line x1="${Math.cos(a) * 3}" y1="${Math.sin(a) * 3}" x2="${Math.cos(a) * 5.5}" y2="${Math.sin(a) * 5.5}" stroke="${o.stroke}" stroke-width="${sw * 0.5}" />`;
    }
    return p;
}

/* ─────────────── Compose — marigold double-bloom ─────────────── */

function compose(seed: string, o: BloomPalette): string {
    const rng = hashSeed(seed);
    let p = "";
    const sw = o.sw * 1.4;
    for (let i = 0; i < 8; i++) {
        const a = (360 / 8) * i;
        p += `<g transform="rotate(${a})" color="${o.stroke}">`;
        p += `<path d="${woodPetal(28, 8)}" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
        p += woodHatch(28, 8, rng);
        p += `</g>`;
    }
    for (let i = 0; i < 8; i++) {
        const a = (360 / 8) * i + 22.5;
        p += `<g transform="rotate(${a})" color="${o.stroke}">`;
        p += `<path d="${woodPetal(18, 6)}" fill="${o.coral}" stroke="${o.stroke}" stroke-width="${sw * 0.8}" stroke-linejoin="round" />`;
        p += woodHatch(18, 6, rng);
        p += `</g>`;
    }
    p += `<circle r="6" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="3" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw * 0.6}" />`;
    return p;
}

/* ─────────────── Logo — clean scalloped lotus mark ─────────────── */

function logoMark(o: BloomPalette): string {
    const sw = o.sw * 0.6;
    let p = "";

    const N = 5;
    const peakR = 16;
    const valleyR = 8;
    const pt = (angle: number, r: number): [number, number] => {
        const rad = ((angle - 90) * Math.PI) / 180;
        return [Math.cos(rad) * r, Math.sin(rad) * r];
    };

    let outerD = "";
    for (let i = 0; i < N; i++) {
        const aPeak = (360 / N) * i;
        const aValley = aPeak + 360 / N / 2;
        const aValleyPrev = aPeak - 360 / N / 2;
        const [vx, vy] = pt(aValley, valleyR);
        const [vxp, vyp] = pt(aValleyPrev, valleyR);
        const [cp1x, cp1y] = pt(aPeak - 14, peakR * 0.95);
        const [cp2x, cp2y] = pt(aPeak + 14, peakR * 0.95);
        if (i === 0) outerD += `M ${vxp} ${vyp} `;
        outerD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${vx} ${vy} `;
    }
    outerD += "Z";
    p += `<path d="${outerD}" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw * 1.4}" stroke-linejoin="round" />`;

    // Radial veins
    for (let i = 0; i < N; i++) {
        const aPeak = (360 / N) * i;
        const [tipX, tipY] = pt(aPeak, peakR * 0.78);
        const [innerX, innerY] = pt(aPeak, 5);
        p += `<line x1="${innerX}" y1="${innerY}" x2="${tipX}" y2="${tipY}" stroke="${o.stroke}" stroke-width="${sw * 0.6}" opacity="0.55" stroke-linecap="round" />`;
    }

    // Inner scalloped silhouette
    const peakR2 = 8;
    const valleyR2 = 4.2;
    let innerD = "";
    for (let i = 0; i < N; i++) {
        const aPeak = (360 / N) * i + 36;
        const aValley = aPeak + 360 / N / 2;
        const aValleyPrev = aPeak - 360 / N / 2;
        const [vx, vy] = pt(aValley, valleyR2);
        const [vxp, vyp] = pt(aValleyPrev, valleyR2);
        const [cp1x, cp1y] = pt(aPeak - 14, peakR2 * 0.95);
        const [cp2x, cp2y] = pt(aPeak + 14, peakR2 * 0.95);
        if (i === 0) innerD += `M ${vxp} ${vyp} `;
        innerD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${vx} ${vy} `;
    }
    innerD += "Z";
    p += `<path d="${innerD}" fill="${o.pink}" stroke="${o.stroke}" stroke-width="${sw * 1.2}" stroke-linejoin="round" />`;

    p += `<circle r="2.4" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    p += `<circle r="1.1" fill="${o.gold}" />`;

    return p;
}

/* ─────────────── Stages: bud, opening, scatter ─────────────── */

function bud(o: BloomPalette): string {
    const sw = o.sw * 1.2;
    return `<path d="M 0 6 C -10 6 -12 -10 0 -22 C 12 -10 10 6 0 6 Z" fill="${o.green}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />
    <path d="M 0 -22 C -3 -16 -3 -8 0 -2" fill="none" stroke="${o.stroke}" stroke-width="${sw * 0.6}" />
    <path d="M 0 -22 C 3 -16 3 -8 0 -2" fill="none" stroke="${o.stroke}" stroke-width="${sw * 0.6}" />`;
}

function opening(o: BloomPalette): string {
    const sw = o.sw * 1.2;
    let p = "";
    for (let i = 0; i < 3; i++) {
        const a = -40 + i * 40;
        p += `<path d="${woodPetal(22, 8)}" transform="rotate(${a})" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" />`;
    }
    p += `<circle r="3" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />`;
    return p;
}

function scatter(o: BloomPalette): string {
    const sw = o.sw * 1.2;
    let p = "";
    for (let i = 0; i < 6; i++) {
        const a = (360 / 6) * i;
        p += `<path d="${woodPetal(20, 7)}" transform="rotate(${a})" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw}" stroke-linejoin="round" opacity="0.85" />`;
    }
    let s = "";
    [
        [-22, 18],
        [-10, 28],
        [4, 22],
        [16, 30],
        [22, 14],
        [-18, 36],
        [10, 38],
    ].forEach(([x, y]) => {
        s += `<circle cx="${x}" cy="${y}" r="2" fill="${o.gold}" stroke="${o.stroke}" stroke-width="${sw * 0.5}" />`;
    });
    return `<g transform="translate(0,-6)">${p}</g><circle cy="-6" r="3.5" fill="${o.forest}" stroke="${o.stroke}" stroke-width="${sw}" />${s}`;
}

/* ─────────────── Public API ─────────────── */

const KIND_FN: Record<string, (seed: string, o: BloomPalette) => string> = {
    genesis,
    fork,
    compose,
};

export function variantFromLineage(parentCount: number): "genesis" | "fork" | "compose" {
    if (parentCount === 0) return "genesis";
    if (parentCount === 1) return "fork";
    return "compose";
}

export function renderBloomSvg(
    kind: BloomKind,
    seed: string | number,
    options: { size?: number; sw?: number; palette?: Partial<BloomPalette> } = {}
): string {
    const size = options.size ?? 120;
    const half = size / 2;
    const sw = options.sw ?? 1.2;
    const palette: BloomPalette = { ...DEFAULT_PALETTE, ...(options.palette ?? {}), sw };
    const seedStr = String(seed);

    let inner: string;
    if (kind === "logo") inner = logoMark(palette);
    else if (kind === "bud") inner = bud(palette);
    else if (kind === "opening") inner = opening(palette);
    else if (kind === "scatter") inner = scatter(palette);
    else {
        const fn = KIND_FN[kind] ?? KIND_FN.genesis;
        inner = fn(seedStr, palette);
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-${half} -${half} ${size} ${size}" width="${size}" height="${size}">${inner}</svg>`;
}

export function svgToDataUri(svg: string): string {
    if (typeof window === "undefined") {
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    }
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
