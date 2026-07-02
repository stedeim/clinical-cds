import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getApiKeys, withKeyFailover, NoApiKeyError, _resetKeyCursor } from "@/lib/anthropic-keys";

// The key pool: up to five keys, failover on key-level/transient errors, a
// sticky cursor so traffic doesn't keep burning a dead primary, and a hard
// stop on non-retryable request errors (identical for every key).

function stubKeys(...keys: (string | undefined)[]) {
  const names = [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_API_KEY_2",
    "ANTHROPIC_API_KEY_3",
    "ANTHROPIC_API_KEY_4",
    "ANTHROPIC_API_KEY_5",
  ];
  names.forEach((name, i) => vi.stubEnv(name, keys[i] ?? ""));
}

function statusError(status: number): Error & { status: number } {
  return Object.assign(new Error(`http ${status}`), { status });
}

beforeEach(() => _resetKeyCursor());
afterEach(() => vi.unstubAllEnvs());

describe("getApiKeys", () => {
  it("collects configured keys in order, skipping blanks and duplicates", () => {
    stubKeys("key-1", "", "key-3", "key-1", "key-5");
    expect(getApiKeys()).toEqual(["key-1", "key-3", "key-5"]);
  });

  it("returns empty with nothing configured", () => {
    stubKeys();
    expect(getApiKeys()).toEqual([]);
  });
});

describe("withKeyFailover", () => {
  it("uses the first key when it works", async () => {
    stubKeys("key-1", "key-2");
    const fn = vi.fn(async (k: string) => `ok:${k}`);
    await expect(withKeyFailover(fn)).resolves.toBe("ok:key-1");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fails over on a rate limit and remembers the working key", async () => {
    stubKeys("key-1", "key-2");
    const fn = vi.fn(async (k: string) => {
      if (k === "key-1") throw statusError(429);
      return `ok:${k}`;
    });
    await expect(withKeyFailover(fn)).resolves.toBe("ok:key-2");

    // Next call starts at key-2 directly — the dead primary isn't re-burned.
    const fn2 = vi.fn(async (k: string) => `ok:${k}`);
    await expect(withKeyFailover(fn2)).resolves.toBe("ok:key-2");
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledWith("key-2");
  });

  it("fails over on invalid-key and network errors too", async () => {
    stubKeys("key-1", "key-2", "key-3");
    const fn = vi.fn(async (k: string) => {
      if (k === "key-1") throw statusError(401);
      if (k === "key-2") throw new Error("fetch failed"); // no status = network
      return "ok";
    });
    await expect(withKeyFailover(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does NOT rotate on a 400 — a malformed request fails the same everywhere", async () => {
    stubKeys("key-1", "key-2");
    const fn = vi.fn(async () => {
      throw statusError(400);
    });
    await expect(withKeyFailover(fn)).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws the last error when every key fails", async () => {
    stubKeys("key-1", "key-2");
    const fn = vi.fn(async (k: string) => {
      throw statusError(k === "key-1" ? 429 : 529);
    });
    await expect(withKeyFailover(fn)).rejects.toMatchObject({ status: 529 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws NoApiKeyError with no keys configured", async () => {
    stubKeys();
    await expect(withKeyFailover(async () => "x")).rejects.toBeInstanceOf(NoApiKeyError);
  });
});
