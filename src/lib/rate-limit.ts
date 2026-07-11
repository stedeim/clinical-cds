// Two-mode rate limiter for the API routes.
//
// Mode A — Upstash (production): when UPSTASH_REDIS_REST_URL / _TOKEN are set,
// buckets live in a shared Redis so limits are enforced across every
// serverless instance. Sliding window for smoother behaviour under bursty
// traffic.
//
// Mode B — In-memory (dev, tests, single-instance): fixed window per key,
// bounded map so a key-spraying client can't grow memory unboundedly. This is
// the fallback when Upstash env is not configured.
//
// Both modes expose the same async `rateLimit(key, opts)` contract. Callers
// don't branch on which store is active.
//
// `composedRateLimit` runs a per-user check and a per-IP check together. Any
// failure short-circuits with a standardized 429 envelope so the UI can show
// a real message instead of "something went wrong".
//
// PHI posture: keys hold only identifiers (clinician uuids, IPs, emails
// hashed at the caller if needed). Nothing about the request body ever
// touches a rate-limit key or a 429 body.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// --- Shared contract ---

export interface RateLimitConfig {
  max: number;
  windowMs: number;
  // Optional label used as the Upstash key prefix (e.g. "query", "signup").
  // Keeps buckets partitioned by route class for easier ops observability.
  label?: string;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number; // 0 when ok
}

// --- In-memory fallback (unchanged fixed-window semantics) ---

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when the window ends
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function inMemoryRateLimit(key: string, opts: RateLimitConfig): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) {
      return { ok: false, retryAfterSec: Math.ceil(opts.windowMs / 1000) };
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > opts.max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// --- Upstash-backed limiter (lazy, cached per config) ---

let cachedRedis: Redis | null = null;
let redisResolved = false;
const upstashLimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redisResolved) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    cachedRedis = new Redis({ url, token });
  }
  redisResolved = true;
  return cachedRedis;
}

function getUpstashLimiter(opts: RateLimitConfig): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${opts.label ?? "default"}:${opts.max}:${opts.windowMs}`;
  const cached = upstashLimiters.get(key);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.max, `${opts.windowMs} ms`),
    prefix: `rl:${opts.label ?? "default"}`,
    analytics: false,
  });
  upstashLimiters.set(key, limiter);
  return limiter;
}

// --- Public API ---

export async function rateLimit(key: string, opts: RateLimitConfig): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(opts);
  if (upstash) {
    try {
      const res = await upstash.limit(key);
      if (res.success) return { ok: true, retryAfterSec: 0 };
      const retryAfterSec = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
      return { ok: false, retryAfterSec };
    } catch (err) {
      // Never let a Redis blip take an endpoint down. Log and fall through to
      // the in-memory bucket so the request is still bounded.
      console.error("[rate-limit] Upstash error, falling back to memory", err);
    }
  }
  return inMemoryRateLimit(key, opts);
}

// Best-effort client address for keying. Behind Vercel/a proxy the first
// x-forwarded-for hop is the client; locally there is no header and every
// caller shares the "local" bucket, which is fine for dev.
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "local";
}

// Standardized 429 envelope. Kept small on purpose — nothing about the
// request itself leaks into the response, only the rate-limit metadata.
export const RATE_LIMITED_BODY = { error: "rate_limit_exceeded" as const };

export interface ComposedRateLimitOptions {
  // Optional signed-in identifier (clinician uuid). When absent, only the
  // per-IP bucket is consulted — the unauth path.
  userIdentifier?: string;
  userConfig?: RateLimitConfig;
  ipConfig: RateLimitConfig;
}

// Runs the per-user bucket (if a userIdentifier is supplied) and the per-IP
// bucket. Whichever is exhausted first wins — the caller returns 429 with the
// smaller retry hint.
export async function composedRateLimit(
  req: Request,
  opts: ComposedRateLimitOptions,
): Promise<RateLimitResult> {
  const ip = clientIp(req);
  const ipLabel = opts.ipConfig.label ?? "ip";
  const ipRes = await rateLimit(`${ipLabel}:ip:${ip}`, opts.ipConfig);

  if (!opts.userIdentifier || !opts.userConfig) return ipRes;

  const userLabel = opts.userConfig.label ?? "user";
  const userRes = await rateLimit(
    `${userLabel}:user:${opts.userIdentifier}`,
    opts.userConfig,
  );

  if (!ipRes.ok && !userRes.ok) {
    return {
      ok: false,
      retryAfterSec: Math.max(ipRes.retryAfterSec, userRes.retryAfterSec),
    };
  }
  if (!ipRes.ok) return ipRes;
  if (!userRes.ok) return userRes;
  return { ok: true, retryAfterSec: 0 };
}

// Test-only reset so unit tests get a clean window across both modes.
export function _resetRateLimiter(): void {
  buckets.clear();
  upstashLimiters.clear();
  cachedRedis = null;
  redisResolved = false;
}
