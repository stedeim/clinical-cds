import Anthropic from "@anthropic-ai/sdk";
import type { TranscriptSegment } from "../note/schema";
import { TranscriptSummary, type TranscriptSummaryT, type SummaryPointT } from "./schema";
import { SYSTEM_PROMPT, RESPONSE_FORMAT_HINT, buildUserPrompt } from "./prompt";

// The transcript-summary engine — the "cut the fluff" button.
//
// Mirrors note/engine.ts exactly: deterministic extractive mock with zero keys,
// model-backed when ANTHROPIC_API_KEY is set, hard Zod gate either way, and a
// fallback to the mock on any model/contract failure. The schema enforces the
// provenance rule: every point cites the segment(s) it came from, so the UI
// can always show "where did this come from?" — a summary is never a black box.

export async function summarizeTranscript(
  segments: TranscriptSegment[],
): Promise<TranscriptSummaryT> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return mockSummary(segments);
  }
  try {
    return await modelSummary(segments, apiKey);
  } catch {
    // A model failure must never break the encounter screen; the extractive
    // mock is always a valid, honest summary.
    return mockSummary(segments);
  }
}

async function modelSummary(
  segments: TranscriptSegment[],
  apiKey: string,
): Promise<TranscriptSummaryT> {
  const client = new Anthropic({ apiKey });
  const model = process.env.SUMMARY_MODEL ?? process.env.CDS_MODEL ?? "claude-opus-4-7";

  const message = await client.messages.create({
    model,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(segments) + "\n\n" + RESPONSE_FORMAT_HINT }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const raw = extractJson(text) as Record<string, unknown>;
  // The server stamps model/generatedAt so they can't be spoofed. Also drop any
  // cited segment id that doesn't exist in the input — a fabricated citation is
  // worse than no point at all.
  const validIds = new Set(segments.map((s) => s.id));
  const scrub = (points: unknown) =>
    Array.isArray(points)
      ? points.filter(
          (p) =>
            p &&
            typeof p === "object" &&
            Array.isArray((p as SummaryPointT).segmentIds) &&
            (p as SummaryPointT).segmentIds.every((id) => validIds.has(id)),
        )
      : [];

  const candidate = {
    keyPoints: scrub(raw.keyPoints),
    pertinentNegatives: scrub(raw.pertinentNegatives),
    patientConcerns: scrub(raw.patientConcerns),
    model,
    generatedAt: new Date().toISOString(),
  };

  const parsed = TranscriptSummary.safeParse(candidate);
  if (!parsed.success) {
    throw new SummaryContractError(parsed.error.message);
  }
  return parsed.data;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new SummaryContractError("no JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

// ---------------------------------------------------------------------------
// Deterministic extractive mock: keyword-driven signal detection. It never
// paraphrases — every point IS a transcript line (verbatim, trimmed), so the
// mock cannot hallucinate by construction. Lines with no clinical signal
// (greetings, scheduling, filler) are dropped — that's the fluff cut.
// ---------------------------------------------------------------------------

const NEGATION = /\b(no|denies|denied|never|without)\s+(fever|pain|blood|bleeding|swelling|trauma|nausea|vomiting|weight loss|hemoptysis|chest pain|shortness of breath|headache|dizziness|rash|chills)/i;
const CONCERN = /\b(worried|worry|worries|afraid|scared|anxious|concern|concerned|nervous|frighten)/i;
const SIGNAL =
  /\b(\d+\s*(?:day|week|month|year)s?|pain|ache|cough|fever|blood|pressure|breath|tight|dizz|swell|nause|vomit|headache|fatigue|tired|sleep|rash|weight|appetite|stairs|walk|worse|better|started|medication|pill|dose|mg|taking|side effect)/i;

const MAX_PER_BUCKET = 8;

export function mockSummary(segments: TranscriptSegment[]): TranscriptSummaryT {
  const keyPoints: SummaryPointT[] = [];
  const pertinentNegatives: SummaryPointT[] = [];
  const patientConcerns: SummaryPointT[] = [];
  const seen = new Set<string>();

  for (const seg of segments) {
    const text = seg.text.trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;

    const speaker = seg.speaker === "patient" ? "Patient" : seg.speaker === "clinician" ? "Clinician" : null;
    const point = (): SummaryPointT => ({
      text: speaker ? `${speaker}: ${text}` : text,
      segmentIds: [seg.id],
    });

    // Buckets are exclusive, most specific first. Everything else is fluff.
    if (CONCERN.test(text) && seg.speaker === "patient" && patientConcerns.length < MAX_PER_BUCKET) {
      patientConcerns.push(point());
    } else if (NEGATION.test(text) && pertinentNegatives.length < MAX_PER_BUCKET) {
      pertinentNegatives.push(point());
    } else if (SIGNAL.test(text) && keyPoints.length < MAX_PER_BUCKET) {
      keyPoints.push(point());
    } else {
      continue; // fluff — dropped, and not marked seen so an identical later line with context isn't blocked
    }
    seen.add(key);
  }

  const summary: TranscriptSummaryT = {
    keyPoints,
    pertinentNegatives,
    patientConcerns,
    model: "mock",
    generatedAt: new Date().toISOString(),
  };

  // Self-guard, same as every other engine: our own output must satisfy the
  // contract before it can reach the UI.
  const parsed = TranscriptSummary.safeParse(summary);
  if (!parsed.success) {
    throw new SummaryContractError(parsed.error.message);
  }
  return parsed.data;
}

export class SummaryContractError extends Error {
  constructor(detail: string) {
    super(`Transcript summary failed schema validation: ${detail}`);
    this.name = "SummaryContractError";
  }
}
