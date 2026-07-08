import type { CaseContext, GuidelineFramework } from "../types";
import { resolveFramework } from "../guidelines";
import { anyProviderConfigured, completeWithFailover } from "../llm";
import { CdsResponse } from "./schema";
import { SYSTEM_PROMPT, RESPONSE_FORMAT_HINT, buildUserPrompt } from "./prompt";
import { mockCdsResponse } from "./mock";

export interface CdsResult {
  response: CdsResponse;
  model: string; // model id, or 'mock'
}

// The Q&A engine: assemble the transient case payload, build the guarded prompt,
// call the model (or the deterministic mock), and validate the output against
// the schema before it can reach the UI. Schema validation is a hard gate — an
// unparseable or out-of-contract response is rejected, not rendered.
export async function runCdsQuery(args: {
  caseContext: CaseContext;
  question: string;
  frameworkPref?: GuidelineFramework;
}): Promise<CdsResult> {
  const framework = resolveFramework(args.frameworkPref);

  // Stub mode: no providers at all -> deterministic mock. Whole flow remains demoable.
  if (!anyProviderConfigured()) {
    return { response: mockCdsResponse({ ...args, framework }), model: "mock" };
  }

  const userPrompt =
    buildUserPrompt({ caseContext: args.caseContext, question: args.question, framework }) +
    "\n\n" +
    RESPONSE_FORMAT_HINT;

  // Provider chain: fails over across configured providers (and their key
  // pools) so a rate-limited key or a whole provider outage doesn't fail the
  // query. `model` reports which provider/model actually answered.
  //
  // Contract retry: verbose models occasionally emit truncated or malformed
  // JSON (the reason maxTokens is generous). One fresh attempt recovers most
  // of those; a second failure surfaces as CdsContractError → an honest
  // "please retry" to the clinician, never an out-of-contract render.
  let lastContractError: CdsContractError | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, model } = await completeWithFailover({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 4096,
    });

    try {
      const parsed = CdsResponse.safeParse(extractJson(text));
      if (!parsed.success) {
        throw new CdsContractError(parsed.error.message);
      }
      return { response: parsed.data, model };
    } catch (err) {
      if (err instanceof CdsContractError) {
        lastContractError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastContractError ?? new CdsContractError("model output unusable after retry");
}

export class CdsContractError extends Error {
  constructor(detail: string) {
    super(`CDS response failed schema validation: ${detail}`);
    this.name = "CdsContractError";
  }
}

// Models may wrap JSON in prose or fences despite instructions; extract the
// first balanced JSON object defensively.
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new CdsContractError("no JSON object found in model output");
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (err) {
    // Truncated/malformed JSON is a contract failure (retried above), not an
    // internal error.
    throw new CdsContractError(err instanceof Error ? err.message : "unparseable model output");
  }
}
