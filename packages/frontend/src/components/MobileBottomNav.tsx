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
 * Bottom-anchored 5-icon nav — phones only.
 *
 * Visibility is enforced TWICE to make sure desktop never sees it:
 *   1. Tailwind `md:hidden` class (hidden at 768px and above)
 *   2. A `@media (min-width: 768px)` rule on the root container
 *      that sets `display: none` — defensive against any cascade
 *      that might leak the bar into a desktop view (e.g. broken
 *      Tailwind purge during a dirty build).
 *
 * Without the second layer, a single `md:hidden` typo elsewhere
 * could float the bar onto desktop and obscure the footer there.
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
            className="mekar-mobile-nav md:hidden"
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 60,
                background: "var(--surface)",
                borderTop: "1.5px solid var(--cocoa)",
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
