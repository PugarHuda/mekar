"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toHex } from "viem";
import { toast } from "sonner";
import Link from "next/link";
import { Header } from "@/components/Header";
import { NetworkBanner } from "@/components/NetworkBanner";
import { CONTRACT_ADDRESSES, isDeployed } from "@/contracts/addresses";
import { AGENT_INFT_ABI } from "@/contracts/abis";
import { explorerLink } from "@/lib/chains";
import { ExternalLink, Loader2, Sparkles, GitFork, GitMerge } from "lucide-react";
import { useLineageData } from "@/hooks/useLineageData";

type Tab = "genesis" | "fork" | "compose";

export default function MintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <MintPageInner />
    </Suspense>
  );
}

function MintPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("genesis");

  // Deep-link support: /mint?fork=N opens Fork tab pre-selected to parent N
  // /mint?compose=A,B opens Compose tab with parents A and B
  useEffect(() => {
    const forkParam = searchParams.get("fork");
    const composeParam = searchParams.get("compose");
    if (forkParam) setTab("fork");
    else if (composeParam) setTab("compose");
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-mekar-deep/10">
      <Header />
      <NetworkBanner />

      <main className="mx-auto max-w-4xl px-4 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Mint an Agent
          </h1>
          <p className="text-muted-foreground mt-2">
            Genesis (no parent), Fork (single parent), or Compose (multi-parent merge).
          </p>
        </div>

        {!isDeployed && (
          <div className="rounded-2xl border border-mekar-gold/30 bg-mekar-gold/10 p-6 mb-8 text-center">
            <p className="text-muted-foreground">
              Contracts not yet deployed. See{" "}
              <Link href="/docs/DEPLOY_GUIDE.md" className="text-mekar-gold hover:underline">
                DEPLOY_GUIDE.md
              </Link>
              .
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mb-8">
          <TabButton active={tab === "genesis"} onClick={() => setTab("genesis")}>
            <Sparkles className="h-4 w-4" /> Genesis
          </TabButton>
          <TabButton active={tab === "fork"} onClick={() => setTab("fork")}>
            <GitFork className="h-4 w-4" /> Fork
          </TabButton>
          <TabButton active={tab === "compose"} onClick={() => setTab("compose")}>
            <GitMerge className="h-4 w-4" /> Compose
          </TabButton>
        </div>

        {tab === "genesis" && <GenesisForm />}
        {tab === "fork" && <ForkForm />}
        {tab === "compose" && <ComposeForm />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? "border-mekar-green text-mekar-green"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Genesis Form
// ─────────────────────────────────────────────────────────────────────

function GenesisForm() {
  const { address } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function handleMint() {
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }

    // For MVP: derive deterministic hashes from name + description
    // Production: real weights upload + TEE attestation flow
    const seed = `${address}-${name}-${Date.now()}`;
    const weightsPtr = keccak256(toHex(`weights:${seed}`));
    const trainingMerkle = keccak256(toHex(`training:${datasetDescription || seed}`));
    const teeProof = keccak256(toHex(`tee:${seed}`));

    const defaultSchema = {
      directOwnerBps: 5_000,
      gen1Bps: 2_500,
      gen2Bps: 1_500,
      gen3PlusBps: 700,
      trainingDataBps: 300,
      maxGenerationsPaid: 10,
    } as const;

    writeContract({
      address: CONTRACT_ADDRESSES.AgentINFT,
      abi: AGENT_INFT_ABI,
      functionName: "mintGenesis",
      args: [weightsPtr, trainingMerkle, teeProof, defaultSchema, 1], // mode = Voluntary
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div>
        <label className="text-sm font-semibold mb-1.5 block">Agent Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="IndoLlama-Base"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mekar-green"
        />
      </div>

      <div>
        <label className="text-sm font-semibold mb-1.5 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Indonesian language fine-tune of Llama 3..."
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mekar-green"
        />
      </div>

      <div>
        <label className="text-sm font-semibold mb-1.5 block">
          Training Dataset (description or hash)
        </label>
        <input
          type="text"
          value={datasetDescription}
          onChange={(e) => setDatasetDescription(e.target.value)}
          placeholder="Common Crawl Indonesian subset, 50GB"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mekar-green"
        />
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">
          Default royalty schema (configurable later):
        </p>
        <ul className="space-y-1 font-mono text-xs">
          <li>Direct owner: 50%</li>
          <li>Gen 1 parents: 25% (split)</li>
          <li>Gen 2 grandparents: 15%</li>
          <li>Gen 3+ ancestors: 7%</li>
          <li>Training data contributors: 3%</li>
        </ul>
      </div>

      <button
        disabled={!address || isPending || isConfirming || !isDeployed}
        onClick={handleMint}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-mekar-green px-6 py-3 text-sm font-semibold text-background hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? "Confirming..." : isConfirming ? "Mining..." : "Mint Genesis Agent"}
      </button>

      <TxStatus hash={txHash} isSuccess={isSuccess} error={error?.message} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Fork Form
// ─────────────────────────────────────────────────────────────────────

function ForkForm() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const { nodes } = useLineageData();

  const forkParam = searchParams.get("fork");
  const initialParent = forkParam ? parseInt(forkParam, 10) : null;
  const [parentId, setParentId] = useState<number | null>(
    initialParent && !isNaN(initialParent) ? initialParent : null
  );
  const [trainingNote, setTrainingNote] = useState("");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function handleFork() {
    if (!address) return toast.error("Connect wallet first");
    if (!parentId) return toast.error("Pick a parent agent");

    const seed = `${address}-${parentId}-${Date.now()}`;
    const weightsPtr = keccak256(toHex(`fork-weights:${seed}`));
    const trainingMerkle = keccak256(toHex(`fork-training:${trainingNote || seed}`));
    const teeProof = keccak256(toHex(`fork-tee:${seed}`));

    writeContract({
      address: CONTRACT_ADDRESSES.AgentINFT,
      abi: AGENT_INFT_ABI,
      functionName: "mintFork",
      args: [BigInt(parentId), weightsPtr, trainingMerkle, teeProof],
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div>
        <label className="text-sm font-semibold mb-1.5 block">Pick Parent Agent</label>
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agents yet. Mint a Genesis first.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {nodes.map((n) => (
              <button
                key={n.id}
                onClick={() => setParentId(n.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  parentId === n.id
                    ? "border-mekar-green bg-mekar-green/10"
                    : "border-border bg-background hover:bg-secondary/50"
                }`}
              >
                <div className="font-mono text-sm font-bold">#{n.id}</div>
                <div className="text-xs text-muted-foreground">gen {n.generation}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-semibold mb-1.5 block">
          New Training Data Description
        </label>
        <input
          type="text"
          value={trainingNote}
          onChange={(e) => setTrainingNote(e.target.value)}
          placeholder="Indonesian medical corpus, 5GB"
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-mekar-green"
        />
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4 text-xs text-muted-foreground">
        <p>
          ⚠️ Forking adopts parent&apos;s royalty obligation. Each inference will
          distribute 25% to parent, 15% to grandparent, etc.
        </p>
      </div>

      <button
        disabled={!address || isPending || isConfirming || !parentId || !isDeployed}
        onClick={handleFork}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-mekar-green px-6 py-3 text-sm font-semibold text-background hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? "Confirming..." : isConfirming ? "Mining..." : "Fork Agent"}
      </button>

      <TxStatus hash={txHash} isSuccess={isSuccess} error={error?.message} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Compose Form
// ─────────────────────────────────────────────────────────────────────

function ComposeForm() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const { nodes } = useLineageData();

  const composeParam = searchParams.get("compose");
  const initialIds = composeParam
    ? composeParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    : [];
  const [parentIds, setParentIds] = useState<number[]>(initialIds);
  const [strategy, setStrategy] = useState(0);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function toggleParent(id: number) {
    setParentIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleCompose() {
    if (!address) return toast.error("Connect wallet first");
    if (parentIds.length < 2) return toast.error("Pick at least 2 parents");

    const seed = `${address}-${parentIds.join(",")}-${Date.now()}`;
    const weightsPtr = keccak256(toHex(`compose-weights:${seed}`));
    const trainingMerkle = keccak256(toHex(`compose-training:${seed}`));
    const teeProof = keccak256(toHex(`compose-tee:${seed}`));

    writeContract({
      address: CONTRACT_ADDRESSES.AgentINFT,
      abi: AGENT_INFT_ABI,
      functionName: "mintCompose",
      args: [
        parentIds.map((id) => BigInt(id)),
        weightsPtr,
        trainingMerkle,
        teeProof,
        strategy,
      ],
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div>
        <label className="text-sm font-semibold mb-1.5 block">
          Select Parents (≥2)
        </label>
        {nodes.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Need at least 2 existing agents to compose.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {nodes.map((n) => (
              <button
                key={n.id}
                onClick={() => toggleParent(n.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  parentIds.includes(n.id)
                    ? "border-mekar-gold bg-mekar-gold/10"
                    : "border-border bg-background hover:bg-secondary/50"
                }`}
              >
                <div className="font-mono text-sm font-bold">#{n.id}</div>
                <div className="text-xs text-muted-foreground">gen {n.generation}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-semibold mb-1.5 block">Composition Strategy</label>
        <select
          value={strategy}
          onChange={(e) => setStrategy(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm"
        >
          <option value={0}>LoRA Merge</option>
          <option value={1}>Distillation</option>
          <option value={2}>Ensemble Routing</option>
          <option value={3}>Sequential Pipeline</option>
        </select>
      </div>

      <button
        disabled={!address || isPending || isConfirming || parentIds.length < 2 || !isDeployed}
        onClick={handleCompose}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-mekar-gold px-6 py-3 text-sm font-semibold text-background hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? "Confirming..." : isConfirming ? "Mining..." : `Compose ${parentIds.length} Parents`}
      </button>

      <TxStatus hash={txHash} isSuccess={isSuccess} error={error?.message} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared
// ─────────────────────────────────────────────────────────────────────

function TxStatus({
  hash,
  isSuccess,
  error,
}: {
  hash?: `0x${string}`;
  isSuccess: boolean;
  error?: string;
}) {
  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
        {error}
      </div>
    );
  }

  if (!hash) return null;

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        isSuccess
          ? "border-mekar-green/30 bg-mekar-green/10 text-mekar-green"
          : "border-border bg-background"
      }`}
    >
      <div className="flex items-center justify-between">
        <span>{isSuccess ? "✓ Confirmed" : "Pending..."}</span>
        <Link
          href={explorerLink(hash, "tx")}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs hover:underline"
        >
          View tx <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
