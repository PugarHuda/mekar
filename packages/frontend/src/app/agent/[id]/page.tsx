"use client";

import { use } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { NetworkBanner } from "@/components/NetworkBanner";
import { InferencePay, RegisterProviderButton } from "@/components/InferencePay";
import { useAgent, modeLabel } from "@/hooks/useAgent";
import { useAgentInferenceHistory } from "@/hooks/useUserStats";
import { explorerLink } from "@/lib/chains";
import { shortAddress, formatTimeAgo, formatOG } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Sparkles,
  GitFork,
  GitMerge,
  Shield,
  Database,
  Cpu,
  Activity,
} from "lucide-react";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agentId = parseInt(id, 10);
  const { agent, isLoading } = useAgent(agentId);
  const history = useAgentInferenceHistory(Number.isFinite(agentId) ? agentId : undefined);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-mekar-deep/10">
      <Header />
      <NetworkBanner />

      <main className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
        <Link
          href="/explorer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Explorer
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-mekar-green" />
          </div>
        )}

        {!isLoading && !agent && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <h2 className="text-xl font-bold mb-2">Agent #{agentId} not found</h2>
            <p className="text-muted-foreground">
              This agent may not exist on the current network, or contracts are not deployed.
            </p>
          </div>
        )}

        {agent && (
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Main detail */}
            <div className="space-y-6">
              {/* Header card */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {agent.generation === 0 && (
                        <Sparkles className="h-6 w-6 text-mekar-green" />
                      )}
                      {agent.generation > 0 && agent.parents.length === 1 && (
                        <GitFork className="h-6 w-6 text-mekar-emerald" />
                      )}
                      {agent.parents.length > 1 && (
                        <GitMerge className="h-6 w-6 text-mekar-gold" />
                      )}
                      <h1 className="text-3xl font-bold font-mono">Agent #{agent.id}</h1>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {agent.generation === 0
                        ? "Genesis agent — root of lineage"
                        : agent.parents.length > 1
                          ? `Composed agent (${agent.parents.length} parents)`
                          : "Forked agent"}
                    </p>
                  </div>

                  <HealthBadge health={agent.alignmentHealth} />
                </div>
              </div>

              {/* Lineage */}
              <Section title="Lineage" icon={<GitFork className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Stat label="Generation" value={agent.generation.toString()} />
                  <Stat label="Mode" value={modeLabel(agent.mode)} />
                </div>

                {agent.parents.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No parents — this is a genesis agent.
                  </p>
                ) : (
                  <div>
                    <div className="text-xs text-muted-foreground font-mono mb-2">PARENTS</div>
                    <div className="flex flex-wrap gap-2">
                      {agent.parents.map((p) => (
                        <Link
                          key={p}
                          href={`/agent/${p}`}
                          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono hover:border-mekar-green hover:text-mekar-green transition-colors"
                        >
                          ← #{p}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {agent.descendants.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground font-mono mb-2">
                      DIRECT DESCENDANTS ({agent.descendants.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agent.descendants.map((d) => (
                        <Link
                          key={d}
                          href={`/agent/${d}`}
                          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono hover:border-mekar-green hover:text-mekar-green transition-colors"
                        >
                          → #{d}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* Ownership */}
              <Section title="Ownership" icon={<Shield className="h-4 w-4" />}>
                <div className="space-y-3">
                  <AddressRow label="Creator" address={agent.creator} />
                  {agent.owner !== agent.creator && (
                    <AddressRow label="Current Owner" address={agent.owner} />
                  )}
                  <div className="text-xs text-muted-foreground">
                    Minted {formatTimeAgo(agent.createdAt)}
                  </div>
                </div>
              </Section>

              {/* On-chain proof */}
              <Section title="On-Chain Proof" icon={<Database className="h-4 w-4" />}>
                <div className="space-y-3 text-xs font-mono">
                  <HashRow label="Weights Pointer" hash={agent.weightsPointer} />
                  <HashRow label="Training Data Merkle" hash={agent.trainingDataMerkle} />
                  <HashRow label="TEE Attestation" hash={agent.teeAttestation} />
                </div>
              </Section>

              {/* Inference history */}
              <Section title="Inference History" icon={<Activity className="h-4 w-4" />}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Stat
                    label="Total Inferences"
                    value={history.isLoading ? "…" : history.totalInferences.toString()}
                  />
                  <Stat
                    label="Royalty Distributed"
                    value={history.isLoading ? "…" : `${formatOG(history.totalDistributed, 6)} 0G`}
                  />
                </div>

                {history.inferences.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 italic">
                    {history.isLoading
                      ? "Scanning RoyaltyPaid events..."
                      : "No inference activity yet. Be the first to use this agent!"}
                  </p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-3 py-2 font-mono">Recipient</th>
                          <th className="text-left px-3 py-2 font-mono">Gen</th>
                          <th className="text-right px-3 py-2 font-mono">Amount</th>
                          <th className="text-right px-3 py-2 font-mono">Tx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.inferences.slice(0, 10).map((inf, i) => (
                          <tr
                            key={`${inf.txHash}-${i}`}
                            className="border-t border-border hover:bg-secondary/30"
                          >
                            <td className="px-3 py-2 font-mono">
                              {shortAddress(inf.recipient, 4)}
                            </td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">
                              {inf.generation}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-mekar-green">
                              +{formatOG(inf.amount, 6)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Link
                                href={explorerLink(inf.txHash, "tx")}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-mekar-green"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>

            {/* Sidebar: Inference + Actions */}
            <aside className="space-y-4">
              <InferencePay agentId={agent.id} inferencePrice={agent.inferencePrice} />

              <div className="rounded-2xl border border-border bg-card p-4 text-xs space-y-2">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  Demo Setup
                </div>
                <p className="text-muted-foreground">
                  For inference to settle (and trigger royalty distribution), a registered
                  compute provider must call <code className="text-mekar-green">settleInference</code>.
                </p>
                <RegisterProviderButton />
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="text-sm font-semibold">Actions</div>
                <Link
                  href={`/mint?fork=${agent.id}`}
                  className="block w-full text-center rounded-lg border border-border px-3 py-2 text-xs hover:border-mekar-green hover:text-mekar-green transition-colors"
                >
                  Fork this Agent
                </Link>
                <Link
                  href={`/mint?compose=${agent.id}`}
                  className="block w-full text-center rounded-lg border border-border px-3 py-2 text-xs hover:border-mekar-gold hover:text-mekar-gold transition-colors"
                >
                  Use in Compose
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground font-mono mb-0.5">{label}</div>
      <div className="text-lg font-bold font-mono">{value}</div>
    </div>
  );
}

function HealthBadge({ health }: { health: number }) {
  const pct = (health / 100).toFixed(1);
  const color =
    health >= 9_000
      ? "border-mekar-green/30 bg-mekar-green/10 text-mekar-green"
      : health >= 7_000
        ? "border-mekar-gold/30 bg-mekar-gold/10 text-mekar-gold"
        : "border-rose-500/30 bg-rose-500/10 text-rose-400";

  return (
    <div className={`rounded-lg border px-3 py-2 ${color}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">Alignment</div>
      <div className="text-2xl font-bold font-mono">{pct}%</div>
    </div>
  );
}

function AddressRow({ label, address }: { label: string; address: `0x${string}` }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground font-mono mb-0.5">{label}</div>
      <Link
        href={explorerLink(address, "address")}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-mono text-foreground hover:text-mekar-green transition-colors"
      >
        {shortAddress(address, 6)}
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

function HashRow({ label, hash }: { label: string; hash: `0x${string}` }) {
  return (
    <div>
      <div className="text-muted-foreground mb-0.5">{label}</div>
      <div className="break-all text-foreground/80 text-[10px]">{hash}</div>
    </div>
  );
}
