"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, TreePine, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/explorer", label: "Explorer" },
  { href: "/mint", label: "Mint" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-foreground shrink-0">
          <TreePine className="h-6 w-6 text-mekar-green" strokeWidth={2.5} />
          <span className="text-lg font-bold tracking-tight">MEKAR</span>
          <span className="hidden md:inline text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-2">
            Galileo Testnet
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="https://faucet.0g.ai"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Faucet ↗
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ConnectButton
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
            showBalance={{ smallScreen: false, largeScreen: true }}
          />

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-md border border-border h-9 w-9 text-foreground"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="https://faucet.0g.ai"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
            >
              Faucet ↗
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
