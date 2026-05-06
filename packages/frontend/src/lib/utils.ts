import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatEther } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(address?: string, len = 4): string {
  if (!address) return "—";
  return `${address.slice(0, 2 + len)}…${address.slice(-len)}`;
}

export function formatOG(wei: bigint | undefined, decimals = 4): string {
  if (wei === undefined) return "—";
  const eth = formatEther(wei);
  const num = Number(eth);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(decimals);
}

export function formatTimeAgo(timestamp: number | bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - Number(timestamp);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
