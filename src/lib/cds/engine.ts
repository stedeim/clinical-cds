import Anthropic from "@anthropic-ai/sdk";
import type { CaseContext, GuidelineFramework } from "../types";
import { resolveFramework } from "../guidelines";
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
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Stub mode: no key -> deterministic mock. Whole flow remains demoable.
  if (!apiKey) {
    return { response: mockCdsResponse({ ...args, framework }), model: "mock" };
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.CDS_MODEL ?? "claude-opus-4-7";

  const userPrompt =
    buildUserPrompt({ caseContext: args.caseContext, question: args.question, framework }) +
    "\n\n" +
    RESPONSE_FORMAT_HINT;

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = CdsResponse.safeParse(extractJson(text));
  if (!parsed.success) {
    // Fail safe: never render an out-of-contract response. Surface the failure.
    throw new CdsContractError(parsed.error.message);
  }

  return { response: parsed.data, model };
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
  return JSON.parse(candidate.slice(start, end + 1));
}
