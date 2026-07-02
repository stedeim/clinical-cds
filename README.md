# Pabaid

> Encounter-native, explainable clinical decision support for independent clinicians.

Pabaid helps **licensed clinicians** ask natural-language questions about their
own patients' cases and get **structured, explainable** decision support — options
and considerations, never commands. It is designed to stay inside **FDA Non-Device
CDS** boundaries and to be deployable in a **HIPAA-compatible** environment.

**Working name** — easy to rename (`package.json` `name`, header in `src/app/layout.tsx`).

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000  — runs with NO keys (stub mode)
```

Open the seeded demo case and ask a question. With no `ANTHROPIC_API_KEY`, the
deterministic mock engine returns a structurally complete response so the whole
flow is demoable. Add keys (see `.env.local.example`) to go live.

```bash
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

## What's here (vertical slice)

- **Case list** (`/`) and **encounter-native case view** (`/cases/[id]`) — case
  panel + Q&A side by side.
- **Q&A engine** — assembles the case server-side, builds a guarded prompt, calls
  the LLM (or mock), and **validates output against a strict schema** before render.
- **Structured output** — summary, differentials (likely / can't-miss), workup,
  management (pros/cons), expandable reasoning + teaching, sources, uncertainty
  labels, evidence-strength tags, and "Copy as note".
- **DB schema + RLS** (`supabase/migrations/0001_init.sql`) — PHI-isolating,
  owner-scoped, append-only audit trail.
- **CDS prompt template** (`src/lib/cds/prompt.ts`) — the regulatory core.
- **Guideline abstraction** (`src/lib/guidelines.ts`) — US / NICE / WHO.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how each part maps to the regulatory
goals and the four competitive moats, the stack rationale, and the next slices.

## Important

This is decision **support**, not diagnosis. It places no orders, writes no
prescriptions, and makes no EHR changes. Every response is framed as considerations
to inform — not replace — clinician judgment.
