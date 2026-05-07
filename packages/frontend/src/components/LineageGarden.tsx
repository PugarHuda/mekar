"use client";

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
} from "react";
import * as d3 from "d3";
import type { LineageNode, LineageEdge } from "@/hooks/useLineageData";
import { renderBloomSvg, svgToDataUri, variantFromLineage } from "@/lib/bloom";

export type LineageGardenHandle = {
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
};

type Props = {
    nodes: LineageNode[];
    edges: LineageEdge[];
    onSelect?: (n: LineageNode) => void;
    height?: number;
    selectedId?: number | null;
};

type SimNode = LineageNode & d3.SimulationNodeDatum & {
    /** stable bloom data uri so we don't recompute every tick */
    href: string;
    radius: number;
};
type SimEdge = d3.SimulationLinkDatum<SimNode>;

const sizeFor = (parentCount: number) =>
    parentCount === 0 ? 110 : parentCount >= 2 ? 92 : 72;

/**
 * Force-directed lineage canvas with bloom-as-node visuals.
 *
 * Movement and physics mirror the pre-redesign D3 implementation —
 * blooms repel each other, edges pull connected nodes together, drag
 * a flower and the rest of the garden flexes around it. Edges are
 * recomputed every simulation tick, so they stay perfectly attached
 * to bloom centres no matter how the graph is rearranged.
 */
export const LineageGarden = forwardRef<LineageGardenHandle, Props>(function LineageGarden(
    { nodes, edges, onSelect, height = 600, selectedId },
    ref
) {
    const svgRef = useRef<SVGSVGElement>(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // Memoise bloom data URIs so simulation re-binds don't redraw the SVG.
    const nodesWithHref = useMemo(() => {
        return nodes.map((n) => {
            const variant = variantFromLineage(n.parents.length);
            const radius = sizeFor(n.parents.length);
            const svg = renderBloomSvg(variant, String(n.id), {
                size: radius,
                sw: 1.2,
            });
            const href = svgToDataUri(svg);
            return { ...n, href, radius };
        });
    }, [nodes]);

    useEffect(() => {
        const el = svgRef.current;
        if (!el || nodesWithHref.length === 0) return;

        const svg = d3.select(el);
        const width = el.clientWidth || 1100;
        svg.attr("viewBox", `0 0 ${width} ${height}`).attr(
            "preserveAspectRatio",
            "xMidYMid meet"
        );

        svg.selectAll("g.root").remove();
        const root = svg.append("g").attr("class", "root");

        // Pan + zoom — d3.zoom owns wheel + drag-on-empty.
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.35, 2.5])
            .filter((event) => {
                // disable wheel zoom unless ctrl/cmd held; let page scroll otherwise
                if (event.type === "wheel") return event.ctrlKey || event.metaKey;
                // ignore drag from inside a node — d3.drag on the node handles it
                if (event.type === "mousedown" || event.type === "touchstart") {
                    const target = event.target as Element | null;
                    if (target && target.closest && target.closest("g.node")) return false;
                }
                return !event.button;
            })
            .on("zoom", (event) => root.attr("transform", event.transform.toString()));
        zoomBehaviorRef.current = zoom;
        svg.call(zoom).on("dblclick.zoom", null);

        // Convert to sim datums (preserve id-based linking).
        const simNodes: SimNode[] = nodesWithHref.map((n) => ({ ...n }));
        const simEdges: SimEdge[] = edges
            .filter((e) =>
                simNodes.some((n) => n.id === e.source) &&
                simNodes.some((n) => n.id === e.target)
            )
            .map((e) => ({ source: e.source, target: e.target } as SimEdge));

        const maxGen = d3.max(simNodes, (n) => n.generation) ?? 0;

        const sim = d3
            .forceSimulation<SimNode, SimEdge>(simNodes)
            .force(
                "link",
                d3
                    .forceLink<SimNode, SimEdge>(simEdges)
                    .id((d) => (d as SimNode).id)
                    .distance(150)
                    .strength(0.7)
            )
            .force("charge", d3.forceManyBody<SimNode>().strength(-700))
            .force(
                "y",
                d3
                    .forceY<SimNode>((d) =>
                        maxGen === 0
                            ? height / 2
                            : 110 + (d.generation / maxGen) * (height - 220)
                    )
                    .strength(0.5)
            )
            .force("x", d3.forceX(width / 2).strength(0.04))
            .force(
                "collide",
                d3.forceCollide<SimNode>().radius((d) => d.radius / 2 + 14).iterations(2)
            )
            .alpha(0.9)
            .alphaDecay(0.04);

        // Edge layer: shadow line + main line + endpoint anchors.
        const edgeGroup = root.append("g").attr("class", "edges");
        const link = edgeGroup
            .selectAll<SVGGElement, SimEdge>("g.edge")
            .data(simEdges)
            .enter()
            .append("g")
            .attr("class", "edge");

        link
            .append("line")
            .attr("class", "edge-shadow")
            .attr("stroke", "#3d2817")
            .attr("stroke-width", 6)
            .attr("opacity", 0.07)
            .attr("stroke-linecap", "round");
        link
            .append("line")
            .attr("class", "edge-main")
            .attr("stroke", "#3d2817")
            .attr("stroke-width", 1.8)
            .attr("opacity", 0.85)
            .attr("stroke-linecap", "round");
        link
            .append("ellipse")
            .attr("class", "edge-pod")
            .attr("rx", 4.5)
            .attr("ry", 2.2)
            .attr("fill", "#6b8a4b")
            .attr("stroke", "#3d2817")
            .attr("stroke-width", 0.9);

        // Node layer.
        const nodeLayer = root.append("g").attr("class", "nodes");
        const node = nodeLayer
            .selectAll<SVGGElement, SimNode>("g.node")
            .data(simNodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .style("cursor", "grab")
            .style("transition", "filter 200ms ease");

        // Invisible hit-area: catches drag/click anywhere on the bloom even
        // through transparent petal gaps. Sits behind the visible art but
        // with pointer-events:all so the bare <g> never has to rely on the
        // image (which sets pointer-events:none).
        node
            .append("circle")
            .attr("class", "hit")
            .attr("r", (d) => d.radius / 2 + 6)
            .attr("fill", "transparent")
            .attr("stroke", "none")
            .attr("pointer-events", "all");

        // Behind-bloom anchor circle so the line visibly attaches to the centre.
        node
            .append("circle")
            .attr("class", "anchor")
            .attr("r", 5)
            .attr("fill", "#d4a437")
            .attr("stroke", "#3d2817")
            .attr("stroke-width", 1)
            .style("pointer-events", "none");

        node
            .append("image")
            .attr("class", "bloom")
            .attr("href", (d) => d.href)
            .attr("width", (d) => d.radius)
            .attr("height", (d) => d.radius)
            .attr("x", (d) => -d.radius / 2)
            .attr("y", (d) => -d.radius / 2)
            .style("pointer-events", "none");

        // Label pill.
        const label = node.append("g").attr("class", "label");
        label
            .append("rect")
            .attr("x", -32)
            .attr("y", (d) => d.radius / 2 + 4)
            .attr("width", 64)
            .attr("height", 28)
            .attr("rx", 4)
            .attr("fill", "#fbf6ec")
            .attr("stroke", "#3d2817")
            .attr("stroke-width", 1)
            .style("pointer-events", "none");
        label
            .append("text")
            .attr("text-anchor", "middle")
            .attr("font-family", "'JetBrains Mono', monospace")
            .attr("font-size", 10.5)
            .attr("fill", "#3d2817")
            .attr("y", (d) => d.radius / 2 + 16)
            .text((d) => `#${d.id}`)
            .style("pointer-events", "none");
        label
            .append("text")
            .attr("text-anchor", "middle")
            .attr("font-family", "'JetBrains Mono', monospace")
            .attr("font-size", 9)
            .attr("fill", "#5a3f2a")
            .attr("y", (d) => d.radius / 2 + 27)
            .text((d) => `gen ${d.generation}`)
            .style("pointer-events", "none");

        // Drag — D3 handles transformation through the current zoom matrix.
        let didDrag = false;
        node.call(
            d3
                .drag<SVGGElement, SimNode>()
                .on("start", (event, d) => {
                    didDrag = false;
                    if (!event.active) sim.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                    d3.select<SVGGElement, SimNode>(event.sourceEvent.currentTarget)
                        .style("cursor", "grabbing")
                        .style("filter", "drop-shadow(0 14px 18px rgba(61,40,23,0.28))");
                })
                .on("drag", (event, d) => {
                    didDrag = true;
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) sim.alphaTarget(0);
                    // Release pin so node settles under forces; if you want sticky,
                    // remove these two lines.
                    d.fx = null;
                    d.fy = null;
                    d3.select<SVGGElement, SimNode>(event.sourceEvent.currentTarget)
                        .style("cursor", "grab")
                        .style("filter", null);
                })
        );

        node.on("click", (_event, d) => {
            if (didDrag) return;
            onSelectRef.current?.(d as LineageNode);
        });

        sim.on("tick", () => {
            link.select<SVGLineElement>("line.edge-shadow")
                .attr("x1", (d) => (d.source as SimNode).x ?? 0)
                .attr("y1", (d) => (d.source as SimNode).y ?? 0)
                .attr("x2", (d) => (d.target as SimNode).x ?? 0)
                .attr("y2", (d) => (d.target as SimNode).y ?? 0);
            link.select<SVGLineElement>("line.edge-main")
                .attr("x1", (d) => (d.source as SimNode).x ?? 0)
                .attr("y1", (d) => (d.source as SimNode).y ?? 0)
                .attr("x2", (d) => (d.target as SimNode).x ?? 0)
                .attr("y2", (d) => (d.target as SimNode).y ?? 0);
            link.select<SVGEllipseElement>("ellipse.edge-pod")
                .attr("cx", (d) => {
                    const s = d.source as SimNode;
                    const t = d.target as SimNode;
                    return ((s.x ?? 0) + (t.x ?? 0)) / 2;
                })
                .attr("cy", (d) => {
                    const s = d.source as SimNode;
                    const t = d.target as SimNode;
                    return ((s.y ?? 0) + (t.y ?? 0)) / 2;
                });
            node.attr("transform", (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
        });

        const handleResize = () => {
            const w = svgRef.current?.clientWidth ?? width;
            svg.attr("viewBox", `0 0 ${w} ${height}`);
            sim.force("x", d3.forceX(w / 2).strength(0.04));
            sim.alpha(0.3).restart();
        };
        window.addEventListener("resize", handleResize);

        return () => {
            sim.stop();
            window.removeEventListener("resize", handleResize);
        };
    }, [nodesWithHref, edges, height]);

    // Selected highlight — re-applied without re-running the whole effect.
    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        d3.select(el)
            .selectAll<SVGGElement, SimNode>("g.node")
            .style("filter", (d) =>
                d.id === selectedId
                    ? "drop-shadow(0 12px 22px rgba(212,164,55,0.55))"
                    : null
            );
    }, [selectedId]);

    useImperativeHandle(ref, () => ({
        zoomIn: () => {
            const el = svgRef.current;
            const z = zoomBehaviorRef.current;
            if (!el || !z) return;
            d3.select(el).transition().duration(180).call(z.scaleBy, 1.2);
        },
        zoomOut: () => {
            const el = svgRef.current;
            const z = zoomBehaviorRef.current;
            if (!el || !z) return;
            d3.select(el).transition().duration(180).call(z.scaleBy, 1 / 1.2);
        },
        reset: () => {
            const el = svgRef.current;
            const z = zoomBehaviorRef.current;
            if (!el || !z) return;
            d3.select(el).transition().duration(220).call(z.transform, d3.zoomIdentity);
        },
    }));

    return (
        <svg
            ref={svgRef}
            width="100%"
            height={height}
            style={{
                display: "block",
                background:
                    "radial-gradient(circle at 30% 20%, rgba(212, 164, 55, 0.06), transparent 50%), radial-gradient(circle at 70% 80%, rgba(245, 183, 160, 0.05), transparent 50%), var(--surface)",
                cursor: "grab",
                touchAction: "none",
            }}
        />
    );
});
