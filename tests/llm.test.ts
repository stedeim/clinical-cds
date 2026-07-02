import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getProviderChain,
  completeWithFailover,
  NoProviderError,
  _resetProviderCursor,
  type LlmProvider,
} from "@/lib/llm";

// The multi-provider chain: Anthropic → OpenAI → DeepSeek → OpenRouter →
// OpenRouter free. Only configured providers join; failover walks keys within
// a provider, then the next provider; 400s skip the provider entirely; a
// sticky cursor remembers what worked. The injectable caller keeps these
// tests offline.

const ALL_KEY_VARS = [
  "ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY_2", "ANTHROPIC_API_KEY_3", "ANTHROPIC_API_KEY_4", "ANTHROPIC_API_KEY_5",
  "OPENAI_API_KEY", "OPENAI_API_KEY_2", "OPENAI_API_KEY_3", "OPENAI_API_KEY_4", "OPENAI_API_KEY_5",
  "DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY_2", "DEEPSEEK_API_KEY_3", "DEEPSEEK_API_KEY_4", "DEEPSEEK_API_KEY_5",
  "OPENROUTER_API_KEY", "OPENROUTER_API_KEY_2", "OPENROUTER_API_KEY_3", "OPENROUTER_API_KEY_4", "OPENROUTER_API_KEY_5",
];

function stubEnv(vars: Record<string, string>) {
  for (const name of ALL_KEY_VARS) vi.stubEnv(name, vars[name] ?? "");
}

function statusError(status: number): Error & { status: number } {
  return Object.assign(new Error(`http ${status}`), { status });
}

const ARGS = { system: "sys", user: "hello", maxTokens: 100 };

beforeEach(() => _resetProviderCursor());
afterEach(() => vi.unstubAllEnvs());

describe("getProviderChain", () => {
  it("builds the chain in priority order, only from configured providers", () => {
    stubEnv({ ANTHROPIC_API_KEY: "a1", DEEPSEEK_API_KEY: "d1", OPENROUTER_API_KEY: "or1" });
    const names = getProviderChain().map((p) => p.name);
    expect(names).toEqual(["anthropic", "deepseek", "openrouter", "openrouter-free"]);
  });

  it("openrouter adds the free last-resort model on the same key", () => {
    stubEnv({ OPENROUTER_API_KEY: "or1" });
    const chain = getProviderChain();
    expect(chain).toHaveLength(2);
    expect(chain[1].name).toBe("openrouter-free");
    expect(chain[1].model).toContain(":free");
    expect(chain[1].apiKeys).toEqual(["or1"]);
  });

  it("collects up to five keys per provider, skipping blanks/dupes", () => {
    stubEnv({ OPENAI_API_KEY: "k1", OPENAI_API_KEY_2: "", OPENAI_API_KEY_3: "k3", OPENAI_API_KEY_4: "k1" });
    expect(getProviderChain()[0].apiKeys).toEqual(["k1", "k3"]);
  });

  it("is empty with nothing configured", () => {
    stubEnv({});
    expect(getProviderChain()).toEqual([]);
  });
});

describe("completeWithFailover", () => {
  it("answers from the first provider when healthy, labeling provider/model", async () => {
    stubEnv({ ANTHROPIC_API_KEY: "a1", OPENAI_API_KEY: "o1" });
    const caller = vi.fn(async (p: LlmProvider) => `via:${p.name}`);
    const result = await completeWithFailover(ARGS, caller);
    expect(result.text).toBe("via:anthropic");
    expect(result.model).toMatch(/^anthropic\//);
    expect(caller).toHaveBeenCalledTimes(1);
  });

  it("walks keys within a provider, then falls to the next provider", async () => {
    stubEnv({ ANTHROPIC_API_KEY: "a1", ANTHROPIC_API_KEY_2: "a2", OPENAI_API_KEY: "o1" });
    const caller = vi.fn(async (p: LlmProvider, key: string) => {
      if (p.name === "anthropic") throw statusError(429); // both keys rate-limited
      return `via:${p.name}:${key}`;
    });
    const result = await completeWithFailover(ARGS, caller);
    expect(result.text).toBe("via:openai:o1");
    expect(caller).toHaveBeenCalledTimes(3); // a1, a2, o1
  });

  it("skips a provider's remaining keys on a 400 (model/request mismatch)", async () => {
    stubEnv({ ANTHROPIC_API_KEY: "a1", ANTHROPIC_API_KEY_2: "a2", DEEPSEEK_API_KEY: "d1" });
    const caller = vi.fn(async (p: LlmProvider) => {
      if (p.name === "anthropic") throw statusError(400);
      return "ok";
    });
    await completeWithFailover(ARGS, caller);
    expect(caller).toHaveBeenCalledTimes(2); // a1 (400 → skip a2), d1
  });

  it("remembers the working provider for the next call", async () => {
    stubEnv({ ANTHROPIC_API_KEY: "a1", OPENAI_API_KEY: "o1" });
    const failing = vi.fn(async (p: LlmProvider) => {
      if (p.name === "anthropic") throw statusError(529);
      return "ok";
    });
    await completeWithFailover(ARGS, failing);

    const healthy = vi.fn(async (p: LlmProvider) => `via:${p.name}`);
    const result = await completeWithFailover(ARGS, healthy);
    expect(result.text).toBe("via:openai");
    expect(healthy).toHaveBeenCalledTimes(1);
  });

  it("throws the last error when the whole chain fails", async () => {
    stubEnv({ ANTHROPIC_API_KEY: "a1", OPENROUTER_API_KEY: "or1" });
    const caller = vi.fn(async () => {
      throw statusError(503);
    });
    await expect(completeWithFailover(ARGS, caller)).rejects.toMatchObject({ status: 503 });
    expect(caller).toHaveBeenCalledTimes(3); // anthropic, openrouter, openrouter-free
  });

  it("throws NoProviderError with nothing configured", async () => {
    stubEnv({});
    await expect(completeWithFailover(ARGS)).rejects.toBeInstanceOf(NoProviderError);
  });
});
