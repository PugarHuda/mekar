"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { LineageNode, LineageEdge } from "@/hooks/useLineageData";

type Props = {
  nodes: LineageNode[];
  edges: LineageEdge[];
  onSelect?: (node: LineageNode | null) => void;
  height?: number;
};

type SimNode = LineageNode & d3.SimulationNodeDatum;
type SimEdge = d3.SimulationLinkDatum<SimNode> & { source: number; target: number };

/**
 * Force-directed lineage tree visualization.
 *
 * - Genesis nodes float at top
 * - Generation depth pulls down via Y-positional force
 * - Hover reveals tooltip
 * - Click selects node (informs parent via onSelect)
 * - Royalty stream animation when payment occurs (TODO: wire from event)
 */
export function LineageTree({ nodes, edges, onSelect, height = 600 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    if (nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = Math.max(svgRef.current.clientWidth, 320);
    const h = height;

    // Make SVG responsive — fits parent container
    svg.attr("viewBox", `0 0 ${width} ${h}`).attr("preserveAspectRatio", "xMidYMid meet");

    svg.selectAll("*").remove();

    // Defs: gradient for edges, glow filter
    const defs = svg.append("defs");

    const gradient = defs
      .append("linearGradient")
      .attr("id", "edgeGradient")
      .attr("gradientUnits", "userSpaceOnUse");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#10b981").attr("stop-opacity", 0.6);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#10b981").attr("stop-opacity", 0.2);

    const glow = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Container with zoom
    const container = svg.append("g").attr("class", "container");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => container.attr("transform", event.transform.toString()));
    svg.call(zoom);

    // Convert nodes to simulation format
    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simEdges: SimEdge[] = edges.map((e) => ({ source: e.source, target: e.target }));

    const maxGen = d3.max(nodes, (n) => n.generation) ?? 0;

    const simulation = d3
      .forceSimulation<SimNode, SimEdge>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimEdge>(simEdges)
          .id((d: any) => d.id)
          .distance(100)
          .strength(0.7)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, h / 2))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force(
        "y",
        d3
          .forceY<SimNode>((d) => {
            // Genesis (gen 0) at top, deepest at bottom
            if (maxGen === 0) return h / 2;
            return 80 + (d.generation / maxGen) * (h - 160);
          })
          .strength(0.5)
      )
      .force("collide", d3.forceCollide().radius(35));

    // Draw edges
    const link = container
      .append("g")
      .attr("class", "edges")
      .selectAll("line")
      .data(simEdges)
      .enter()
      .append("line")
      .attr("stroke", "url(#edgeGradient)")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round");

    // Draw nodes
    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simNodes)
      .enter()
      .append("g")
      .attr("class", "node-group cursor-pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (_event, d) => {
        setSelectedId(d.id);
        onSelect?.(d);
      });

    // Outer ring (alignment health indicator)
    node
      .append("circle")
      .attr("r", 28)
      .attr("fill", "none")
      .attr("stroke", (d) => {
        if (d.alignmentHealth >= 9_000) return "#10b981";
        if (d.alignmentHealth >= 7_000) return "#f59e0b";
        return "#f43f5e";
      })
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    // Inner circle
    node
      .append("circle")
      .attr("r", 22)
      .attr("fill", (d) => {
        if (d.generation === 0) return "#10b981"; // genesis
        if (d.parents.length > 1) return "#f59e0b"; // composed
        return "#059669"; // fork
      })
      .attr("filter", "url(#glow)");

    // Token ID label
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "white")
      .attr("font-family", "var(--font-jetbrains-mono), monospace")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text((d) => `#${d.id}`);

    // Generation badge below
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "42")
      .attr("fill", "rgb(148 163 184)")
      .attr("font-family", "var(--font-jetbrains-mono), monospace")
      .attr("font-size", "10px")
      .text((d) => `gen ${d.generation}`);

    // Tooltip on hover
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "lineage-tooltip")
      .style("position", "absolute")
      .style("padding", "8px 12px")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("border", "1px solid rgba(16, 185, 129, 0.3)")
      .style("border-radius", "8px")
      .style("color", "white")
      .style("font-family", "var(--font-jetbrains-mono), monospace")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 50);

    node
      .on("mouseenter", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(
            `<div><strong>Agent #${d.id}</strong></div>` +
              `<div>Gen: ${d.generation} | Parents: ${d.parents.length}</div>` +
              `<div>Health: ${(d.alignmentHealth / 100).toFixed(1)}%</div>` +
              `<div>Owner: ${d.owner?.slice(0, 6)}…${d.owner?.slice(-4)}</div>`
          )
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 12}px`);
      })
      .on("mouseleave", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Cleanup
    // Resize observer keeps the tree responsive when container changes
    const handleResize = () => {
      if (!svgRef.current) return;
      const newWidth = Math.max(svgRef.current.clientWidth, 320);
      svg.attr("viewBox", `0 0 ${newWidth} ${h}`);
      simulation.force("center", d3.forceCenter(newWidth / 2, h / 2));
      simulation.force("x", d3.forceX(newWidth / 2).strength(0.05));
      simulation.alpha(0.3).restart();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      simulation.stop();
      tooltip.remove();
      window.removeEventListener("resize", handleResize);
    };
  }, [nodes, edges, onSelect, height]);

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/50"
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No agents yet</p>
          <p className="text-sm">
            Mint a genesis agent to start a lineage tree.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
      <svg ref={svgRef} className="w-full" style={{ height }} />

      {/* Legend */}
      <div className="absolute top-4 left-4 rounded-lg border border-border bg-background/80 backdrop-blur-md px-4 py-3 text-xs space-y-2">
        <div className="font-semibold text-foreground mb-1">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-mekar-green" />
          <span className="text-muted-foreground">Genesis (gen 0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-mekar-emerald" />
          <span className="text-muted-foreground">Fork</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-mekar-gold" />
          <span className="text-muted-foreground">Composed (multi-parent)</span>
        </div>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 right-4 rounded-lg border border-border bg-background/80 backdrop-blur-md px-3 py-2 text-xs text-muted-foreground">
        Drag to pan · Scroll to zoom · Click node for detail
      </div>
    </div>
  );
}
