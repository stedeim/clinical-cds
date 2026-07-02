# Pabaid — Architecture

Encounter-native, explainable clinical decision support (CDS) for independent
clinicians, designed to stay inside **FDA Non-Device CDS** boundaries and to be
deployable in a **HIPAA-compatible** environment.

> Status: runnable vertical slice. Runs with **zero keys** (deterministic stub
> mode), mirroring Wordhaven's stub pattern. Add keys to graduate each subsystem
> to real infrastructure.

---

## 1. High-level shape

```
Browser (clinician)
   │  encounterId + question + framework      ← never sends PHI from the client
   ▼
Next.js App Router
   ├─ Server Components ............ case list (/), case panel (/cases/[id])
   ├─ Client Components ............ QAPanel, CdsResponseView (presentation only)
   └─ Route Handler /api/query ..... PHI assembled + reasoned HERE, server-side
        │
        ├─ store.ts ............ data layer (in-memory stub │ Supabase+RLS later)
        ├─ cds/engine.ts ....... assemble case → build prompt → LLM/mock → VALIDATE
        │     ├─ cds/prompt.ts ..... system + user prompt (the guardrails)
        │     ├─ cds/schema.ts ..... zod contract (hard gate on output)
        │     ├─ cds/mock.ts ....... deterministic stub engine
        │     └─ guidelines.ts ..... framework abstraction (US / NICE / WHO)
        └─ audit.ts ............ append-only event trail (console │ Supabase later)
```

Data flow for one question:
1. Browser POSTs `{ encounterId, question, framework }` — **no PHI in the payload**.
2. Route handler loads the case server-side (`store.getCase`).
3. `runCdsQuery` assembles a **transient** case payload, builds the guarded
   prompt, calls the model (or mock), and **validates the response against the
   zod schema** before returning. Out-of-contract output is rejected, not shown.
4. An audit row is written. The validated structured JSON returns to the client,
   which only *renders* it.

---

## 2. Where the regulatory safety lives

| Requirement | Enforced by |
|---|---|
| Options, never commands | `cds/prompt.ts` system prompt + `cds/schema.ts` (no field exists to hold a directive) |
| No orders / prescriptions / EHR writes | No write-back code path exists; "Copy as note" produces a draft the clinician pastes |
| Independent review possible (explainability) | `dataPointsUsed`, `reasoningSummary`, `citations`, per-item `evidence` are **required** schema fields |
| Input limits (text + discrete data only) | Schema/types model only demographics, symptoms, single lab values, vitals, meds, allergies, problems — no image/waveform/stream fields anywhere |
| Verified clinicians only | `clinicians.verification_status` (DB) + auth gate seam in `/api/query` (`TODO(auth)`) |
| Scope + emergency escalation | System prompt instructs plain-language escalation for time-critical presentations |
| PHI isolation | Patient identity pseudonymized in `patients`; never copied into query/response rows; client never receives the case payload |
| Auditability | `audit_logs` (append-only by RLS) + `audit.recordAudit` on every query |

The output contract (`cds/schema.ts`) is the linchpin: even a misbehaving model
**cannot** emit a command, because the only shapes it can return are considerations,
differentials, workup *options*, and management *options* — each carrying its
evidence strength and supporting data.

---

## 3. Where the moats live

- **Moat 1 — Affordable / independent-first:** serverless Next.js + Supabase →
  near-zero idle cost, making $20–30/mo viable. No heavyweight always-on
  components. Stub mode keeps dev/demo cost at zero.
- **Moat 2 — Encounter-native Q&A:** `/cases/[id]` renders the case panel and
  the Q&A side by side; questions are always scoped to the patient. The same
  `/api/query` route is the **EHR plug-in seam** — a future integration POSTs a
  case + question and gets the identical JSON contract. "Copy as note" is the
  paste-into-EHR export.
- **Moat 3 — Transparent, education-aware reasoning:** every response ships a
  reasoning summary + teaching points + citations + uncertainty labels; the UI
  exposes a "Show reasoning" toggle and renders the exact data points used.
- **Moat 4 — Multi-jurisdiction guidelines:** `guidelines.ts` is a single
  data-driven extension point. Adding a jurisdiction is a config change; the
  prompt, sourcing, and citations adapt automatically.

---

## 4. Stack decision (deviation from the original brief)

The brief specified Python/FastAPI. This implementation uses **Next.js + TypeScript
+ Supabase + Anthropic SDK** instead, because it (a) matches the owner's existing
toolchain and reusable auth/billing patterns, (b) keeps idle cost near zero —
directly serving Moat 1, (c) keeps PHI server-side by default via Server
Components + route handlers, and (d) gets Postgres + Auth + **RLS** (a clean PHI
isolation primitive) and a BAA-able host from one provider. Swapping to FastAPI
later would only touch the engine/route layer; the schema, prompt, and contract
are framework-agnostic.

---

## 5. What is NOT built yet (next slices)

- Real Supabase auth + the verified-clinician gate (currently a `demo-clinician`
  stub) and the NPI/license verification stub calling a real registry.
- Supabase-backed `store.ts` and `audit.ts` implementations (seams are in place).
- Case **intake/edit form** writing to the DB (slice seeds one demo case).
- Billing (free vs Pro tiers), rate limiting, and the public REST API contract
  doc for EHR partners.
- Eval harness for the CDS prompt (red-team for directive leakage, scope breaches,
  citation hallucination).
