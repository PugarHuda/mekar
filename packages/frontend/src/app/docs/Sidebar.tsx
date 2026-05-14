"use client";

import { useEffect, useState } from "react";

/**
 * Sticky left-rail nav for /docs.
 *
 * Server Components can't run IntersectionObserver, so this is the small
 * client island that handles two things:
 *
 *   1. Anchor-link rendering — feeds back the active section id so the
 *      pill highlight tracks the scroll position (classic Stripe/Tailwind
 *      docs pattern).
 *   2. Smooth scroll on click — the default `<a href="#…">` jump is
 *      jarring; we preventDefault + use scrollIntoView with offset for
 *      the sticky Header (~80px) so the section heading lands flush
 *      under the header instead of getting clipped.
 *
 * The sections list is passed in from the server page so this component
 * stays purely presentational + interactive — sections are still
 * rendered by the parent.
 */

export type DocSection = {
    id: string;
    label: string;
    eyebrow?: string;
};

export function DocsSidebar({ sections }: { sections: DocSection[] }) {
    const [active, setActive] = useState<string>(sections[0]?.id ?? "");

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Watch every section heading and track the topmost one inside the
        // viewport (with some margin to compensate for the sticky header).
        const observer = new IntersectionObserver(
            (entries) => {
                // Pick the first entry whose top is within the active band.
                // rootMargin pulls the trigger zone down ~120px from the
                // viewport top so the highlight switches once a section
                // crosses the header line.
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) {
                    setActive(visible[0].target.id);
                }
            },
            { rootMargin: "-100px 0px -65% 0px", threshold: 0 }
        );

        for (const s of sections) {
            const el = document.getElementById(s.id);
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, [sections]);

    function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
        e.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        // Manual scroll with a 90px offset so the section heading lands
        // just below the sticky header rather than getting hidden by it.
        const y = el.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: "smooth" });
        setActive(id);
        // Update the URL hash without a second scroll jump.
        history.replaceState(null, "", `#${id}`);
    }

    return (
        <aside className="docs-sidebar">
            <div
                style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ink-soft)",
                    marginBottom: 14,
                    paddingLeft: 12,
                }}
            >
                On this page
            </div>
            <nav>
                <ul
                    style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    {sections.map((s) => {
                        const isActive = active === s.id;
                        return (
                            <li key={s.id}>
                                <a
                                    href={`#${s.id}`}
                                    onClick={(e) => handleClick(e, s.id)}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1,
                                        padding: "8px 12px",
                                        borderLeft: isActive
                                            ? "2px solid var(--cocoa)"
                                            : "2px solid transparent",
                                        background: isActive
                                            ? "var(--bg-alt)"
                                            : "transparent",
                                        textDecoration: "none",
                                        color: isActive ? "var(--cocoa)" : "var(--ink-soft)",
                                        fontWeight: isActive ? 600 : 500,
                                        fontSize: 13.5,
                                        borderRadius: "0 4px 4px 0",
                                        transition:
                                            "background 120ms ease, border-color 120ms ease, color 120ms ease",
                                    }}
                                >
                                    <span>{s.label}</span>
                                    {s.eyebrow && (
                                        <span
                                            style={{
                                                fontFamily: "var(--mono)",
                                                fontSize: 10,
                                                color: "var(--ink-soft)",
                                                opacity: 0.7,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {s.eyebrow}
                                        </span>
                                    )}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
