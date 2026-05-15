"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Trees,
    Sprout,
    TrendingUp,
    LayoutDashboard,
    BookOpen,
} from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * Bottom-anchored 5-icon nav for mobile.
 *
 * Replaces the hamburger sheet at the same breakpoint the
 * desktop nav hides at (≤ 767px in Tailwind's `md` scheme).
 * Rationale:
 *   - Thumb reach: bottom-anchored taps are noticeably faster
 *     than top-right hamburger taps on phones, per mobile
 *     interaction research and Apple HIG.
 *   - Always-visible: users always know where they are vs
 *     having to open a sheet to find out.
 *   - No JS toggle: the bar is just five Links — no state, no
 *     overlay z-index issues, no body scroll lock.
 *
 * Hidden at ≥ 768px (desktop nav owns that range). Implemented
 * via `md:hidden` to mirror the existing pattern in Header.tsx.
 */

type Item = {
    href: string;
    tKey: "nav.explorer" | "nav.mint" | "nav.trending" | "nav.dashboard" | "nav.docs";
    fallback: string;
    Icon: typeof Trees;
};

const ITEMS: Item[] = [
    { href: "/explorer", tKey: "nav.explorer", fallback: "Explorer", Icon: Trees },
    { href: "/mint", tKey: "nav.mint", fallback: "Mint", Icon: Sprout },
    { href: "/trending", tKey: "nav.trending", fallback: "Trending", Icon: TrendingUp },
    { href: "/dashboard", tKey: "nav.dashboard", fallback: "Dashboard", Icon: LayoutDashboard },
    { href: "/docs", tKey: "nav.docs", fallback: "Docs", Icon: BookOpen },
];

export function MobileBottomNav() {
    const pathname = usePathname() ?? "/";
    const t = useT();
    return (
        <nav
            aria-label="Primary navigation"
            className="md:hidden"
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 60,
                background: "var(--surface)",
                borderTop: "1.5px solid var(--cocoa)",
                // iOS safe-area inset so the bar doesn't sit on the
                // home-indicator pill.
                paddingBottom: "env(safe-area-inset-bottom, 0)",
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.04em",
            }}
        >
            {ITEMS.map(({ href, tKey, fallback, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                    <Link
                        key={href}
                        href={href}
                        prefetch={false}
                        aria-current={active ? "page" : undefined}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            padding: "10px 4px 12px",
                            minHeight: 56,
                            textDecoration: "none",
                            color: active ? "var(--cocoa)" : "var(--ink-soft)",
                            background: active ? "var(--gold)" : "transparent",
                            transition: "all 0.15s",
                        }}
                    >
                        <Icon size={18} aria-hidden />
                        <span
                            style={{
                                fontWeight: active ? 600 : 500,
                                textTransform: "uppercase",
                            }}
                        >
                            {t(tKey) || fallback}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
