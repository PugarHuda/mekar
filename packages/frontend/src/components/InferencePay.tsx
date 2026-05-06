"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useBalance,
} from "wagmi";
import { toast } from "sonner";
import Link from "next/link";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import { ROYALTY_VAULT_ABI } from "@/contracts/abis";
import { explorerLink } from "@/lib/chains";
import { formatOG } from "@/lib/utils";
import { Loader2, Coins, ExternalLink, Sparkles } from "lucide-react";

type Props = {
  agentId: number;
  inferencePrice: bigint;
};

/**
 * One-click inference payment UI for any agent.
 *
 * Flow:
 *   1. User connects wallet
 *   2. Click "Pay & Run Inference"
 *   3. Pay $0G to RoyaltyVault.payInference
 *   4. (Compute provider settles automatically — for demo, deployer settles via backend or manually)
 */
export function InferencePay({ agentId, inferencePrice }: Props) {
  const { address, isConnected } = useAccount();
  const [prompt, setPrompt] = useState("Hello, agent!");

  const { data: balance } = useBalance({ address });

  const { data: isRegisteredProvider } = useReadContract({
    address: CONTRACT_ADDRESSES.RoyaltyVault,
    abi: ROYALTY_VAULT_ABI,
    functionName: "isRegisteredProvider",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function handlePay() {
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }

    if (balance && balance.value < inferencePrice) {
      toast.error(`Need ≥ ${formatOG(inferencePrice)} $0G. Get from faucet.`);
      return;
    }

    writeContract(
      {
        address: CONTRACT_ADDRESSES.RoyaltyVault,
        abi: ROYALTY_VAULT_ABI,
        functionName: "payInference",
        args: [BigInt(agentId)],
        value: inferencePrice,
      },
      {
        onSuccess: () => toast.success("Inference payment submitted"),
        onError: (err) => toast.error(err.message.slice(0, 200)),
      }
    );
  }

  const insufficientBalance = balance ? balance.value < inferencePrice : false;

  return (
    <div className="rounded-2xl border border-mekar-green/30 bg-gradient-to-br from-mekar-green/5 to-transparent p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-mekar-green" />
        <h3 className="text-lg font-bold">Run Inference</h3>
      </div>

      <div>
        <label className="text-xs font-mono text-muted-foreground mb-1 block">
          PROMPT (mock)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mekar-green resize-none"
          placeholder="Ask the agent something..."
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Coins className="h-4 w-4" />
          <span>Price:</span>
        </div>
        <span className="font-mono font-bold">
          {formatOG(inferencePrice, 6)} $0G
        </span>
      </div>

      {balance && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Your balance:</span>
          <span
            className={`font-mono ${insufficientBalance ? "text-rose-400" : "text-muted-foreground"}`}
          >
            {formatOG(balance.value)} $0G
          </span>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={!isConnected || isPending || isConfirming || insufficientBalance}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-mekar-green px-4 py-2.5 text-sm font-semibold text-background hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {(isPending || isConfirming) && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isConnected
          ? "Connect Wallet"
          : insufficientBalance
            ? "Insufficient Balance"
            : isPending
              ? "Confirming..."
              : isConfirming
                ? "Mining..."
                : "Pay & Run Inference"}
      </button>

      {txHash && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            isSuccess
              ? "border-mekar-green/30 bg-mekar-green/10 text-mekar-green"
              : "border-border bg-background"
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{isSuccess ? "✓ Payment confirmed" : "Pending..."}</span>
            <Link
              href={explorerLink(txHash, "tx")}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              View tx <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          {isSuccess && (
            <p className="mt-2 text-muted-foreground">
              Royalty distributed atomically to all ancestors. Check Explorer for{" "}
              <span className="font-mono">RoyaltyPaid</span> events.
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t border-border pt-3">
        <strong className="text-foreground">How it works:</strong> Payment goes to
        RoyaltyVault.sol → walks lineage tree → distributes 50% to owner, 25% to parents,
        15% to grandparents, 7% to great-grandparents, 3% to training contributors.
        All in one atomic tx.
      </div>
    </div>
  );
}

/**
 * Help component to register as compute provider (demo flow).
 */
export function RegisterProviderButton() {
  const { address } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleRegister() {
    if (!address) return toast.error("Connect wallet");
    const stake = BigInt("100000000000000000"); // 0.1 ether
    writeContract(
      {
        address: CONTRACT_ADDRESSES.RoyaltyVault,
        abi: ROYALTY_VAULT_ABI,
        functionName: "registerProvider",
        args: [address, stake],
        value: stake,
      },
      {
        onSuccess: () => toast.success("Registered as compute provider"),
        onError: (err) => toast.error(err.message.slice(0, 200)),
      }
    );
  }

  return (
    <button
      onClick={handleRegister}
      disabled={isPending || isSuccess}
      className="text-xs text-muted-foreground hover:text-mekar-green underline underline-offset-2 transition-colors"
    >
      {isPending ? "Registering..." : isSuccess ? "✓ Registered" : "Register as compute provider (0.1 0G stake)"}
    </button>
  );
}
