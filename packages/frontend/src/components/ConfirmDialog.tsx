"use client";

import { useEffect } from "react";

/**
 * Modal confirmation in the MEKAR woodcut palette.
 *
 * Replaces the browser-default `window.confirm()` for destructive /
 * mutating actions. `window.confirm` is functional but jarring — it
 * surfaces the OS chrome (different font, blocked scrolling, generic
 * OK/Cancel buttons) which breaks the studio aesthetic. This drop-in
 * keeps the rest of the page composable while still being a true
 * focus-trapped overlay (Esc to dismiss, click backdrop to dismiss).
 *
 * Intentionally minimal — no portal, no animation library, no focus
 * trap library. The body styles enforce overlay rendering above all
 * page chrome via z-index. For a single-modal-at-a-time app this is
 * sufficient.
 */

type Props = {
    open: boolean;
    title: string;
    /** Optional secondary line — mono-styled body text. */
    body?: React.ReactNode;
    /** Button text for the "yes do it" action. Defaults to "Confirm". */
    confirmLabel?: string;
    cancelLabel?: string;
    /** When `danger`, the confirm button renders in coral instead of cocoa. */
    tone?: "default" | "danger";
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmDialog({
    open,
    title,
    body,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "default",
    onConfirm,
    onCancel,
}: Props) {
    // Esc-to-dismiss + body-scroll-lock while open. We restore on cleanup
    // so an unmount mid-overlay doesn't leave the page un-scrollable.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => {
                // Backdrop click dismisses. Inner card stops propagation
                // so clicking inside does NOT close the dialog.
                if (e.target === e.currentTarget) onCancel();
            }}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.42)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 16,
                backdropFilter: "blur(2px)",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 460,
                    background: "var(--surface)",
                    border: "1.5px solid var(--cocoa)",
                    borderRadius: "var(--radius)",
                    padding: 24,
                    fontFamily: "var(--body)",
                    boxShadow: "0 22px 48px -20px rgba(0,0,0,0.45)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3
                    style={{
                        fontFamily: "var(--display)",
                        fontStyle: "italic",
                        fontSize: 24,
                        marginBottom: 10,
                    }}
                >
                    {title}
                </h3>
                {body && (
                    <div
                        style={{
                            fontFamily: "var(--mono)",
                            fontSize: 12,
                            color: "var(--ink-soft)",
                            lineHeight: 1.6,
                            background: "var(--bg-alt)",
                            border: "1px solid var(--rule)",
                            borderRadius: 4,
                            padding: "12px 14px",
                            marginBottom: 18,
                            wordBreak: "break-word",
                        }}
                    >
                        {body}
                    </div>
                )}
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "flex-end",
                    }}
                >
                    <button type="button" onClick={onCancel} className="btn btn--ghost">
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn"
                        style={
                            tone === "danger"
                                ? {
                                      background: "var(--coral, #f5b7a0)",
                                      color: "var(--cocoa)",
                                      borderColor: "var(--cocoa)",
                                  }
                                : undefined
                        }
                        autoFocus
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
