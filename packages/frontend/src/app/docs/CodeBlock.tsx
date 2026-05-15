"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Code block with a copy-to-clipboard button.
 *
 * The /docs page is a Server Component (it exports `metadata`), so the
 * copy interaction — which needs `navigator.clipboard` + local state
 * for the "copied" tick — has to live in its own client island. Same
 * `Code` name + props as the old inline component, so call sites in
 * page.tsx don't change beyond the import.
 */
export function Code({
    children,
    language,
}: {
    children: string;
    language?: string;
}) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            // Reset the tick after a beat so the button is reusable.
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard blocked (insecure context / permissions) —
            // fail silently; the code is still selectable by hand.
        }
    }

    return (
        <div style={{ position: "relative" }}>
            <button
                type="button"
                onClick={copy}
                aria-label={copied ? "Copied" : "Copy code"}
                style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 9px",
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    border: "1px solid var(--rule)",
                    borderRadius: 5,
                    background: copied ? "var(--gold)" : "var(--surface)",
                    color: copied ? "var(--cocoa)" : "var(--ink-soft)",
                    cursor: "pointer",
                    transition: "background 120ms ease, color 120ms ease",
                }}
            >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
            </button>
            <pre
                style={{
                    background: "var(--bg-alt)",
                    border: "1px solid var(--rule)",
                    borderRadius: 6,
                    padding: "16px 18px",
                    overflowX: "auto",
                    fontFamily: "var(--mono)",
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: "var(--ink)",
                    margin: 0,
                }}
            >
                {language && (
                    <div
                        style={{
                            fontSize: 10,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--ink-soft)",
                            marginBottom: 8,
                        }}
                    >
                        {language}
                    </div>
                )}
                <code style={{ fontFamily: "inherit", whiteSpace: "pre" }}>
                    {children}
                </code>
            </pre>
        </div>
    );
}
