// Fixed-window, in-memory rate limiter for the API routes.
//
// Scope honesty: this protects a single server process (local dev, one Node
// instance). On serverless/multi-instance deploys each instance keeps its own
// window, so the effective limit is (limit × instances) — still a meaningful
// brake on brute force, but a shared store (e.g. Upstash/Redis) should replace
// this before real PHI + real traffic. The call-site API is deliberately shaped
// so that swap is a one-file change.

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when the window ends
}

const buckets = new Map<string, Bucket>();

// Cap the map so a key-spraying client can't grow memory unboundedly.
const MAX_BUCKETS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number; // 0 when ok
}

export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    // Still over cap after sweeping? Reject rather than grow — fail closed.
    if (buckets.size > MAX_BUCKETS) return { ok: false, retryAfterSec: Math.ceil(opts.windowMs / 1000) };
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Best-effort client address for keying. Behind Vercel/a proxy the first
// x-forwarded-for hop is the client; locally there is no header and every
// caller shares the "local" bucket, which is fine for dev.
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "local";
}

// Test-only reset so unit tests get a clean window.
export function _resetRateLimiter(): void {
  buckets.clear();
}
