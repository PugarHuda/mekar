"use client";

import { Component, type ReactNode } from "react";

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
