"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ACTIVE_CHAIN, FAUCET_URL } from "@/lib/chains";
import { AlertTriangle, ExternalLink, Coins } from "lucide-react";
import Link from "next/link";

/**
 * Banner that warns when user is on wrong network or has no balance.
 * Auto-prompts to switch to 0G Galileo.
 */
export function NetworkBanner() {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) return null;

  const isWrongChain = currentChainId !== ACTIVE_CHAIN.id;

  if (isWrongChain) {
    return (
      <div className="border-b border-mekar-gold/30 bg-mekar-gold/10">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-mekar-gold" />
            <span className="font-semibold text-mekar-gold">Wrong network</span>
            <span className="text-muted-foreground">
              Switch to {ACTIVE_CHAIN.name} (chain {ACTIVE_CHAIN.id})
            </span>
          </div>
          <button
            onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}
            disabled={isPending}
            className="rounded-md bg-mekar-gold px-3 py-1 text-xs font-semibold text-background hover:bg-amber-400 disabled:opacity-50"
          >
            {isPending ? "Switching..." : "Switch to 0G"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function FaucetReminder() {
  return (
    <Link
      href={FAUCET_URL}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-mekar-green transition-colors"
    >
      <Coins className="h-3.5 w-3.5" />
      Need testnet $0G? Get from faucet
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
}
