"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useReadContract } from "wagmi";
import { Header } from "@/components/Header";
import { NetworkBanner } from "@/components/NetworkBanner";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { MEKAR_REGISTRY_ABI } from "@/contracts/abis";
import { useAgent, modeLabel } from "@/hooks/useAgent";
import { useUserStats } from "@/hooks/useUserStats";
import { Sparkles, GitFork, GitMerge, TreePine, Coins, ArrowRight, ExternalLink } from "lucide-react";
import { explorerLink } from "@/lib/chains";
import { formatOG, shortAddress } from "@/lib/utils";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: myAgentIds, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.MekarRegistry,
    abi: MEKAR_REGISTRY_ABI,
    functionName: "getAgentsByCreator",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && isDeployed },
  });

  const ids = (myAgentIds as readonly bigint[] | undefined) ?? [];

  const stats = useUserStats(isConnected ? address : undefined);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-mekar-deep/10">
      <Header />
      <NetworkBanner />

      <main className="mx-auto max-w-7xl px-4 lg:px-8 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Your agents, total mints, royalty earnings.
            </p>
          </div>

          {isConnected && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono">CONNECTED</div>
              <div className="text-sm font-mono">{shortAddress(address!, 6)}</div>
            </div>
          )}
        </div>

        {!isConnected && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Sparkles className="h-10 w-10 text-mekar-green mx-auto mb-3 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Connect your wallet</h2>
            <p className="text-muted-foreground mb-4">
              View agents you&apos;ve created, royalty earnings, and lineage.
            </p>
          </div>
        )}

        {isConnected && !isDeployed && (
          <div className="rounded-2xl border border-mekar-gold/30 bg-mekar-gold/10 p-6 text-center">
            <p className="text-muted-foreground">Contracts not yet deployed.</p>
          </div>
        )}

        {isConnected && isDeployed && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Sparkles className="h-5 w-5" />}
                label="Agents Created"
                value={ids.length.toString()}
              />
              <StatCard
                icon={<TreePine className="h-5 w-5" />}
                label="Lineage Roots"
                value={ids.length.toString()}
              />
              <StatCard
                icon={<Coins className="h-5 w-5" />}
                label="Royalty Earned"
                value={stats.isLoading ? "…" : formatOG(stats.totalRoyaltyEarned, 6)}
                suffix="$0G"
              />
              <StatCard
                icon={<GitFork className="h-5 w-5" />}
                label="Royalty Events"
                value={stats.isLoading ? "…" : stats.inferencesAsRecipient.length.toString()}
              />
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
                Loading agents...
              </div>
            ) : ids.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                <h3 className="text-lg font-bold mb-2">No agents yet</h3>
                <p className="text-muted-foreground mb-4">
                  Mint a Genesis agent to start your lineage.
                </p>
                <Link
                  href="/mint"
                  className="inline-flex items-center gap-2 rounded-lg bg-mekar-green px-4 py-2 text-sm font-semibold text-background hover:bg-emerald-400 transition-colors"
                >
                  Mint Agent <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-bold mb-4">My Agents</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ids.map((id) => (
                      <AgentCard key={id.toString()} agentId={Number(id)} />
                    ))}
                  </div>
                </div>

                {/* Royalty earnings history */}
                {stats.inferencesAsRecipient.length > 0 && (
                  <div className="mt-12">
                    <h2 className="text-lg font-bold mb-4">Recent Royalty Events</h2>
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wider">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-mono">Agent</th>
                            <th className="text-left px-4 py-2.5 font-mono">Generation</th>
                            <th className="text-right px-4 py-2.5 font-mono">Amount</th>
                            <th className="text-right px-4 py-2.5 font-mono">Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.inferencesAsRecipient.slice(0, 20).map((evt, i) => (
                            <tr
                              key={`${evt.txHash}-${i}`}
                              className="border-t border-border hover:bg-secondary/30"
                            >
                              <td className="px-4 py-2.5">
                                <Link
                                  href={`/agent/${evt.agentId}`}
                                  className="font-mono text-mekar-green hover:underline"
                                >
                                  #{evt.agentId}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-muted-foreground">
                                gen {evt.generation}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono">
                                +{formatOG(evt.amount, 6)} 0G
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <Link
                                  href={explorerLink(evt.txHash, "tx")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-mekar-green"
                                >
                                  view <ExternalLink className="h-3 w-3" />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono flex items-baseline gap-1">
        {value}
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function AgentCard({ agentId }: { agentId: number }) {
  const { agent, isLoading } = useAgent(agentId);

  if (isLoading || !agent) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-6 animate-pulse">
        <div className="h-4 w-20 bg-secondary rounded mb-3" />
        <div className="h-6 w-32 bg-secondary rounded" />
      </div>
    );
  }

  const Icon =
    agent.generation === 0 ? Sparkles : agent.parents.length > 1 ? GitMerge : GitFork;

  return (
    <Link
      href={`/agent/${agent.id}`}
      className="group rounded-2xl border border-border bg-card p-6 hover:border-mekar-green/50 transition-colors block"
    >
      <div className="flex items-start justify-between mb-3">
        <Icon
          className={`h-5 w-5 ${
            agent.generation === 0
              ? "text-mekar-green"
              : agent.parents.length > 1
                ? "text-mekar-gold"
                : "text-mekar-emerald"
          }`}
        />
        <span className="text-xs font-mono text-muted-foreground">
          gen {agent.generation}
        </span>
      </div>

      <div className="text-2xl font-bold font-mono mb-1">#{agent.id}</div>
      <div className="text-xs text-muted-foreground mb-3">{modeLabel(agent.mode)}</div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {agent.parents.length === 0
            ? "Genesis"
            : `${agent.parents.length} parent${agent.parents.length > 1 ? "s" : ""}`}
        </span>
        <span className="text-mekar-green opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </span>
      </div>
    </Link>
  );
}
