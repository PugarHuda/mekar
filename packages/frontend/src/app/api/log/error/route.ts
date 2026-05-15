/**
 * POST /api/log/error
 *
 * Minimal client-error sink. ErrorBoundary + critical client-side
 * try/catch sites POST here so the operator can see render failures
 * that never reach the server logs.
 *
 * Production should swap this for Sentry / Highlight / Vercel Agent;
 * here we just stream to console.error (Vercel collects function logs).
 * That's enough for a hackathon — the goal is to stop pretending the
 * frontend is observable when it has zero error reporting.
 *
 * Hardening:
 *   - Origin allowlist (same patterns as /api/storage/upload).
 *   - Rate limit per IP (12 errors/min — generous so a real error
 *     storm gets captured but a malicious one gets throttled).
 *   - Payload caps: each field bounded so logs stay readable.
 *   - No PII echo: we don't accept arbitrary user content in the body,
 *     only the three fields below.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LogSchema = z.object({
    message: z.string().min(1).max(500),
    stack: z.string().max(4_000).optional(),
    /** Where in the app the error fired. e.g. "/agent/[id]". */
    path: z.string().max(200).optional(),
    /** "render" | "fetch" | "wallet" | "upload" — caller-tagged source. */
    source: z.string().max(40).optional(),
});

const ALLOWED_ORIGIN_PATTERNS = [
    /^https:\/\/mekar\.vercel\.app$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
];

function originAllowed(origin: string | null): boolean {
    if (!origin) return true;
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

const BUCKET_SIZE = 12;
const BUCKET_WINDOW_MS = 60_000;
const ipBucket = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
    const now = Date.now();
    const entry = ipBucket.get(ip);
    if (!entry || entry.resetAt < now) {
        ipBucket.set(ip, { count: 1, resetAt: now + BUCKET_WINDOW_MS });
        return true;
    }
    if (entry.count >= BUCKET_SIZE) return false;
    entry.count++;
    return true;
}

export async function POST(req: NextRequest) {
    const origin = req.headers.get("origin") ?? req.headers.get("referer");
    if (!originAllowed(origin)) {
        return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
    }
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "shared";
    if (!checkRate(ip)) {
        return NextResponse.json({ error: "rate limited" }, { status: 429 });
    }

    let body: z.infer<typeof LogSchema>;
    try {
        body = LogSchema.parse(await req.json());
    } catch {
        return NextResponse.json({ error: "bad payload" }, { status: 400 });
    }

    // eslint-disable-next-line no-console
    console.error("[mekar:client-error]", {
        message: body.message,
        path: body.path ?? "(unknown)",
        source: body.source ?? "(unknown)",
        stack: body.stack?.slice(0, 1_500),
        ip: ip === "shared" ? "shared" : `${ip.slice(0, 6)}…`,
        at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
}
