"use client";

/**
 * CodeBloom — port of `codebloom.jsx` from the Stitch handoff.
 *
 * The hero bloom: a large botanical SVG with 5 outer + 5 inner petals,
 * a curved stem with two leaves, a stamen disk and orbiting pollen.
 * Style variants (`outline`, `fill`, `code`, `tokenfill`, `woodcut`,
 * `geometric`) are kept so a future Tweaks panel can switch between
 * them; the production default is `woodcut` per the design chat.
 */

import { useEffect, useMemo, useRef, useState } from "react";

export type CodeBloomStyle =
    | "outline"
    | "fill"
    | "code"
    | "tokenfill"
    | "woodcut"
    | "geometric";

type Palette = {
    gold?: string;
    goldSoft?: string;
    pink?: string;
    pinkSoft?: string;
    coral?: string;
    forest?: string;
    green?: string;
    greenSoft?: string;
    ink?: string;
    cream?: string;
};

type Props = {
    width?: number;
    height?: number;
    seed?: string;
    style?: CodeBloomStyle;
    palette?: Palette;
};

const PETAL_TOKENS = [
    "0xa3f1", "weights", "llama", "fp16", "tensor", "qwen", "0xc940", "h=4096",
    "mistral", "0xb27c", "rope", "vocab", "MoE", "0x71a8", "lora", "ckpt",
    "RLHF", "DPO", "0xd118", "0xe22a", "step", "lr=3e-4", "epoch", "BF16",
    "0x44dd", "softmax", "GGUF", "params", "attn", "qkv", "mlp", "norm",
];
const STEM_TOKENS = ["0x6b3a4f", "0xa1b8c2", "owner", "parent", "lineage", "genesis", "0x55d091"];
const LEAF_TOKENS = ["[CC-BY]", "[MIT]", "[Apache]", "corpus", "data", "v3"];

function mkRng(s: string): () => number {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return ((h >>> 0) % 100000) / 100000;
    };
}

function petalPath(length: number, width: number, pinch = 0.35): string {
    const tipY = -length;
    const w = width;
    const ctrlY1 = -length * 0.3;
    const ctrlY2 = -length * 0.85;
    return [
        `M 0 0`,
        `C ${w * pinch} ${ctrlY1}, ${w} ${ctrlY1 - 10}, ${w * 0.85} ${ctrlY2}`,
        `C ${w * 0.6} ${ctrlY2 - 10}, ${w * 0.18} ${tipY + 8}, 0 ${tipY}`,
        `C ${-w * 0.18} ${tipY + 8}, ${-w * 0.6} ${ctrlY2 - 10}, ${-w * 0.85} ${ctrlY2}`,
        `C ${-w} ${ctrlY1 - 10}, ${-w * pinch} ${ctrlY1}, 0 0`,
        `Z`,
    ].join(" ");
}

function leafPath(length: number, width: number): string {
    const tipY = -length;
    return [
        `M 0 0`,
        `C ${width * 0.6} ${-length * 0.2}, ${width} ${-length * 0.55}, 0 ${tipY}`,
        `C ${-width} ${-length * 0.55}, ${-width * 0.6} ${-length * 0.2}, 0 0`,
        `Z`,
    ].join(" ");
}

function petalEnvelope(t: number, _length: number, width: number): number {
    const swell = Math.sin(Math.pow(t, 0.7) * Math.PI);
    const taper = 1 - Math.pow(Math.max(0, t - 0.92) / 0.08, 2);
    return width * swell * Math.max(0, Math.min(1, taper));
}

function samplePetal(
    rng: () => number,
    length: number,
    width: number,
    count: number
): { x: number; y: number; t: number }[] {
    const pts: { x: number; y: number; t: number }[] = [];
    let attempts = 0;
    while (pts.length < count && attempts < count * 20) {
        attempts++;
        const t = rng();
        const env = petalEnvelope(t, length, width);
        const lateral = (rng() * 2 - 1) * env;
        pts.push({ x: lateral, y: -t * length, t });
    }
    return pts;
}

function sampleLeaf(
    rng: () => number,
    length: number,
    width: number,
    count: number
): { x: number; y: number; t: number }[] {
    const pts: { x: number; y: number; t: number }[] = [];
    let attempts = 0;
    while (pts.length < count && attempts < count * 20) {
        attempts++;
        const t = rng();
        const env =
            Math.sin(Math.pow(t, 0.6) * Math.PI) *
            width *
            (1 - Math.pow(Math.max(0, t - 0.92) / 0.08, 2));
        const lateral = (rng() * 2 - 1) * Math.max(0, env);
        pts.push({ x: lateral, y: -t * length, t });
    }
    return pts;
}

function stemPath(x0: number, y0: number, x1: number, y1: number): string {
    const cx1 = x0 + 35,
        cy1 = y0 + (y1 - y0) * 0.35;
    const cx2 = x1 - 35,
        cy2 = y0 + (y1 - y0) * 0.65;
    return `M ${x0} ${y0} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x1} ${y1}`;
}

function pointOnCubic(
    t: number,
    x0: number,
    y0: number,
    cx1: number,
    cy1: number,
    cx2: number,
    cy2: number,
    x1: number,
    y1: number
): { x: number; y: number } {
    const mt = 1 - t;
    return {
        x:
            mt * mt * mt * x0 +
            3 * mt * mt * t * cx1 +
            3 * mt * t * t * cx2 +
            t * t * t * x1,
        y:
            mt * mt * mt * y0 +
            3 * mt * mt * t * cy1 +
            3 * mt * t * t * cy2 +
            t * t * t * y1,
    };
}

type TokenDot = {
    x: number;
    y: number;
    token: string;
    color: string;
    rot: number;
    fontSize: number;
    opacity: number;
    phase: number;
};

export function CodeBloom({
    width: W = 720,
    height: H = 880,
    seed = "mekar-hero",
    style = "woodcut",
    palette = {},
}: Props) {
    const {
        gold = "#b8881e",
        goldSoft = "#e8c97a",
        pink = "#c2705a",
        pinkSoft = "#f5b7a0",
        coral = "#a04130",
        forest = "#1c3b2f",
        green = "#5d7a3b",
        greenSoft = "#9bb37b",
        ink = "#3d2817",
    } = palette;

    const [tick, setTick] = useState(0);
    const rafRef = useRef<number | null>(null);
    useEffect(() => {
        const start = performance.now();
        const loop = (now: number) => {
            setTick((now - start) / 1000);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const cx = W / 2;
    const cy = H * 0.32;

    const bloomSway = Math.sin(tick * 0.55) * 2.2 + Math.sin(tick * 1.6 + 1) * 0.4;
    const stemSway = Math.sin(tick * 0.42) * 0.8;
    const leafASway = Math.sin(tick * 0.7 + 0.5) * 3.5;
    const leafBSway = Math.sin(tick * 0.65 + 2) * 3.5;

    const PETALS_OUTER = 5;
    const PETALS_INNER = 5;
    const outerLen = 215,
        outerW = 78;
    const innerLen = 128,
        innerW = 50;
    const stemTopY = cy + 18;
    const stemBotY = H - 24;

    const stemX0 = cx,
        stemY0 = stemTopY;
    const stemX1 = cx,
        stemY1 = stemBotY;
    const stemCx1 = stemX0 + 35,
        stemCy1 = stemY0 + (stemY1 - stemY0) * 0.35;
    const stemCx2 = stemX1 - 35,
        stemCy2 = stemY0 + (stemY1 - stemY0) * 0.65;
    const leafA_anchor = pointOnCubic(
        0.42, stemX0, stemY0, stemCx1, stemCy1, stemCx2, stemCy2, stemX1, stemY1
    );
    const leafB_anchor = pointOnCubic(
        0.72, stemX0, stemY0, stemCx1, stemCy1, stemCx2, stemCy2, stemX1, stemY1
    );

    const tokenData = useMemo(() => {
        if (style !== "code" && style !== "tokenfill") return null;
        const rng = mkRng(seed + "-tokens");
        const all: {
            outer: TokenDot[];
            inner: TokenDot[];
            stamen: TokenDot[];
            stem: TokenDot[];
            leafA: TokenDot[];
            leafB: TokenDot[];
        } = { outer: [], inner: [], stamen: [], stem: [], leafA: [], leafB: [] };

        const outerCount = style === "code" ? 90 : 28;
        const innerCount = style === "code" ? 55 : 18;

        for (let p = 0; p < PETALS_OUTER; p++) {
            const angle = (360 / PETALS_OUTER) * p - 90;
            const rad = (angle * Math.PI) / 180;
            const cosA = Math.cos(rad),
                sinA = Math.sin(rad);
            const pts = samplePetal(rng, outerLen, outerW, outerCount);
            pts.forEach((pt) => {
                const env = petalEnvelope(pt.t, outerLen, outerW);
                const lr = env > 0 ? Math.abs(pt.x) / env : 0;
                const xr = pt.x * cosA - pt.y * sinA;
                const yr = pt.x * sinA + pt.y * cosA;
                let token: string;
                if (lr > 0.85) token = ["·", "•", "◦", "+"][Math.floor(rng() * 4)];
                else if (lr > 0.7) token = ["fp16", "MoE", "v3", "rope"][Math.floor(rng() * 4)];
                else token = PETAL_TOKENS[Math.floor(rng() * PETAL_TOKENS.length)];
                all.outer.push({
                    x: cx + xr,
                    y: cy + yr,
                    token,
                    color: gold,
                    rot: angle + (rng() - 0.5) * 8,
                    fontSize: 8.5 + rng() * 2.5,
                    opacity: 0.7 + rng() * 0.25,
                    phase: rng() * Math.PI * 2,
                });
            });
        }
        for (let p = 0; p < PETALS_INNER; p++) {
            const angle = (360 / PETALS_INNER) * p - 90 + 36;
            const rad = (angle * Math.PI) / 180;
            const cosA = Math.cos(rad),
                sinA = Math.sin(rad);
            const pts = samplePetal(rng, innerLen, innerW, innerCount);
            pts.forEach((pt) => {
                const env = petalEnvelope(pt.t, innerLen, innerW);
                const lr = env > 0 ? Math.abs(pt.x) / env : 0;
                const xr = pt.x * cosA - pt.y * sinA;
                const yr = pt.x * sinA + pt.y * cosA;
                let token: string;
                if (lr > 0.85) token = ["·", "◦"][Math.floor(rng() * 2)];
                else if (lr > 0.7) token = ["lora", "DPO", "v3"][Math.floor(rng() * 3)];
                else token = PETAL_TOKENS[Math.floor(rng() * PETAL_TOKENS.length)];
                all.inner.push({
                    x: cx + xr,
                    y: cy + yr,
                    token,
                    color: coral,
                    rot: angle + (rng() - 0.5) * 8,
                    fontSize: 8 + rng() * 2,
                    opacity: 0.75 + rng() * 0.2,
                    phase: rng() * Math.PI * 2,
                });
            });
        }
        for (let i = 0; i < 22; i++) {
            const a = (Math.PI * 2 * i) / 22;
            const r = 18 + (i % 3) * 2;
            all.stamen.push({
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r,
                token: i % 4 === 0 ? "◉" : i % 2 ? "1" : "0",
                color: i % 4 === 0 ? gold : forest,
                rot: 0,
                fontSize: 9 + (i % 4 === 0 ? 1.5 : 0),
                opacity: 0.85,
                phase: rng() * Math.PI * 2,
            });
        }
        if (style === "code") {
            for (let pass = 0; pass < 2; pass++) {
                const off = pass === 0 ? -4 : 4;
                for (let i = 0; i < 22; i++) {
                    const t = i / 21;
                    const p = pointOnCubic(
                        t, stemX0, stemY0, stemCx1, stemCy1, stemCx2, stemCy2, stemX1, stemY1
                    );
                    all.stem.push({
                        x: p.x + off + (rng() - 0.5) * 3,
                        y: p.y,
                        token: STEM_TOKENS[Math.floor(rng() * STEM_TOKENS.length)],
                        color: ink,
                        fontSize: 8,
                        opacity: 0.55 + rng() * 0.25,
                        rot: (rng() - 0.5) * 10,
                        phase: rng() * Math.PI * 2,
                    });
                }
            }
        }
        const leafACount = style === "code" ? 32 : 10;
        const leafBCount = style === "code" ? 26 : 8;
        const lpA = sampleLeaf(rng, 150, 50, leafACount);
        const lpB = sampleLeaf(rng, 130, 42, leafBCount);
        lpA.forEach((pt) =>
            all.leafA.push({
                x: pt.x,
                y: pt.y,
                token: LEAF_TOKENS[Math.floor(rng() * LEAF_TOKENS.length)],
                color: green,
                fontSize: 8 + rng() * 1.5,
                opacity: 0.7,
                rot: (rng() - 0.5) * 12,
                phase: rng() * Math.PI * 2,
            })
        );
        lpB.forEach((pt) =>
            all.leafB.push({
                x: pt.x,
                y: pt.y,
                token: LEAF_TOKENS[Math.floor(rng() * LEAF_TOKENS.length)],
                color: green,
                fontSize: 8 + rng() * 1.5,
                opacity: 0.7,
                rot: (rng() - 0.5) * 12,
                phase: rng() * Math.PI * 2,
            })
        );
        return all;
    }, [
        style, seed, cx, cy, stemX0, stemY0, stemCx1, stemCy1, stemCx2, stemCy2, stemX1, stemY1,
        gold, pink, coral, forest, green, ink,
    ]);

    const fallerConfigs = useMemo(() => {
        const r = mkRng(seed + "-fc");
        return Array.from({ length: 7 }).map((_, i) => ({
            offsetX: (r() - 0.5) * 460,
            delay: i * 90,
            token: PETAL_TOKENS[Math.floor(r() * PETAL_TOKENS.length)],
            colorIdx: i % 3,
        }));
    }, [seed]);

    const fallers = fallerConfigs.map((c, i) => {
        const phase = (tick * 18 + c.delay) % 700;
        const baseX = cx + c.offsetX;
        const fx = baseX + Math.sin((tick + i) * 0.5) * 16;
        const fy = cy - 130 + phase;
        const opacityRamp =
            phase < 60 ? phase / 60 : Math.max(0, 1 - (phase - 60) / 600);
        return {
            x: fx,
            y: fy,
            token: c.token,
            rot: Math.sin(tick * 0.5 + i) * 35,
            opacity: opacityRamp * 0.45,
            color: c.colorIdx === 0 ? gold : c.colorIdx === 1 ? pink : coral,
        };
    });

    const isOutline = style === "outline" || style === "code";
    const useFill =
        style === "fill" ||
        style === "tokenfill" ||
        style === "woodcut" ||
        style === "geometric";
    const useTokens = style === "code" || style === "tokenfill";
    const useHatch = style === "woodcut";
    const isGeo = style === "geometric";

    const outerFill = !useFill ? "none" : isGeo ? gold : goldSoft;
    const innerFill = !useFill ? "none" : isGeo ? pink : pinkSoft;
    const outerStroke = isGeo ? "none" : useHatch ? ink : style === "fill" ? gold : ink;
    const innerStroke = isGeo ? "none" : useHatch ? ink : style === "fill" ? coral : ink;
    const strokeW_outer = useHatch ? 2.2 : isOutline ? 1.4 : 1.1;
    const strokeW_inner = useHatch ? 2 : isOutline ? 1.2 : 1;
    const fillOpacity =
        style === "fill" ? 0.55 : style === "tokenfill" ? 0.32 : 1;

    const outerD = petalPath(outerLen, outerW, 0.35);
    const innerD = petalPath(innerLen, innerW, 0.4);
    const leafA_d = leafPath(150, 50);
    const leafB_d = leafPath(130, 42);

    function petalHatch(length: number, width: number, key: string) {
        const lines: React.ReactNode[] = [];
        const count = 6;
        for (let i = 1; i <= count; i++) {
            const t = i / (count + 1);
            const env = petalEnvelope(t, length, width) * 0.85;
            const y = -t * length;
            lines.push(
                <line
                    key={`${key}-h${i}`}
                    x1={-env}
                    y1={y}
                    x2={env}
                    y2={y}
                    stroke={ink}
                    strokeWidth="0.6"
                    opacity="0.5"
                />
            );
        }
        return lines;
    }

    function Token({ d }: { d: TokenDot }) {
        const shim = Math.sin(tick * 1.3 + (d.phase || 0)) * 0.15;
        const op = Math.max(0, Math.min(1, (d.opacity || 0.8) + shim));
        return (
            <text
                x={d.x}
                y={d.y}
                fontSize={d.fontSize}
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontWeight="500"
                fill={d.color}
                opacity={op}
                transform={`rotate(${d.rot} ${d.x} ${d.y})`}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ pointerEvents: "none" }}
            >
                {d.token}
            </text>
        );
    }

    const soilDots = [];
    for (let i = 0; i < 38; i++) {
        const x = (i / 37) * W;
        const y = H - 14 + Math.sin(i * 0.7) * 3;
        soilDots.push(
            <circle key={`s${i}`} cx={x} cy={y} r="1.2" fill={ink} opacity="0.32" />
        );
    }

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            style={{ display: "block" }}
            aria-hidden="true"
        >
            <defs>
                <radialGradient id="cb-glow-v5" cx="50%" cy="32%" r="40%">
                    <stop offset="0%" stopColor={gold} stopOpacity="0.16" />
                    <stop offset="55%" stopColor={pink} stopOpacity="0.05" />
                    <stop offset="100%" stopColor={gold} stopOpacity="0" />
                </radialGradient>
                <radialGradient id="cb-petal-grad" cx="50%" cy="80%" r="80%">
                    <stop offset="0%" stopColor={goldSoft} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={gold} stopOpacity="0.5" />
                </radialGradient>
                <radialGradient id="cb-pinner-grad" cx="50%" cy="80%" r="80%">
                    <stop offset="0%" stopColor={pinkSoft} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={pink} stopOpacity="0.5" />
                </radialGradient>
            </defs>

            <rect width={W} height={H} fill="url(#cb-glow-v5)" />

            {/* STEM + LEAVES */}
            <g
                style={{
                    transformOrigin: `${cx}px ${H - 24}px`,
                    transform: `rotate(${stemSway}deg)`,
                }}
            >
                <path
                    d={stemPath(stemX0, stemY0, stemX1, stemY1)}
                    stroke={isGeo ? green : ink}
                    strokeWidth={isGeo ? 4 : useHatch ? 3.5 : 2}
                    fill="none"
                    strokeLinecap="round"
                    opacity={useTokens && style === "code" ? 0.25 : 0.9}
                />

                <g
                    style={{
                        transformOrigin: `${leafA_anchor.x}px ${leafA_anchor.y}px`,
                        transform: `rotate(${leafASway}deg)`,
                    }}
                >
                    <g
                        transform={`translate(${leafA_anchor.x}, ${leafA_anchor.y}) rotate(225)`}
                    >
                        <path
                            d={leafA_d}
                            fill={useFill ? (isGeo ? green : greenSoft) : "none"}
                            fillOpacity={fillOpacity}
                            stroke={isGeo ? "none" : ink}
                            strokeWidth={useHatch ? 1.8 : 1.2}
                        />
                        {!isGeo && (
                            <path
                                d="M 0 0 L 0 -150"
                                stroke={ink}
                                strokeWidth="0.8"
                                opacity="0.5"
                            />
                        )}
                        {useTokens && tokenData &&
                            tokenData.leafA.map((d, i) => <Token key={`la-${i}`} d={d} />)}
                    </g>
                </g>

                <g
                    style={{
                        transformOrigin: `${leafB_anchor.x}px ${leafB_anchor.y}px`,
                        transform: `rotate(${leafBSway}deg)`,
                    }}
                >
                    <g
                        transform={`translate(${leafB_anchor.x}, ${leafB_anchor.y}) rotate(135)`}
                    >
                        <path
                            d={leafB_d}
                            fill={useFill ? (isGeo ? green : greenSoft) : "none"}
                            fillOpacity={fillOpacity}
                            stroke={isGeo ? "none" : ink}
                            strokeWidth={useHatch ? 1.8 : 1.2}
                        />
                        {!isGeo && (
                            <path
                                d="M 0 0 L 0 -130"
                                stroke={ink}
                                strokeWidth="0.8"
                                opacity="0.5"
                            />
                        )}
                        {useTokens && tokenData &&
                            tokenData.leafB.map((d, i) => <Token key={`lb-${i}`} d={d} />)}
                    </g>
                </g>

                {useTokens && style === "code" && tokenData &&
                    tokenData.stem.map((d, i) => <Token key={`st-${i}`} d={d} />)}
            </g>

            {/* BLOOM */}
            <g
                style={{
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: `rotate(${bloomSway}deg)`,
                }}
            >
                <g transform={`translate(${cx}, ${cy})`}>
                    {Array.from({ length: PETALS_OUTER }).map((_, p) => {
                        const angle = (360 / PETALS_OUTER) * p - 90;
                        return (
                            <g key={`op${p}`} transform={`rotate(${angle})`}>
                                <path
                                    d={outerD}
                                    fill={
                                        useFill
                                            ? style === "fill"
                                                ? "url(#cb-petal-grad)"
                                                : outerFill
                                            : "none"
                                    }
                                    fillOpacity={fillOpacity}
                                    stroke={outerStroke}
                                    strokeWidth={strokeW_outer}
                                    strokeLinejoin="round"
                                />
                                {useHatch && petalHatch(outerLen, outerW, `op${p}`)}
                            </g>
                        );
                    })}
                </g>
                {useTokens && tokenData &&
                    tokenData.outer.map((d, i) => <Token key={`tox-${i}`} d={d} />)}

                <g transform={`translate(${cx}, ${cy})`}>
                    {Array.from({ length: PETALS_INNER }).map((_, p) => {
                        const angle = (360 / PETALS_INNER) * p - 90 + 36;
                        return (
                            <g key={`ip${p}`} transform={`rotate(${angle})`}>
                                <path
                                    d={innerD}
                                    fill={
                                        useFill
                                            ? style === "fill"
                                                ? "url(#cb-pinner-grad)"
                                                : innerFill
                                            : "none"
                                    }
                                    fillOpacity={fillOpacity}
                                    stroke={innerStroke}
                                    strokeWidth={strokeW_inner}
                                    strokeLinejoin="round"
                                />
                                {useHatch && petalHatch(innerLen, innerW, `ip${p}`)}
                            </g>
                        );
                    })}
                </g>
                {useTokens && tokenData &&
                    tokenData.inner.map((d, i) => <Token key={`tix-${i}`} d={d} />)}

                <g transform={`translate(${cx}, ${cy})`}>
                    <circle
                        r="28"
                        fill={useFill ? (isGeo ? forest : "#f1d99a") : "none"}
                        fillOpacity={isGeo ? 1 : 0.7}
                        stroke={isGeo ? "none" : ink}
                        strokeWidth={useHatch ? 1.8 : 1.2}
                    />
                    {!isGeo &&
                        Array.from({ length: 14 }).map((_, i) => {
                            const a = (Math.PI * 2 * i) / 14;
                            return (
                                <circle
                                    key={`sd${i}`}
                                    cx={Math.cos(a) * 18}
                                    cy={Math.sin(a) * 18}
                                    r="1.6"
                                    fill={ink}
                                />
                            );
                        })}
                    <circle
                        r="9"
                        fill={isGeo ? gold : "#e8c97a"}
                        stroke={ink}
                        strokeWidth="1"
                    />
                    <circle r="3.5" fill="none" stroke={ink} strokeWidth="0.8" />
                    {useTokens && tokenData &&
                        tokenData.stamen.map((d, i) => <Token key={`sx-${i}`} d={d} />)}
                </g>

                {Array.from({ length: 7 }).map((_, i) => {
                    const a = (Math.PI * 2 * i) / 7 + tick * 0.18;
                    const r = 38;
                    return (
                        <circle
                            key={`pl${i}`}
                            cx={cx + Math.cos(a) * r}
                            cy={cy + Math.sin(a) * r}
                            r="1.4"
                            fill={gold}
                            opacity="0.7"
                        />
                    );
                })}
            </g>

            {fallers.map((f, i) => (
                <text
                    key={`fa-${i}`}
                    x={f.x}
                    y={f.y}
                    fontSize="10"
                    fontFamily="'JetBrains Mono', monospace"
                    fill={f.color}
                    opacity={f.opacity}
                    transform={`rotate(${f.rot} ${f.x} ${f.y})`}
                    textAnchor="middle"
                >
                    {f.token}
                </text>
            ))}

            {soilDots}
        </svg>
    );
}
