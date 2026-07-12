import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, clientIp, composedRateLimit, _resetRateLimiter } from "@/lib/rate-limit";

describe("rateLimit (in-memory mode)", () => {
  beforeEach(() => {
    _resetRateLimiter();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the max, then rejects with a retry hint", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await rateLimit("k", { max: 5, windowMs: 60_000 });
      expect(r.ok).toBe(true);
    }
    const blocked = await rateLimit("k", { max: 5, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("resets after the window elapses", async () => {
    for (let i = 0; i < 6; i++) await rateLimit("k", { max: 5, windowMs: 60_000 });
    expect((await rateLimit("k", { max: 5, windowMs: 60_000 })).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect((await rateLimit("k", { max: 5, windowMs: 60_000 })).ok).toBe(true);
  });

  it("keys are independent — one client can't exhaust another's budget", async () => {
    for (let i = 0; i < 6; i++) await rateLimit("login:1.2.3.4", { max: 5, windowMs: 60_000 });
    expect((await rateLimit("login:1.2.3.4", { max: 5, windowMs: 60_000 })).ok).toBe(false);
    expect((await rateLimit("login:5.6.7.8", { max: 5, windowMs: 60_000 })).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } });
    expect(clientIp(req)).toBe("203.0.113.9");
  });

  it("falls back to 'local' without the header", () => {
    expect(clientIp(new Request("http://x"))).toBe("local");
  });
});

describe("composedRateLimit", () => {
  beforeEach(() => {
    _resetRateLimiter();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  function reqFromIp(ip: string): Request {
    return new Request("http://x", { headers: { "x-forwarded-for": ip } });
  }

  it("passes when both buckets have budget", async () => {
    const res = await composedRateLimit(reqFromIp("1.1.1.1"), {
      userIdentifier: "clin-a",
      userConfig: { max: 5, windowMs: 60_000, label: "q" },
      ipConfig: { max: 5, windowMs: 60_000, label: "q" },
    });
    expect(res.ok).toBe(true);
  });

  it("rejects when the per-user bucket exhausts first", async () => {
    // Same user, different IPs: user bucket exhausts, IP bucket doesn't.
    const cfg = {
      userIdentifier: "clin-a",
      userConfig: { max: 3, windowMs: 60_000, label: "q" },
      ipConfig: { max: 100, windowMs: 60_000, label: "q" },
    };
    for (let i = 0; i < 3; i++) {
      const r = await composedRateLimit(reqFromIp(`10.0.0.${i}`), cfg);
      expect(r.ok).toBe(true);
    }
    const blocked = await composedRateLimit(reqFromIp("10.0.0.99"), cfg);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("rejects when the per-IP bucket exhausts first", async () => {
    // Same IP, different users: IP bucket exhausts, user bucket doesn't.
    const ipReq = reqFromIp("2.2.2.2");
    const cfg = (userIdentifier: string) => ({
      userIdentifier,
      userConfig: { max: 100, windowMs: 60_000, label: "q" },
      ipConfig: { max: 3, windowMs: 60_000, label: "q" },
    });
    for (let i = 0; i < 3; i++) {
      const r = await composedRateLimit(ipReq, cfg(`clin-${i}`));
      expect(r.ok).toBe(true);
    }
    const blocked = await composedRateLimit(ipReq, cfg("clin-99"));
    expect(blocked.ok).toBe(false);
  });

  it("skips the per-user bucket for anonymous callers", async () => {
    // No userIdentifier / userConfig → IP-only path (sample-encounter visitors).
    const cfg = { ipConfig: { max: 2, windowMs: 60_000, label: "q" } };
    expect((await composedRateLimit(reqFromIp("3.3.3.3"), cfg)).ok).toBe(true);
    expect((await composedRateLimit(reqFromIp("3.3.3.3"), cfg)).ok).toBe(true);
    expect((await composedRateLimit(reqFromIp("3.3.3.3"), cfg)).ok).toBe(false);
    // A different anon caller from another IP still has budget.
    expect((await composedRateLimit(reqFromIp("3.3.3.4"), cfg)).ok).toBe(true);
  });

  it("labels partition user vs IP buckets so a shared value doesn't collide", async () => {
    // Same string used as both userIdentifier and IP; different labels for
    // user vs IP means these two calls hit two different buckets, not one.
    const val = "shared-token";
    const cfg = {
      userIdentifier: val,
      userConfig: { max: 1, windowMs: 60_000, label: "q" },
      ipConfig: { max: 1, windowMs: 60_000, label: "q" },
    };
    const req = new Request("http://x", { headers: { "x-forwarded-for": val } });
    // First call passes (one hit in each bucket).
    expect((await composedRateLimit(req, cfg)).ok).toBe(true);
    // Second call blocked — user bucket already at limit.
    expect((await composedRateLimit(req, cfg)).ok).toBe(false);
  });
});

describe("adapter selection", () => {
  beforeEach(() => {
    _resetRateLimiter();
  });
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("uses in-memory when Upstash env is unset", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    // If Upstash were used with no env, we'd hit a network error. Passing
    // proves the in-memory path took over.
    const r = await rateLimit("k", { max: 1, windowMs: 60_000, label: "select" });
    expect(r.ok).toBe(true);
  });

  it("gracefully falls back to in-memory when Upstash rejects", async () => {
    // Stub global fetch so the Upstash client rejects fast — the adapter
    // must catch and fall through to the memory bucket instead of taking
    // the endpoint down.
    process.env.UPSTASH_REDIS_REST_URL = "https://stubbed-upstash.local";
    process.env.UPSTASH_REDIS_REST_TOKEN = "dummy";
    _resetRateLimiter();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchStub = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("upstash down"));
    try {
      const r = await rateLimit("k", { max: 1, windowMs: 60_000, label: "fallback" });
      expect(r.ok).toBe(true);
      // Second call, still stubbed: should now hit the in-memory bucket that
      // was seeded on the first fall-through and reject at the limit.
      const r2 = await rateLimit("k", { max: 1, windowMs: 60_000, label: "fallback" });
      expect(r2.ok).toBe(false);
    } finally {
      fetchStub.mockRestore();
      errSpy.mockRestore();
    }
  });
});
