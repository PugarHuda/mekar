/**
 * Lightweight Sentry bridge.
 *
 * The full `@sentry/nextjs` SDK pulls in 80+ KB and a config wizard
 * that needs source-map upload tokens. For hackathon scope we don't
 * need the full feature set — we just need errors to land in a
 * Sentry project when one is provisioned.
 *
 * This module posts a minimal Sentry envelope to the DSN's `/store/`
 * endpoint directly. Same wire format as the SDK; same project view.
 *
 * Activation:
 *   SENTRY_DSN=https://<key>@<host>/<project>      (server-side)
 *   NEXT_PUBLIC_SENTRY_DSN=...                      (client-side)
 *
 * Without DSN → all functions no-op so dev / unconfigured deployments
 * don't pay the network cost.
 */

type SentryEvent = {
    message: string;
    level?: "error" | "warning" | "info";
    extra?: Record<string, unknown>;
    tags?: Record<string, string>;
    stack?: string;
};

const SERVER_DSN = process.env.SENTRY_DSN;
const CLIENT_DSN =
    typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_SENTRY_DSN
        : undefined;

function parseDsn(dsn: string | undefined): {
    storeUrl: string;
    publicKey: string;
    projectId: string;
} | null {
    if (!dsn) return null;
    // DSN format: https://<key>@<host>/<projectId>
    const m = dsn.match(/^https?:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!m) return null;
    const [, publicKey, host, projectId] = m;
    return {
        storeUrl: `https://${host}/api/${projectId}/store/`,
        publicKey,
        projectId,
    };
}

async function send(dsn: string | undefined, event: SentryEvent): Promise<void> {
    const parsed = parseDsn(dsn);
    if (!parsed) return;

    const body = {
        event_id: crypto.randomUUID().replace(/-/g, ""),
        timestamp: new Date().toISOString(),
        platform: typeof window === "undefined" ? "node" : "javascript",
        level: event.level ?? "error",
        message: event.message,
        tags: { app: "mekar", ...(event.tags ?? {}) },
        extra: event.extra ?? {},
        exception: event.stack
            ? {
                  values: [
                      {
                          type: "RenderError",
                          value: event.message,
                          stacktrace: { frames: [{ filename: event.stack.slice(0, 800) }] },
                      },
                  ],
              }
            : undefined,
    };

    try {
        await fetch(parsed.storeUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Sentry-Auth":
                    `Sentry sentry_version=7, sentry_key=${parsed.publicKey},` +
                    ` sentry_client=mekar-bridge/0.1`,
            },
            body: JSON.stringify(body),
            keepalive: true,
        });
    } catch {
        // Best-effort; never let observability throw into the app.
    }
}

/**
 * Capture an error from the client. Safe to call without checking the
 * DSN — no-ops when unset. Always returns void so caller chaining
 * doesn't surface failure paths.
 */
export async function captureClient(event: SentryEvent): Promise<void> {
    return send(CLIENT_DSN, event);
}

/** Capture an error from a server route handler. */
export async function captureServer(event: SentryEvent): Promise<void> {
    return send(SERVER_DSN, event);
}

export const sentryEnabled = {
    client: !!CLIENT_DSN,
    server: !!SERVER_DSN,
};
