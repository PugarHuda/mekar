/**
 * Pluggable rate limiter.
 *
 * Backend resolution at module load:
 *   - If `KV_REST_API_URL` + `KV_REST_API_TOKEN` are set (Vercel KV /
 *     Upstash), use the HTTP REST API. Global per-deploy, survives
 *     cold starts, multi-instance safe.
 *   - Otherwise, fall back to an in-memory Map. Per-instance only,
 *     resets on cold start — but still rate-limits within a warm
 *     function. Acceptable for local dev + low-traffic hackathon.
 *
 * The same shape is exposed regardless of backend, so callers don't
 * branch. Adding a real Redis client later is a one-line change.
 *
 * Quota semantics: fixed window, NOT a rolling sliding window. Fixed
 * window is easier to reason about (and atomic with a single
 * INCR/EXPIRE pair on Redis) at the cost of "edge" bursts at the
 * window boundary. For our threat model (drain attack) this is fine —
 * the attacker still tops out at `limit` per `windowMs`.
 */

type CheckResult = { allowed: boolean; retryAfterMs: number };

interface RateLimiter {
    /** Returns whether the key is below the per-window quota. */
    check(key: string, limit: number, windowMs: number): Promise<CheckResult>;
}

/* ─────────────── In-memory backend ─────────────── */

class MemoryLimiter implements RateLimiter {
    private buckets = new Map<string, { count: number; resetAt: number }>();
    // Without periodic pruning the map grows by one entry per unique IP
    // forever — a slow leak on a long-lived warm instance. We sweep
    // expired entries every `PRUNE_EVERY` checks; O(n) but n is tiny
    // and it only runs occasionally.
    private checksSincePrune = 0;
    private static readonly PRUNE_EVERY = 200;

    private prune(now: number): void {
        for (const [key, entry] of this.buckets) {
            if (entry.resetAt < now) this.buckets.delete(key);
        }
    }

    async check(
        key: string,
        limit: number,
        windowMs: number
    ): Promise<CheckResult> {
        const now = Date.now();

        if (++this.checksSincePrune >= MemoryLimiter.PRUNE_EVERY) {
            this.checksSincePrune = 0;
            this.prune(now);
        }

        const entry = this.buckets.get(key);
        if (!entry || entry.resetAt < now) {
            this.buckets.set(key, { count: 1, resetAt: now + windowMs });
            return { allowed: true, retryAfterMs: 0 };
        }
        if (entry.count >= limit) {
            return { allowed: false, retryAfterMs: entry.resetAt - now };
        }
        entry.count++;
        return { allowed: true, retryAfterMs: 0 };
    }
}

/* ─────────────── Vercel KV / Upstash backend ─────────────── */

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

class KvLimiter implements RateLimiter {
    private url: string;
    private token: string;

    constructor(url: string, token: string) {
        this.url = url.replace(/\/$/, "");
        this.token = token;
    }

    /**
     * Each check is `INCR key` followed by `EXPIRE key windowSec NX`.
     * NX means "only set TTL if no TTL exists" — so the first request
     * in a window sets the expiry and every subsequent INCR within
     * the same window inherits it. Two REST calls per check, but
     * both are O(1) on the KV side and arrive over the same TLS
     * connection (kept warm by Fluid Compute).
     */
    async check(
        key: string,
        limit: number,
        windowMs: number
    ): Promise<CheckResult> {
        const fullKey = `mekar:rl:${key}`;
        const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

        try {
            const count = await this.kv<number>(["INCR", fullKey]);
            if (count === 1) {
                // First hit of the window — set the TTL.
                await this.kv(["EXPIRE", fullKey, String(windowSec)]);
            }
            if (count > limit) {
                // Get TTL to compute retry-after. PTTL returns ms.
                const ttlMs = await this.kv<number>(["PTTL", fullKey]);
                return {
                    allowed: false,
                    retryAfterMs: ttlMs > 0 ? ttlMs : windowMs,
                };
            }
            return { allowed: true, retryAfterMs: 0 };
        } catch (err) {
            // If KV is unreachable, fail-open (don't block legitimate
            // traffic for a backend hiccup). The in-memory fallback
            // would have allowed them anyway.
            // eslint-disable-next-line no-console
            console.warn("[rateLimit] KV unreachable, allowing:", err);
            return { allowed: true, retryAfterMs: 0 };
        }
    }

    private async kv<T = unknown>(cmd: string[]): Promise<T> {
        const res = await fetch(this.url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(cmd),
            // Vercel KV recommends no-store so multiple checks aren't
            // collapsed by the edge cache.
            cache: "no-store",
        });
        if (!res.ok) {
            throw new Error(`KV ${cmd[0]} failed: ${res.status}`);
        }
        const data = (await res.json()) as { result: T };
        return data.result;
    }
}

/* ─────────────── Public singleton ─────────────── */

export const rateLimiter: RateLimiter =
    KV_URL && KV_TOKEN ? new KvLimiter(KV_URL, KV_TOKEN) : new MemoryLimiter();

export const rateLimitBackend = KV_URL && KV_TOKEN ? "kv" : "memory";
