# Pabaid — Spec: Note Generation + Provenance, and RxNorm Dose Check

Two backend capabilities that make the encounter screen's two remaining "promised
but not yet backed" affordances **truthful** instead of decorative:

1. **Note generation + provenance** — turns the visit-note card from a passive
   projection of chart data into a generated draft where every clause is tagged
   `spoken` vs `inferred`, so the amber "inferred" highlighting in
   `EncounterView` reflects real evidence rather than a hardcoded style.
2. **RxNorm dose check** — turns the "dose flag" from a fabricated banner
   (the mock's `lisinopril 200 mg exceeds max` — which is *wrong*; the seeded
   patient is on 10 mg) into a real, cited check against RxNorm/DailyMed
   reference doses.

Both follow the existing engine contract in `src/lib/cds/engine.ts`: **stub/mock
when no key is present, real service when configured, Zod-validated output as a
hard gate before anything reaches the UI.** Neither invents data — when evidence
is absent, the field is `null`/empty, not guessed. That is the product's core
moat (no hallucinated exam, no hallucinated dose) expressed as a service contract.

---

## Capability 1 — Note generation + provenance

### Problem it solves
`EncounterView` currently renders Subjective/Objective/Assessment/Plan directly
from `CaseRecord` fields. The synthesized design promised **spoken-vs-inferred
highlighting** — the differentiator that lets a clinician trust the note because
they can see what the patient actually said versus what the model filled in. Today
that highlight would be a lie: there is no transcript and no provenance, so any
amber text is cosmetic. This capability produces a real, attributable note.

### Data model (new types in `src/lib/types.ts`)

```ts
export type ProvenanceKind = "spoken" | "inferred" | "structured";

export interface NoteSpan {
  text: string;
  provenance: ProvenanceKind;
  // For "spoken": index into the transcript segment list that grounds this span.
  // For "structured": the chart field it was lifted from (e.g. "vital:BP").
  // For "inferred": null — nothing in the record grounds it; clinician must confirm.
  sourceRef: string | null;
  confidence: number; // 0..1; 1.0 for structured lifts, model-scored otherwise
}

export interface NoteSection {
  heading: "subjective" | "objective" | "assessment" | "plan";
  spans: NoteSpan[];
}

export interface GeneratedNote {
  encounterId: string;
  sections: NoteSection[];
  model: string;              // model id, or "mock"
  generatedAt: string;        // ISO
  transcriptId: string | null; // null until ambient scribe exists
}
```

Rules the schema enforces (Zod, mirroring `cds/schema.ts`):
- Every `NoteSpan` MUST carry a `provenance` and a `sourceRef` consistent with it:
  `structured` and `spoken` require a non-null `sourceRef`; `inferred` requires
  `sourceRef === null`. This is what makes the highlight honest — an `inferred`
  span *cannot* claim a source.
- `objective` spans may only be `structured` (lifted from vitals/labs) OR
  `inferred`. A model may never emit a `spoken` exam finding, because the exam is
  never dictated in this scope — this preserves the "exam left blank" moat at the
  schema level.

### Service: `src/lib/note/engine.ts`

Mirror `runCdsQuery` exactly:

```ts
export async function generateNote(args: {
  caseContext: CaseContext;
  transcript?: TranscriptSegment[]; // absent today → structured-only note
}): Promise<GeneratedNote>;
```

- **No `ANTHROPIC_API_KEY`** → `mockNote(caseContext)`: deterministic. It emits a
  note built *only* from structured chart data — every span is `provenance:
  "structured"` with a real `sourceRef`, zero `inferred`, zero `spoken`. This is
  already truthful today and is exactly what `EncounterView` can render now.
- **Key present + no transcript** → same as mock but model may add `inferred`
  spans (e.g. summarizing HPI prose), each scored and `sourceRef: null`.
- **Key present + transcript** → full spoken/inferred/structured attribution.
  Requires the ambient scribe (out of scope here; the `transcript` param is the
  seam it will plug into).
- Output runs through `GeneratedNote` Zod parse; a failed parse throws
  `NoteContractError` (never render an unattributed note), same fail-safe posture
  as `CdsContractError`.

### UI change (`EncounterView`)
Replace the hand-built Subjective/Objective/Assessment/Plan blocks with a render
over `GeneratedNote.sections`. Highlight rule becomes real:
`provenance === "inferred"` → amber pill + "confirm" affordance;
`spoken` → plain; `structured` → mono for values. The "coming soon" transcript
stub stays until the scribe lands, but the note itself is now generated and
attributed the moment a key is present.

---

## Capability 2 — RxNorm dose check

### Problem it solves
The mock shows a red "dose exceeds max" flag. Against the seeded record
(Lisinopril **10 mg** daily) that specific flag is factually wrong, and more
importantly it is not computed from anything. This capability computes dose
sanity against a real reference and cites it, or says nothing.

### Reference source
- **RxNorm** (NLM) to normalize a free-text `Medication.name` + `dose` into an
  RxCUI and ingredient. Public REST API, no key: `rxnav.nlm.nih.gov`.
- **DailyMed / reference max maintenance dose** per ingredient for the ceiling.
  Because a live, complete max-dose table is not free-form queryable, ship a
  **curated `doseRules` table** for the common primary-care formulary (ACE-i,
  ARBs, statins, metformin, SSRIs, etc.) with each ceiling carrying a citation.
  Unknown drug → `status: "unknown"`, never a guess.

### Data model

```ts
export interface DoseFinding {
  medication: string;        // echoes Medication.name
  rxcui: string | null;      // null if RxNorm couldn't resolve it
  ingredient: string | null;
  parsedDoseMg: number | null;
  ceilingMg: number | null;  // from doseRules
  status: "ok" | "exceeds" | "below_threshold" | "unparseable" | "unknown";
  message: string;           // clinician-facing, option-framed, never imperative
  citation: { title: string; source: string; url?: string } | null;
}
```

### Service: `src/lib/dosecheck/engine.ts`

```ts
export async function checkDoses(
  meds: Medication[],
): Promise<DoseFinding[]>;
```

- Pure over the encounter's `medications` — no PHI beyond drug + dose leaves the
  process (RxNorm gets only the drug string, consistent with the "PHI never
  round-trips" posture of `/api/query`).
- **No network / offline** → resolve against the local `doseRules` table only;
  meds not in the table return `status: "unknown"` (honest), not a flag.
- Dose parsing reuses the numeric-extraction approach already in
  `parseVitals`/`parseLabs` (`case-intake.ts`) rather than a new parser.
- Every non-`ok` finding MUST carry a `citation`. A flag without a source is a
  contract violation — same principle as the CDS `citations` requirement. This is
  what keeps it inside FDA Non-Device CDS framing: it's a cited *consideration*
  ("this exceeds the reference maintenance dose of X — consider confirming"),
  never a command.

### UI change (`EncounterView`)
In the Plan section, a `DoseFinding` with `status: "exceeds" | "below_threshold"`
renders as a caution chip next to that medication line with the citation on hover.
`ok` and `unknown` render nothing — silence beats a false alarm. Against the
seeded Lisinopril 10 mg the result is `ok` → **no banner**, which is the correct,
truthful behavior and the direct fix for the wrong mock flag.

---

## Build order
1. Types + Zod schemas for both (`types.ts`, `note/schema.ts`, `dosecheck/schema.ts`).
2. `dosecheck/engine.ts` + curated `doseRules` — smallest, fully testable offline,
   removes the one actively-wrong element on screen first.
3. `note/engine.ts` with mock (structured-only) path — makes the note truthful
   with zero keys.
4. Wire both into `EncounterView`, replacing hardcoded blocks/flags.
5. Model-backed paths (inferred spans, live RxNorm resolve) behind the existing
   key check.
6. Transcript seam (`transcript?` param) — deferred to the ambient scribe.

## Non-goals
- Ambient capture / ASR / diarization (separate capability; this only defines the
  `transcript` seam it will feed).
- Full drug-interaction checking (dose ceiling only, for now).
- Any write-back to an EHR.
