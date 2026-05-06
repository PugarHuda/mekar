"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { BloomLogo } from "@/components/Bloom";
import { Menu, X } from "lucide-react";
import { shortAddress } from "@/lib/utils";

const NAV = [
    { href: "/", label: "Home", k: "home" },
    { href: "/explorer", label: "Explorer", k: "explorer" },
    { href: "/trending", label: "Trending", k: "trending" },
    { href: "/mint", label: "Mint", k: "mint" },
    { href: "/dashboard", label: "Dashboard", k: "dashboard" },
    { href: "/manifesto", label: "Manifesto", k: "manifesto" },
];

function detectActive(pathname: string): string {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/explorer") || pathname.startsWith("/agent")) return "explorer";
    if (pathname.startsWith("/trending")) return "trending";
    if (pathname.startsWith("/mint")) return "mint";
    if (pathname.startsWith("/dashboard")) return "dashboard";
    if (pathname.startsWith("/manifesto")) return "manifesto";
    return "home";
}

export function Header() {
    const pathname = usePathname();
    const active = detectActive(pathname ?? "/");
    const [mobileOpen, setMobileOpen] = useState(false);

    const { address, isConnected } = useAccount();
    const { connectors, connect, isPending } = useConnect();
    const { disconnect } = useDisconnect();

    const onConnect = () => {
        if (isConnected) {
            disconnect();
            return;
        }
        const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
        if (injected) connect({ connector: injected });
    };

    return (
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
                            </Link>
                        );
                    })}
                </div>

                <button
                    onClick={onConnect}
                    disabled={isPending}
                    className="nav__connect hidden md:inline-flex"
                >
                    <BloomLogo size={18} sw={2} />
                    <span>
                        {isConnected && address
                            ? shortAddress(address, 4)
                            : isPending
                              ? "Connecting…"
                              : "Connect wallet"}
                    </span>
                </button>

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
                        {NAV.map((l) => {
                            const isActive = active === l.k;
                            return (
                                <Link
                                    key={l.k}
                                    href={l.href}
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
                                </Link>
                            );
                        })}
                        <button
                            onClick={onConnect}
                            disabled={isPending}
                            className="nav__connect"
                            style={{ marginTop: 8, justifyContent: "center" }}
                        >
                            <BloomLogo size={18} sw={2} />
                            <span>
                                {isConnected && address
                                    ? shortAddress(address, 4)
                                    : isPending
                                      ? "Connecting…"
                                      : "Connect wallet"}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
