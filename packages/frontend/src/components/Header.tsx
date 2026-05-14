"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BloomLogo } from "@/components/Bloom";
import { NetworkBanner } from "@/components/NetworkBanner";
import { Menu, X, AlertTriangle } from "lucide-react";

// Primary top-bar nav — kept tight (5 items) so the bar doesn't feel like
// a sitemap. The brand logo on the left already links Home, and Manifesto
// is reachable from the footer + mobile menu so we don't need to spend a
// top-bar slot on it. Docs links to the in-app /docs page so devs get
// a MEKAR-branded experience with copy-paste recipes; that page links
// out to the raw markdown on GitHub for the full reference.

type NavItem = {
    href: string;
    label: string;
    k: string;
    external?: boolean;
};

const NAV: NavItem[] = [
    { href: "/explorer", label: "Explorer", k: "explorer" },
    { href: "/mint", label: "Mint", k: "mint" },
    { href: "/trending", label: "Trending", k: "trending" },
    { href: "/dashboard", label: "Dashboard", k: "dashboard" },
    { href: "/docs", label: "Docs", k: "docs" },
];

// Mobile menu shows everything; phone users get a full sheet so there's
// no compelling reason to hide items there.
const MOBILE_NAV: NavItem[] = [
    { href: "/", label: "Home", k: "home" },
    ...NAV,
    { href: "/manifesto", label: "Manifesto", k: "manifesto" },
];

function detectActive(pathname: string): string {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/explorer") || pathname.startsWith("/agent")) return "explorer";
    if (pathname.startsWith("/trending")) return "trending";
    if (pathname.startsWith("/mint")) return "mint";
    if (pathname.startsWith("/dashboard")) return "dashboard";
    if (pathname.startsWith("/docs")) return "docs";
    if (pathname.startsWith("/manifesto")) return "manifesto";
    return "home";
}

export function Header() {
    const pathname = usePathname();
    const active = detectActive(pathname ?? "/");
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <NetworkBanner />
            <nav className="nav">
                <div className="nav__inner">
                <Link href="/" className="nav__brand">
                    <BloomLogo size={36} sw={1.6} />
                    <span>
                        Mekar
                        <sup
                            style={{
                                fontSize: 10,
                                color: "var(--ink-soft)",
                                marginLeft: 4,
                                fontStyle: "normal",
                            }}
                        >
                            ♦
                        </sup>
                    </span>
                </Link>

                <div className="nav__links" style={{ display: "none" }} />
                <div
                    className="hidden md:flex items-center gap-1 ml-auto text-[14px]"
                    style={{ color: "var(--ink-soft)" }}
                >
                    {NAV.map((l) => {
                        const isActive = active === l.k;
                        return (
                            <Link
                                key={l.k}
                                href={l.href}
                                target={l.external ? "_blank" : undefined}
                                rel={l.external ? "noreferrer" : undefined}
                                className={isActive ? "active" : ""}
                                style={{
                                    position: "relative",
                                    padding: "8px 14px",
                                    borderRadius: 999,
                                    transition: "all 0.18s",
                                    fontWeight: isActive ? 600 : 500,
                                    textDecoration: "none",
                                    color: isActive ? "var(--cocoa)" : "var(--ink-soft)",
                                    background: isActive ? "var(--gold)" : "transparent",
                                    border: isActive
                                        ? "1.5px solid var(--cocoa)"
                                        : "1.5px solid transparent",
                                }}
                            >
                                {l.label}
                                {l.external && (
                                    <span
                                        aria-hidden
                                        style={{
                                            marginLeft: 4,
                                            fontSize: 10,
                                            opacity: 0.6,
                                        }}
                                    >
                                        ↗
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="hidden md:inline-flex">
                    <WalletConnect />
                </div>

                <button
                    type="button"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-label="Toggle menu"
                    aria-expanded={mobileOpen}
                    className="md:hidden inline-flex items-center justify-center rounded-md h-9 w-9 ml-auto"
                    style={{ border: "1.5px solid var(--rule)", color: "var(--ink)" }}
                >
                    {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
            </div>

            {mobileOpen && (
                <div
                    className="md:hidden"
                    style={{ borderTop: "1px solid var(--rule)", background: "var(--bg)" }}
                >
                    <div
                        style={{
                            maxWidth: "var(--max-w)",
                            margin: "0 auto",
                            padding: "12px var(--pad-edge)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            fontSize: 14,
                        }}
                    >
                        {MOBILE_NAV.map((l) => {
                            const isActive = active === l.k;
                            return (
                                <Link
                                    key={l.k}
                                    href={l.href}
                                    target={l.external ? "_blank" : undefined}
                                    rel={l.external ? "noreferrer" : undefined}
                                    onClick={() => setMobileOpen(false)}
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: 8,
                                        background: isActive ? "var(--gold)" : "transparent",
                                        color: isActive ? "var(--cocoa)" : "var(--ink)",
                                        fontWeight: isActive ? 600 : 500,
                                        textDecoration: "none",
                                    }}
                                >
                                    {l.label}
                                    {l.external && (
                                        <span
                                            aria-hidden
                                            style={{
                                                marginLeft: 4,
                                                fontSize: 11,
                                                opacity: 0.6,
                                            }}
                                        >
                                            ↗
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                        <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                            <WalletConnect onAfterAction={() => setMobileOpen(false)} />
                        </div>
                    </div>
                </div>
            )}
            </nav>
        </>
    );
}

/**
 * Cream/gold-themed wrapper around RainbowKit's ConnectButton.Custom so we get
 * the full multi-wallet modal (MetaMask, WalletConnect, Coinbase, etc.) and
 * automatic chain-switch UX while keeping the woodcut visual language.
 */
function WalletConnect({ onAfterAction }: { onAfterAction?: () => void }) {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                if (!ready) {
                    return (
                        <button
                            type="button"
                            disabled
                            aria-hidden
                            className="nav__connect"
                            style={{ opacity: 0, pointerEvents: "none" }}
                        >
                            <BloomLogo size={18} sw={2} />
                            <span>Connect wallet</span>
                        </button>
                    );
                }

                if (!connected) {
                    return (
                        <button
                            type="button"
                            className="nav__connect"
                            onClick={() => {
                                openConnectModal();
                                onAfterAction?.();
                            }}
                        >
                            <BloomLogo size={18} sw={2} />
                            <span>Connect wallet</span>
                        </button>
                    );
                }

                if (chain.unsupported) {
                    return (
                        <button
                            type="button"
                            className="nav__connect"
                            onClick={() => {
                                openChainModal();
                                onAfterAction?.();
                            }}
                            style={{
                                background: "var(--coral)",
                                color: "var(--surface)",
                                borderColor: "var(--cocoa)",
                            }}
                        >
                            <AlertTriangle size={14} />
                            <span>Wrong network</span>
                        </button>
                    );
                }

                return (
                    <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                            type="button"
                            onClick={() => {
                                openChainModal();
                                onAfterAction?.();
                            }}
                            className="nav__connect"
                            style={{
                                background: "var(--surface)",
                                fontFamily: "var(--mono)",
                                fontSize: 12,
                                padding: "6px 12px",
                            }}
                            title={`Connected to ${chain.name}`}
                        >
                            <span
                                aria-hidden
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: "var(--tea)",
                                    boxShadow: "0 0 0 3px rgba(107,138,75,0.18)",
                                }}
                            />
                            <span>{(chain.name ?? "").replace("0G-", "") || "0G"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                openAccountModal();
                                onAfterAction?.();
                            }}
                            className="nav__connect"
                        >
                            <BloomLogo size={18} sw={2} />
                            <span>{account.displayName}</span>
                        </button>
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}
