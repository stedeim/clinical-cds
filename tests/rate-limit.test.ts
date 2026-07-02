import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, clientIp, _resetRateLimiter } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    _resetRateLimiter();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit, then rejects with a retry hint", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("k", { limit: 5, windowMs: 60_000 }).ok).toBe(true);
    }
    const blocked = rateLimit("k", { limit: 5, windowMs: 60_000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < 6; i++) rateLimit("k", { limit: 5, windowMs: 60_000 });
    expect(rateLimit("k", { limit: 5, windowMs: 60_000 }).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit("k", { limit: 5, windowMs: 60_000 }).ok).toBe(true);
  });

  it("keys are independent — one client can't exhaust another's budget", () => {
    for (let i = 0; i < 6; i++) rateLimit("login:1.2.3.4", { limit: 5, windowMs: 60_000 });
    expect(rateLimit("login:1.2.3.4", { limit: 5, windowMs: 60_000 }).ok).toBe(false);
    expect(rateLimit("login:5.6.7.8", { limit: 5, windowMs: 60_000 }).ok).toBe(true);
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
