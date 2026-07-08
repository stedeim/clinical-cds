import type { CaseContext } from "../types";
import {
  GeneratedNote,
  type GeneratedNote as GeneratedNoteT,
  type NoteSpan,
  type NoteSection,
  type TranscriptSegment,
} from "./schema";
import { SYSTEM_PROMPT, RESPONSE_FORMAT_HINT, buildUserPrompt } from "./prompt";
import { anyProviderConfigured, completeWithFailover } from "../llm";

// The note-generation engine.
//
// Mirrors cds/engine.ts: deterministic mock when there's nothing to reason over,
// model-backed when a key is configured, and a hard Zod gate on the output so an
// unattributed note can never reach the UI.
//
// TWO PATHS:
//  - No ANTHROPIC_API_KEY → the structured-only mock. Every span is `structured`,
//    carries a real `sourceRef`, confidence 1.0. No `spoken` (nothing captured),
//    no `inferred` (nothing guessed). Fully demoable with zero keys.
//  - Key present → the model drafts the note, allowed to add `inferred` narrative
//    glue (sourceRef null) and, when a transcript is supplied, `spoken` spans.
//    The output is validated against GeneratedNote before it can reach the UI; on
//    ANY failure we fall back to the mock rather than render an un-contracted note.
//
// In both paths the "exam left blank unless grounded" moat holds: the schema
// rejects a `spoken` span in the objective section, and the prompt forbids
// inventing exam findings, so an ungrounded exam stays empty.

export async function generateNote(args: {
  caseContext: CaseContext;
  transcript?: TranscriptSegment[];
}): Promise<GeneratedNoteT> {
  // Stub mode: no providers → the deterministic note. Structured chart lifts, plus
  // verbatim `spoken` spans for any transcript lines (an honest lift of provided
  // text, not a guess). No `inferred` glue — that needs the model.
  if (!anyProviderConfigured()) {
    return mockNote(args.caseContext, args.transcript);
  }

  try {
    return await modelNote(args);
  } catch {
    // Fail safe: a model/parse failure must never break the encounter screen.
    // The deterministic note is always a valid, honest note.
    return mockNote(args.caseContext, args.transcript);
  }
}

// Model-backed draft. Allowed to emit `inferred` glue and (with a transcript)
// `spoken` spans; the Zod gate + prompt keep the exam moat intact. Throws on any
// contract failure so the caller can fall back to the mock.
async function modelNote(args: {
  caseContext: CaseContext;
  transcript?: TranscriptSegment[];
}): Promise<GeneratedNoteT> {
  const userPrompt =
    buildUserPrompt({ caseContext: args.caseContext, transcript: args.transcript }) +
    "\n\n" +
    RESPONSE_FORMAT_HINT;

  // Provider chain: fail over across providers/keys before the mock fallback.
  // Contract retry mirrors cds/engine.ts: verbose models occasionally emit
  // truncated JSON; one fresh attempt recovers most of those.
  let text = "";
  let model = "";
  let raw: Record<string, unknown> | undefined;
  let lastContractError: NoteContractError | undefined;
  for (let attempt = 0; attempt < 2 && !raw; attempt++) {
    ({ text, model } = await completeWithFailover({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 4096,
    }));
    try {
      raw = extractJson(text) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof NoteContractError) {
        lastContractError = err;
        continue;
      }
      throw err;
    }
  }
  if (!raw) throw lastContractError ?? new NoteContractError("model output unusable after retry");

  // The model does not stamp model/generatedAt; the server owns those so they
  // can't be spoofed. Merge them onto the parsed shape before validation.
  const candidate = {
    ...raw,
    encounterId: args.caseContext.encounter.id,
    model,
    generatedAt: new Date().toISOString(),
  };

  const parsed = GeneratedNote.safeParse(candidate);
  if (!parsed.success) {
    throw new NoteContractError(parsed.error.message);
  }

  // "clinician" provenance is reserved for text the signed-in clinician typed
  // in the UI. A model claiming it is lying about authorship — downgrade such
  // spans to what they really are: unattributed model text, i.e. inferred.
  return {
    ...parsed.data,
    sections: parsed.data.sections.map((s) => ({
      ...s,
      spans: s.spans.map((span) =>
        span.provenance === "clinician" ? { ...span, provenance: "inferred" as const } : span,
      ),
    })),
  };
}

// Models may wrap JSON in prose or fences despite instructions; extract the
// first balanced JSON object defensively. Mirrors cds/engine.ts.
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new NoteContractError("no JSON object found in model output");
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (err) {
    throw new NoteContractError(err instanceof Error ? err.message : "unparseable model output");
  }
}

// Build the deterministic note from chart data (+ optional transcript).
export function mockNote(caseContext: CaseContext, transcript?: TranscriptSegment[]): GeneratedNoteT {
  const { encounter } = caseContext;

  const note: GeneratedNoteT = {
    encounterId: encounter.id,
    model: "mock",
    generatedAt: new Date().toISOString(),
    // A pasted transcript has no persisted id; the spans reference segment ids
    // directly. We still record that the note was transcript-grounded.
    transcriptId: transcript && transcript.length ? "pasted" : null,
    sections: [
      buildSubjective(encounter, transcript),
      buildObjective(encounter),
      buildAssessment(encounter),
      buildPlan(encounter),
    ],
  };

  // Self-guard: our own output must satisfy the provenance contract. A structured
  // span missing a sourceRef, or a spoken span in the exam, is a bug — reject it
  // rather than render an unattributed note.
  const parsed = GeneratedNote.safeParse(note);
  if (!parsed.success) {
    throw new NoteContractError(parsed.error.message);
  }
  return parsed.data;
}

// Every span the mock emits is a deterministic, verbatim lift from a chart field.
function structured(text: string, sourceRef: string): NoteSpan {
  return { text, provenance: "structured", sourceRef, confidence: 1 };
}

// A verbatim lift of a transcript line. Confidence 1.0 because it IS what the
// segment says — we're attributing provided text to its source, not inferring.
function spoken(text: string, sourceRef: string): NoteSpan {
  return { text, provenance: "spoken", sourceRef, confidence: 1 };
}

function buildSubjective(
  encounter: CaseContext["encounter"],
  transcript?: TranscriptSegment[],
): NoteSection {
  const spans: NoteSpan[] = [];
  if (encounter.chiefComplaint) {
    spans.push(structured(`Chief complaint: ${encounter.chiefComplaint}`, "encounter:chiefComplaint"));
  }
  if (encounter.hpi) {
    spans.push(structured(encounter.hpi, "encounter:hpi"));
  }
  // Transcript lines become `spoken` spans, grounded in their segment id. The
  // subjective section is the honest home for what was said in the room.
  transcript?.forEach((seg) => {
    const prefix = seg.speaker === "patient" ? "Patient: " : seg.speaker === "clinician" ? "Clinician: " : "";
    spans.push(spoken(`${prefix}${seg.text}`, seg.id));
  });
  return { heading: "subjective", spans };
}

function buildObjective(encounter: CaseContext["encounter"]): NoteSection {
  const spans: NoteSpan[] = [];
  // Vitals and labs are the only objective data we have. No exam findings are
  // fabricated — an empty section is truthful and the UI renders the
  // "exam left blank" affordance.
  encounter.vitals.forEach((v) => {
    const text = `${v.name} ${v.value}${v.unit ? " " + v.unit : ""}`.trim();
    spans.push(structured(text, `vital:${v.name}`));
  });
  encounter.labs.forEach((l) => {
    const value = l.value ?? l.valueText ?? "";
    const text = `${l.name} ${value}${l.unit ? " " + l.unit : ""}`.trim();
    spans.push(structured(text, `lab:${l.name}`));
  });
  return { heading: "objective", spans };
}

function buildAssessment(encounter: CaseContext["encounter"]): NoteSection {
  const spans: NoteSpan[] = encounter.problems.map((p, i) => {
    const text = `${i + 1}. ${p.label}${p.code ? ` (${p.code})` : ""}`;
    return structured(text, `problem:${i}`);
  });
  return { heading: "assessment", spans };
}

function buildPlan(encounter: CaseContext["encounter"]): NoteSection {
  const spans: NoteSpan[] = encounter.medications.map((m, i) => {
    const text = [m.name, m.dose, m.route, m.frequency].filter(Boolean).join(" ");
    return structured(text, `med:${i}`);
  });
  return { heading: "plan", spans };
}

export class NoteContractError extends Error {
  constructor(detail: string) {
    super(`Generated note failed schema validation: ${detail}`);
    this.name = "NoteContractError";
  }
}
