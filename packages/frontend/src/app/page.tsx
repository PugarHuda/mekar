"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  Coins,
  Shield,
  Sparkles,
  TreePine,
  Network,
} from "lucide-react";
// Note: framer-motion is loaded only on the landing page
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-mekar-deep/20">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(245,158,11,0.08),transparent_40%)]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-mekar-green/30 bg-mekar-green/10 px-4 py-1.5 text-xs font-medium text-mekar-green mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Built on 0G • Track 3 — Agentic Economy
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Every AI has a{" "}
              <span className="bg-gradient-to-r from-mekar-green via-emerald-400 to-mekar-gold bg-clip-text text-transparent">
                lineage.
              </span>
              <br />
              Every inference
              <br />
              pays its ancestors.
            </h1>

            <p className="mt-8 text-xl text-muted-foreground max-w-2xl leading-relaxed">
              MEKAR is <strong className="text-foreground">Spotify-style royalty for AI agents</strong> —
              every inference automatically distributes royalty to parents,
              grandparents, and training data contributors. Native to 0G&apos;s
              ERC-7857 INFT primitive.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/explorer"
                className="group inline-flex items-center gap-2 rounded-lg bg-mekar-green px-6 py-3 text-sm font-semibold text-background hover:bg-emerald-400 transition-colors animate-pulse-glow"
              >
                Explore Lineage Tree
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/mint"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Mint an Agent
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why MEKAR */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <p className="text-sm font-mono text-mekar-green mb-2">{"// THE PROBLEM"}</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                AI today looks like the music industry in 1999.
              </h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-lg">
              <p>NYT vs OpenAI: <span className="text-rose-400">$7.5B claim</span></p>
              <p>Getty vs Stability: <span className="text-rose-400">$1.7B</span></p>
              <p>EU AI Act enforcement: <span className="text-mekar-gold">May 2026</span></p>
              <p>Stability AI: <span className="text-rose-400">bankrupt</span> without a royalty rail</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<TreePine className="h-6 w-6" />}
              title="Lineage"
              description="Every agent is an INFT (ERC-7857) with provable parents on-chain. Nobody can fake their genealogy."
            />
            <FeatureCard
              icon={<Coins className="h-6 w-6" />}
              title="Royalty"
              description="Inference fees automatically split across the ancestor tree. Owner 50%, parents 25%, grandparents 15%, training contributors 3%."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Alignment"
              description="0G Alignment Nodes audit lineage health (bias drift, hallucination). Misaligned lineages are punished economically."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/40 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-20">
          <p className="text-sm font-mono text-mekar-green mb-2">{"// HOW IT WORKS"}</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12">
            Four steps from training to royalty.
          </h2>

          <div className="space-y-6">
            <Step
              n={1}
              title="Genesis Mint"
              description="Creator trains the AI, encrypts weights to 0G Storage, registers the training data Merkle root, then mints a Genesis INFT with a royalty schema."
            />
            <Step
              n={2}
              title="Fork (single-parent)"
              description="A fine-tuner picks a parent, submits new training data, runs training inside 0G Compute TEE, then mints a child INFT with the parent link recorded on-chain."
            />
            <Step
              n={3}
              title="Compose (multi-parent)"
              description="Merge multiple agents (LoRA, distillation, ensemble) into a composed INFT. Royalty obligations are inherited from every parent."
            />
            <Step
              n={4}
              title="Inference & Royalty"
              description="A user pays $0G to use the agent. RoyaltyVault.sol distributes atomically across the ancestor tree in a single transaction."
            />
          </div>
        </div>
      </section>

      {/* 0G Stack */}
      <section className="border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-20">
          <p className="text-sm font-mono text-mekar-green mb-2">{"// 0G INTEGRATION"}</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Native integration across 6 0G modules
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mb-12">
            MEKAR exploits 0G primitives that no other chain provides — INFT
            (ERC-7857), Specialized Flow storage, Alignment Nodes, and the Data
            Serving Network.
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <ZGTag>0G Chain (16602)</ZGTag>
            <ZGTag>0G Storage Log</ZGTag>
            <ZGTag>0G Specialized Flow</ZGTag>
            <ZGTag>0G Compute (TEE)</ZGTag>
            <ZGTag>INFT (ERC-7857)</ZGTag>
            <ZGTag>Alignment Nodes</ZGTag>
            <ZGTag>Data Serving Network</ZGTag>
            <ZGTag>0G KV Store</ZGTag>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TreePine className="h-4 w-4 text-mekar-green" />
            <span>MEKAR — AI Genealogy Protocol</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/PugarHuda/mekar"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </Link>
            <Link href="https://docs.0g.ai" className="hover:text-foreground">
              0G Docs
            </Link>
            <span>#0GHackathon #BuildOn0G</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 hover:border-mekar-green/50 hover:bg-card/80 transition-all">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-mekar-green/10 text-mekar-green mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="flex gap-6 rounded-2xl border border-border bg-card p-6 hover:border-mekar-green/30 transition-colors">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-mekar-green/10 border border-mekar-green/30 text-mekar-green font-mono font-bold">
          {n}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ZGTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 font-mono text-foreground hover:border-mekar-green/50 transition-colors flex items-center gap-2">
      <Network className="h-4 w-4 text-mekar-green" />
      {children}
    </div>
  );
}
