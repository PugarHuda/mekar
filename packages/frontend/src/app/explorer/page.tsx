"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { NetworkBanner } from "@/components/NetworkBanner";
import { LineageTree } from "@/components/LineageTree";
import { useLineageData, type LineageNode } from "@/hooks/useLineageData";
import { isDeployed } from "@/contracts/addresses";
import { explorerLink } from "@/lib/chains";
import { shortAddress, formatTimeAgo } from "@/lib/utils";
import { ExternalLink, Info, Loader2 } from "lucide-react";
import Link from "next/link";

const MODE_LABELS = ["Strict", "Voluntary", "Audit-Only"];

export default function ExplorerPage() {
  const [selected, setSelected] = useState<LineageNode | null>(null);
  const { nodes, edges, isLoading, totalAgents } = useLineageData();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-mekar-deep/10">
      <Header />
      <NetworkBanner />

      <main className="mx-auto max-w-7xl px-4 lg:px-8 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Lineage Explorer
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse the on-chain genealogy tree of every MEKAR agent.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Total Agents</div>
              <div className="text-2xl font-bold font-mono">{totalAgents}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Lineage Depth</div>
              <div className="text-2xl font-bold font-mono">
                {nodes.length > 0 ? Math.max(...nodes.map((n) => n.generation)) : 0}
              </div>
            </div>
          </div>
        </div>

        {!isDeployed && <NotDeployedNotice />}

        {isDeployed && isLoading && (
          <div className="flex items-center justify-center h-96 rounded-2xl border border-border bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-mekar-green" />
          </div>
        )}

        {isDeployed && !isLoading && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <LineageTree nodes={nodes} edges={edges} onSelect={setSelected} height={620} />

            <aside className="rounded-2xl border border-border bg-card p-6">
              {!selected && (
                <div className="text-center text-muted-foreground py-12">
                  <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>Click a node to inspect.</p>
                </div>
              )}

              {selected && <NodeDetail node={selected} />}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function NodeDetail({ node }: { node: LineageNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-mono">AGENT ID</div>
          <div className="text-3xl font-bold font-mono">#{node.id}</div>
        </div>
        <Link
          href={`/agent/${node.id}`}
          className="rounded-lg bg-mekar-green px-3 py-1.5 text-xs font-semibold text-background hover:bg-emerald-400 transition-colors"
        >
          Open Detail →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Generation" value={node.generation.toString()} />
        <Stat label="Parents" value={node.parents.length.toString()} />
        <Stat
          label="Alignment"
          value={`${(node.alignmentHealth / 100).toFixed(1)}%`}
          color={
            node.alignmentHealth >= 9_000
              ? "text-mekar-green"
              : node.alignmentHealth >= 7_000
                ? "text-mekar-gold"
                : "text-rose-400"
          }
        />
        <Stat label="Mode" value={MODE_LABELS[node.mode] ?? "Unknown"} />
      </div>

      <div>
        <div className="text-xs text-muted-foreground font-mono mb-1">CREATOR</div>
        <Link
          href={explorerLink(node.creator, "address")}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-foreground hover:text-mekar-green transition-colors font-mono"
        >
          {shortAddress(node.creator, 6)} <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {node.owner && node.owner !== node.creator && (
        <div>
          <div className="text-xs text-muted-foreground font-mono mb-1">OWNER</div>
          <Link
            href={explorerLink(node.owner, "address")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-foreground hover:text-mekar-green transition-colors font-mono"
          >
            {shortAddress(node.owner, 6)} <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div>
        <div className="text-xs text-muted-foreground font-mono mb-1">PARENTS</div>
        {node.parents.length === 0 ? (
          <span className="text-sm text-muted-foreground italic">none (genesis)</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {node.parents.map((p) => (
              <span
                key={p}
                className="rounded border border-border bg-background px-2 py-0.5 text-xs font-mono"
              >
                #{p}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground pt-4 border-t border-border">
        Created {formatTimeAgo(node.createdAt)}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground font-mono">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

function NotDeployedNotice() {
  return (
    <div className="rounded-2xl border border-mekar-gold/30 bg-mekar-gold/10 p-8 text-center">
      <h2 className="text-xl font-bold mb-2">Contracts not yet deployed</h2>
      <p className="text-muted-foreground mb-4">
        Run <code className="text-mekar-gold">forge script Deploy.s.sol --broadcast</code> against
        the 0G Galileo testnet, then update <code>.env</code> with the contract addresses.
      </p>
      <Link
        href="/docs/DEPLOY_GUIDE.md"
        className="inline-flex items-center gap-1 text-mekar-gold hover:underline"
      >
        See deploy guide <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
