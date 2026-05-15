"use client";

import { Component, type ReactNode } from "react";
import { captureClient } from "@/lib/sentry";

/**
 * Catches render-phase errors so a bug in one panel doesn't break the
 * whole page. Useful when localStorage holds a malformed metadata blob
 * (legacy from earlier app versions), a wagmi hook trips on an unhandled
 * contract return shape, or a third-party library throws on hydration.
 *
 * Falls back to a small woodcut-styled card with the error message so
 * the user can still navigate via Header. We deliberately don't
 * `componentDidCatch` to a logging endpoint here — the hackathon scope
 * doesn't include observability infra.
 */

type Props = {
    children: ReactNode;
    /** Optional render override for the fallback UI. */
    fallback?: (err: Error, reset: () => void) => ReactNode;
};

type State = { err: Error | null };

export class ErrorBoundary extends Component<Props, State> {
    state: State = { err: null };

    static getDerivedStateFromError(err: Error): State {
        return { err };
    }

    componentDidCatch(err: Error) {
        // Best-effort fan-out to two sinks. Either or both may be
        // unconfigured; both swallow their own failures so a degraded
        // backend never makes the broken-render UX worse.
        const path = typeof window !== "undefined" ? window.location.pathname : undefined;
        try {
            void fetch("/api/log/error", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: err.message.slice(0, 500),
                    stack: err.stack?.slice(0, 4_000),
                    path,
                    source: "render",
                }),
            }).catch(() => {
                /* observability is best-effort */
            });
        } catch {
            // Even constructing the request can throw (e.g. JSON cycle).
            // Swallow rather than re-enter the boundary.
        }
        // Sentry direct — no-ops if NEXT_PUBLIC_SENTRY_DSN unset.
        // Ships richer event data than the server log endpoint can
        // (stack frames, tags, level).
        void captureClient({
            message: err.message,
            stack: err.stack,
            tags: { source: "render", path: path ?? "(unknown)" },
        });
    }

    reset = () => this.setState({ err: null });

    render() {
        const { err } = this.state;
        if (!err) return this.props.children;

        if (this.props.fallback) return this.props.fallback(err, this.reset);

        return (
            <div
                role="alert"
                style={{
                    maxWidth: "62ch",
                    margin: "60px auto",
                    padding: "28px 32px",
                    border: "1.5px solid var(--cocoa)",
                    background: "var(--bg-alt)",
                    borderRadius: "var(--radius)",
                    fontFamily: "var(--body)",
                }}
            >
                <div
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--rose, #c25a4a)",
                        marginBottom: 10,
                    }}
                >
                    Render error
                </div>
                <h2
                    style={{
                        fontFamily: "var(--display)",
                        fontStyle: "italic",
                        fontSize: 28,
                        marginBottom: 12,
                    }}
                >
                    Something tripped this bloom.
                </h2>
                <p style={{ color: "var(--ink-soft)", marginBottom: 18 }}>
                    A widget threw mid-render. The rest of the page is fine — pick a
                    different page from the header, or try again.
                </p>
                <details
                    style={{
                        fontFamily: "var(--mono)",
                        fontSize: 12,
                        background: "var(--surface)",
                        border: "1px solid var(--rule)",
                        borderRadius: 4,
                        padding: "10px 12px",
                        marginBottom: 18,
                    }}
                >
                    <summary style={{ cursor: "pointer", color: "var(--ink-soft)" }}>
                        Show error message
                    </summary>
                    <pre
                        style={{
                            marginTop: 8,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            color: "var(--ink)",
                        }}
                    >
                        {err.message}
                    </pre>
                </details>
                <button type="button" onClick={this.reset} className="btn">
                    Try again
                </button>
            </div>
        );
    }
}
