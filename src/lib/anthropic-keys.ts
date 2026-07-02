// Anthropic API key pool with automatic failover.
//
// Up to five keys via env: ANTHROPIC_API_KEY (primary) and
// ANTHROPIC_API_KEY_2 … ANTHROPIC_API_KEY_5. A model call tries the preferred
// key first and rotates to the next on key-level or transient failures
// (invalid key, rate limit, overload, network) — so one exhausted or revoked
// key never takes the feature down. The engines' existing mock fallback stays
// as the final safety net beneath this.
//
// A request-independent cursor remembers the last key that worked, so traffic
// doesn't repeatedly burn attempts on a dead primary. Keys never appear in
// logs or error messages — failures are reported by key POSITION only.

export function getApiKeys(): string[] {
  const names = [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_API_KEY_2",
    "ANTHROPIC_API_KEY_3",
    "ANTHROPIC_API_KEY_4",
    "ANTHROPIC_API_KEY_5",
  ];
  const keys: string[] = [];
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v && !keys.includes(v)) keys.push(v);
  }
  return keys;
}

// 400 = malformed request: identical for every key, retrying is pointless.
// Everything else (401 invalid key, 403 permission/billing, 429 rate limit,
// 5xx overload, undefined status = network) is worth the next key.
function isRetryableAcrossKeys(err: unknown): boolean {
  const status = (err as { status?: unknown })?.status;
  return status !== 400;
}

let preferredIndex = 0;

export async function withKeyFailover<T>(fn: (apiKey: string) => Promise<T>): Promise<T> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new NoApiKeyError();
  }
  if (preferredIndex >= keys.length) preferredIndex = 0;

  let lastError: unknown;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const index = (preferredIndex + attempt) % keys.length;
    try {
      const result = await fn(keys[index]);
      preferredIndex = index; // stick with what works
      return result;
    } catch (err) {
      lastError = err;
      if (!isRetryableAcrossKeys(err)) throw err;
      console.warn(`[anthropic-keys] key #${index + 1} failed; trying next of ${keys.length}.`);
    }
  }
  throw lastError;
}

export class NoApiKeyError extends Error {
  constructor() {
    super("No Anthropic API key configured.");
    this.name = "NoApiKeyError";
  }
}

// Test-only: reset the sticky cursor.
export function _resetKeyCursor(): void {
  preferredIndex = 0;
}
