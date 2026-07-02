import Anthropic from "@anthropic-ai/sdk";

// Multi-provider LLM chain with automatic failover.
//
// Order (only providers with a key configured join the chain):
//   1. Anthropic        ANTHROPIC_API_KEY (+ _2.._5)      claude
//   2. OpenAI           OPENAI_API_KEY (+ _2.._5)         gpt
//   3. DeepSeek         DEEPSEEK_API_KEY (+ _2.._5)       deepseek-chat
//   4. OpenRouter       OPENROUTER_API_KEY (+ _2.._5)     any routed model
//   5. OpenRouter free  same key, a $0 ":free" model      last-resort model
// Beneath all of it, the engines' deterministic mock remains the final
// fallback — the app never errors out because every provider failed.
//
// Every provider except Anthropic speaks the OpenAI-compatible
// /chat/completions API, so no extra SDKs — plain fetch.
//
// Failover semantics:
//   • key-level/transient errors (401/403/429/5xx/network) → next key of the
//     same provider, then the next provider;
//   • 400 (bad request — usually a model-name/params mismatch specific to
//     that provider) → skip straight to the next provider;
//   • a sticky cursor remembers the last provider that worked.
//   • keys are never logged — failures name provider + key position only.
//
// ⚠ PHI note: only providers with a signed BAA may see real patient data.
// Anthropic offers BAAs; DeepSeek and OpenRouter free models do NOT — before
// production PHI, prune the chain to BAA-covered providers. Stated here so
// the redundancy chain can't silently become a compliance hole.

export interface LlmProvider {
  name: string; // e.g. "anthropic", "openai", "deepseek", "openrouter", "openrouter-free"
  kind: "anthropic" | "openai-compatible";
  baseUrl?: string; // openai-compatible only
  apiKeys: string[];
  model: string;
}

export interface CompletionArgs {
  system: string;
  user: string;
  maxTokens: number;
}

export interface CompletionResult {
  text: string;
  model: string; // "provider/model" — flows into the UI's model label honestly
}

function collectKeys(base: string): string[] {
  const keys: string[] = [];
  for (const name of [base, `${base}_2`, `${base}_3`, `${base}_4`, `${base}_5`]) {
    const v = process.env[name]?.trim();
    if (v && !keys.includes(v)) keys.push(v);
  }
  return keys;
}

export function getProviderChain(): LlmProvider[] {
  const chain: LlmProvider[] = [];

  const anthropicKeys = collectKeys("ANTHROPIC_API_KEY");
  if (anthropicKeys.length) {
    chain.push({
      name: "anthropic",
      kind: "anthropic",
      apiKeys: anthropicKeys,
      model: process.env.CDS_MODEL ?? "claude-opus-4-7",
    });
  }

  const openaiKeys = collectKeys("OPENAI_API_KEY");
  if (openaiKeys.length) {
    chain.push({
      name: "openai",
      kind: "openai-compatible",
      baseUrl: "https://api.openai.com/v1",
      apiKeys: openaiKeys,
      model: process.env.OPENAI_MODEL ?? "gpt-5.1",
    });
  }

  const deepseekKeys = collectKeys("DEEPSEEK_API_KEY");
  if (deepseekKeys.length) {
    chain.push({
      name: "deepseek",
      kind: "openai-compatible",
      baseUrl: "https://api.deepseek.com/v1",
      apiKeys: deepseekKeys,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    });
  }

  const openrouterKeys = collectKeys("OPENROUTER_API_KEY");
  if (openrouterKeys.length) {
    chain.push({
      name: "openrouter",
      kind: "openai-compatible",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeys: openrouterKeys,
      model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5",
    });
    // Last-resort $0 model through the same OpenRouter account. Free-tier
    // slugs rotate over time — override with OPENROUTER_FREE_MODEL if this
    // default is retired.
    chain.push({
      name: "openrouter-free",
      kind: "openai-compatible",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKeys: openrouterKeys,
      model: process.env.OPENROUTER_FREE_MODEL ?? "deepseek/deepseek-chat-v3.1:free",
    });
  }

  return chain;
}

export function anyProviderConfigured(): boolean {
  return getProviderChain().length > 0;
}

// ---------------------------------------------------------------------------
// Provider callers
// ---------------------------------------------------------------------------

async function callAnthropic(
  provider: LlmProvider,
  apiKey: string,
  args: CompletionArgs,
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: provider.model,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function callOpenAiCompatible(
  provider: LlmProvider,
  apiKey: string,
  args: CompletionArgs,
): Promise<string> {
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: args.maxTokens,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });
  if (!res.ok) {
    // Attach the HTTP status so failover can distinguish 400 from transient.
    throw Object.assign(new Error(`${provider.name} responded ${res.status}`), {
      status: res.status,
    });
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw Object.assign(new Error(`${provider.name} returned no content`), { status: 502 });
  }
  return text;
}

export type ProviderCaller = (
  provider: LlmProvider,
  apiKey: string,
  args: CompletionArgs,
) => Promise<string>;

function defaultCaller(provider: LlmProvider, apiKey: string, args: CompletionArgs): Promise<string> {
  return provider.kind === "anthropic"
    ? callAnthropic(provider, apiKey, args)
    : callOpenAiCompatible(provider, apiKey, args);
}

// ---------------------------------------------------------------------------
// Failover walk
// ---------------------------------------------------------------------------

let preferredProvider = 0;

export async function completeWithFailover(
  args: CompletionArgs,
  caller: ProviderCaller = defaultCaller,
): Promise<CompletionResult> {
  const chain = getProviderChain();
  if (chain.length === 0) throw new NoProviderError();
  if (preferredProvider >= chain.length) preferredProvider = 0;

  let lastError: unknown;
  for (let p = 0; p < chain.length; p++) {
    const index = (preferredProvider + p) % chain.length;
    const provider = chain[index];

    for (let k = 0; k < provider.apiKeys.length; k++) {
      try {
        const text = await caller(provider, provider.apiKeys[k], args);
        preferredProvider = index; // stick with what works
        return { text, model: `${provider.name}/${provider.model}` };
      } catch (err) {
        lastError = err;
        const status = (err as { status?: unknown })?.status;
        console.warn(
          `[llm] ${provider.name} key #${k + 1} failed (${typeof status === "number" ? status : "network"}); failing over.`,
        );
        // 400 = request/model mismatch for THIS provider — its other keys
        // would fail identically, so move to the next provider.
        if (status === 400) break;
      }
    }
  }
  throw lastError;
}

export class NoProviderError extends Error {
  constructor() {
    super("No LLM provider configured.");
    this.name = "NoProviderError";
  }
}

// Test-only: reset the sticky cursor.
export function _resetProviderCursor(): void {
  preferredProvider = 0;
}
