import { QAPanel } from "@/components/QAPanel";
import { NoteCard } from "@/components/encounter/NoteCard";
import type { CaseRecord, Problem, Medication, Allergy, Vital, Lab } from "@/lib/types";
import { generateNote } from "@/lib/note/engine";
import { checkDoses } from "@/lib/dosecheck/engine";
import { surfaceCheatSheets } from "@/lib/cheatsheet/engine";
import type { CheatSheet } from "@/lib/cheatsheet/library";
import { surfaceRegionalPatterns } from "@/lib/regional/engine";
import type { RegionalPattern } from "@/lib/regional/library";
import { checkBoxedWarnings } from "@/lib/fda/boxed-warnings";
import type { BoxedWarningResult } from "@/lib/fda/boxed-warnings";
import { getHandouts } from "@/lib/medlineplus/handouts";
import type { Handout } from "@/lib/medlineplus/handouts";
import { checkAllergies, type AllergyWithSource } from "@/lib/allergy/engine";
import { getPatientHistory } from "@/lib/store";
import { listDocuments } from "@/lib/history/store";
import { scanDocumentsForAllergies } from "@/lib/history/allergy-scan";
import { reconcileMedications, vitalsTrends } from "@/lib/continuity/reconcile";
import { HistoryDocs } from "@/components/encounter/HistoryDocs";
import { AllergySuggestions } from "@/components/encounter/AllergySuggestions";
import { getCurrentClinician, currentUserIdFromCookies } from "@/lib/clinician";
import { detectFramework } from "@/lib/geo";
import { suggestFollowUps } from "@/lib/followup/suggest";
import { listFollowUps } from "@/lib/followup/store";
import { FollowUpCard } from "@/components/encounter/FollowUpCard";
import { headers } from "next/headers";

// Encounter screen — the synthesized "best of three" direction graduated onto
// real case data (see /design/best for the standalone mock and its rationale).
//
// HONEST DATA MAPPING. Two moats that were mock-only are now backed by real
// services, and nothing here is fabricated:
//   • The visit note is produced by generateNote() — every clause is a span
//     tagged with provenance. Today (no ambient transcript) every span is
//     `structured` (a verbatim chart lift), so nothing highlights. The moment a
//     transcript grounds `spoken`/`inferred` spans, the amber highlight below
//     becomes true automatically — no UI change needed.
//   • The Plan dose flag is produced by checkDoses() against a cited reference
//     ceiling. It renders a caution chip ONLY when a dose actually exceeds the
//     reference — silent otherwise (the seeded Lisinopril 10 mg is fine → no
//     chip), which is the direct fix for the old fabricated flag.
//   • Objective still leaves the physical exam blank rather than templating it.
//   • Left rail ← the real chart; transcript is a labeled "coming soon" stub.
//   • Right col ← the real, working Q&A engine (<QAPanel>).
//
// Visual language: Newsreader serif for headings, IBM Plex Mono for hard data,
// one accent = the app's clinical teal (#0e7490), rounded white cards on a calm
// canvas. Amber (caution) is reserved for inferred text and dose cautions.

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const T = {
  canvas: "#EDF0EF",
  ink: "#0f2b31",
  body: "#33454a",
  muted: "#7c9096",
  faint: "#a9bbc0",
  line: "#E4E9E8",
  panelBg: "#F6F8F7",
  card: "#ffffff",
  accent: "#0e7490",
  accentInk: "#0b5e73",
  accentBg: "#e2f0f2",
  accentBg2: "#eef6f7",
  accentLine: "#c9e2e6",
  // caution / inferred (amber)
  amberInk: "#92400e",
  amberBg: "#fef3c7",
  amberLine: "#fcd34d",
  serif: "'Newsreader',ui-serif,Georgia,serif",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
};

function sexInitial(sex?: string): string {
  return sex === "female" ? "F" : sex === "male" ? "M" : sex === "intersex" ? "I" : "";
}

// Regional prescribing-pattern card. Descriptive, cited, rank-based peer data
// from PUBLIC datasets (CMS Part D, OpenPrescribing, PBS/CIHI) — what peers
// commonly prescribe in this region, never what to prescribe. Percentages
// arrive only when Pabaid's own opt-in network accumulates real data.
function RegionalPatternCard({ pattern }: { pattern: RegionalPattern }) {
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "17px 18px", boxShadow: "0 6px 22px -14px rgba(15,43,49,.32)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, font: `700 10px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.accent, marginBottom: 11 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${T.accent}` }} />
        Regional patterns · {pattern.regionLabel}
      </div>
      <div style={{ font: `600 16px/1.3 ${T.serif}`, color: T.ink, marginBottom: 9 }}>
        {pattern.conditionLabel} — what peers commonly prescribe
      </div>
      <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, lineHeight: 1.65, color: T.body }}>
        {pattern.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ font: `600 10px ${T.mono}`, color: T.accentInk, background: T.accentBg, borderRadius: 4, padding: "3px 8px" }}>
          {pattern.source}
        </span>
        <span style={{ font: `400 10px ${T.mono}`, color: T.faint, marginLeft: "auto" }}>descriptive — not a recommendation</span>
      </div>
    </div>
  );
}

// Auto-surfaced guideline card (Moat 4's unprompted half). Content comes from
// the curated, cited library — never generated. Rendered only when a chart
// problem actually matches a library topic; silence otherwise.
function CheatSheetCard({ sheet }: { sheet: CheatSheet }) {
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "17px 18px", boxShadow: "0 6px 22px -14px rgba(15,43,49,.32)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, font: `700 10px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.accent, marginBottom: 11 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent }} />
        Auto-surfaced · {sheet.topic}
      </div>
      <div style={{ font: `600 16px/1.3 ${T.serif}`, color: T.ink, marginBottom: 9 }}>{sheet.title}</div>
      <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, lineHeight: 1.65, color: T.body }}>
        {sheet.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {sheet.sources.map((s) => (
          <span key={s} style={{ font: `600 10px ${T.mono}`, color: T.accentInk, background: T.accentBg, borderRadius: 4, padding: "3px 8px" }}>
            {s}
          </span>
        ))}
        <span style={{ font: `400 10px ${T.mono}`, color: T.faint, marginLeft: "auto" }}>cited from library</span>
      </div>
    </div>
  );
}

// Patient handouts card — vetted NIH education pages matched to the chart's
// ICD-10 codes via MedlinePlus Connect. Something to hand the patient, not
// clinical guidance; pairs naturally with follow-up reminders.
function HandoutsCard({ handouts }: { handouts: Handout[] }) {
  if (handouts.length === 0) return null;
  return (
    <div style={{ background: T.card, borderRadius: 16, padding: "15px 18px", boxShadow: "0 6px 22px -14px rgba(15,43,49,.32)" }}>
      <div style={{ font: `700 10px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.accent, marginBottom: 9 }}>
        Patient handouts
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {handouts.map((h) => (
          <a
            key={h.code}
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12.5, lineHeight: 1.5, color: T.accentInk, textDecoration: "none" }}
          >
            <span style={{ textDecoration: "underline" }}>{h.title}</span> ↗
            <span style={{ color: T.faint, marginLeft: 6, fontSize: 11 }}>for {h.problemLabel}</span>
          </a>
        ))}
      </div>
      <div style={{ marginTop: 9, font: `400 10px ${T.mono}`, color: T.faint }}>MedlinePlus · NIH — printable patient education</div>
    </div>
  );
}

// Medications rail with FDA boxed-warning badges. Honesty rule: the ⬛ badge
// appears ONLY on a confirmed boxed warning from the label (openFDA); a drug
// we couldn't check shows nothing — absence of the badge is never a claim of
// safety. Hover shows the label text, cited.
function MedicationsRail({
  medications,
  warnings,
}: {
  medications: Medication[];
  warnings: (BoxedWarningResult | null)[];
}) {
  return (
    <div>
      <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 7 }}>Medications</div>
      {medications.length === 0 ? (
        <div style={{ fontSize: 12, color: T.faint }}>None on file</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {medications.map((m, i) => {
            const warning = warnings[i];
            const flagged = warning?.hasBoxedWarning === true;
            return (
              <span
                key={i}
                title={flagged ? `FDA BOXED WARNING (from the drug label, via openFDA):\n${warning?.summary ?? ""}` : undefined}
                style={{
                  fontSize: 11.5,
                  lineHeight: 1.35,
                  color: T.body,
                  background: "#fff",
                  border: `1px solid ${flagged ? "#1f2937" : T.line}`,
                  borderRadius: 6,
                  padding: "3px 8px",
                  cursor: flagged ? "help" : undefined,
                }}
              >
                {[m.name, m.dose].filter(Boolean).join(" ")}
                {flagged && (
                  <span style={{ font: `700 9px/1 ${T.sans}`, color: "#fff", background: "#1f2937", borderRadius: 3, padding: "2px 5px", marginLeft: 6, letterSpacing: ".04em" }}>
                    ⬛ BOXED
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RailSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 7 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: T.faint }}>{empty}</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {items.map((it, i) => (
            <span key={i} style={{ fontSize: 11.5, lineHeight: 1.35, color: T.body, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 6, padding: "3px 8px" }}>
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export async function EncounterView({ record }: { record: CaseRecord }) {
  const { patient, encounter } = record;

  // Real services: a provenance-tagged note and a cited dose check. The note is
  // rendered by the <NoteCard> client island, which can re-ground it against a
  // pasted transcript (grounding `spoken` spans) without a page reload.
  const note = await generateNote({ caseContext: record });
  const doseFindings = await checkDoses(encounter.medications);
  const cheatSheets = surfaceCheatSheets(encounter.problems);
  // FDA boxed warnings per medication (cached 24h; failures degrade to "no
  // claim", never to "no warning").
  const boxedWarnings = await checkBoxedWarnings(encounter.medications);
  // Patient education pages for the chart's coded problems (cached 24h).
  const handouts = await getHandouts(encounter.problems);

  // Patient continuity: prior visits (matched by external ref), the allergy
  // history they carry, and any uploaded history documents. Allergies from
  // past visits join this visit's in the conflict check, each tagged with
  // where the record came from.
  const history = await getPatientHistory(patient.id, encounter.id);
  const allAllergies: AllergyWithSource[] = [
    ...encounter.allergies.map((a) => ({ ...a, source: "this visit" })),
    ...history.flatMap((h) =>
      h.encounter.allergies.map((a) => ({ ...a, source: `visit of ${h.encounter.occurredAt.slice(0, 10)}` })),
    ),
  ];
  const allergyFindings = checkAllergies(encounter.medications, allAllergies);

  // The signature must be honest: it carries the real signed-in clinician's name
  // and credential, not a hardcoded placeholder. In stub mode this is the demo
  // clinician; with Supabase it's the verified account row.
  const clinician = await getCurrentClinician(await currentUserIdFromCookies());

  // Uploaded history documents for this patient (stub store until Supabase).
  const historyDocs = listDocuments(patient.id, clinician?.id ?? "demo-clinician").map((d) => ({
    id: d.id,
    filename: d.filename,
    format: d.format,
    ocr: d.ocr,
    uploadedAt: d.uploadedAt,
    text: d.text,
  }));

  // Document scan: possible allergies mentioned in uploaded records that
  // aren't on the record yet. Suggestions only — the clinician confirms.
  const allergySuggestions = scanDocumentsForAllergies(
    historyDocs,
    allAllergies.map((a) => ({ substance: a.substance })),
  );

  // Visit-to-visit continuity: what changed since the last visit, and
  // numeric vitals trends across all known visits.
  const lastVisit = history[0];
  const reconciliation = lastVisit
    ? reconcileMedications(encounter.medications, lastVisit.encounter.medications)
    : null;
  const trends = vitalsTrends(
    [{ date: encounter.occurredAt, vitals: encounter.vitals }, ...history.map((h) => ({ date: h.encounter.occurredAt, vitals: h.encounter.vitals }))],
  );

  // Geo-detected default guideline framework (edge country header, then
  // Accept-Language). Only the select's initial value — manual override stays.
  const defaultFramework = detectFramework(await headers());

  // Regional prescribing patterns for the detected region + chart problems —
  // cited public-dataset facts (see regional/library.ts); absent regions stay silent.
  const regionalPatterns = surfaceRegionalPatterns(encounter.problems, defaultFramework);

  // Follow-up suggestions come from the visit's own text (deterministic parser
  // over the note spans + HPI — no LLM); the clinician confirms, edits, and
  // picks recipients before anything is created.
  const noteText = note.sections.flatMap((s) => s.spans.map((sp) => sp.text));
  const followUpSuggestions = suggestFollowUps([...(encounter.hpi ? [encounter.hpi] : []), ...noteText]);
  const followUps = clinician ? listFollowUps(encounter.id, clinician.id) : [];

  return (
    <div
      style={{
        // Full-bleed: escape the app's max-w-5xl <main> for the 3-column layout.
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        minHeight: "100vh",
        background: "#E4E8E7",
        padding: "28px 30px 80px",
        fontFamily: T.sans,
      }}
    >
      <link rel="stylesheet" href={FONTS_HREF} />

      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, font: `600 20px/1 ${T.serif}`, color: T.ink, textDecoration: "none" }}>
            <span style={{ width: 17, height: 17, borderRadius: "50%", background: `conic-gradient(${T.accent} 0 50%,${T.ink} 0 100%)`, display: "inline-block" }} />
            Pabaid
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 13px", background: T.card, borderRadius: 22, fontSize: 13, color: T.body, boxShadow: "0 2px 8px -5px rgba(15,43,49,.35)" }}>
            <b style={{ color: T.ink }}>
              {patient.ageYears ?? "—"}
              {sexInitial(patient.sex)} patient
            </b>
            {encounter.chiefComplaint && (
              <>
                <span style={{ color: T.faint }}>·</span>
                <span>{encounter.chiefComplaint}</span>
              </>
            )}
          </div>
          {patient.externalRef && (
            <span style={{ font: `500 11px/1 ${T.mono}`, color: T.muted }}>{patient.externalRef}</span>
          )}
          <div style={{ flex: 1 }} />
          {/* Honest state: ambient capture isn't built — no fake live timer. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 22, font: `600 11.5px/1 ${T.sans}`, color: T.muted }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.faint, display: "inline-block" }} />
            Ambient scribe · soon
          </div>
        </div>

        {/* body — 3 columns: chart rail · note · Q&A */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1.4fr 1fr", gap: 16, alignItems: "start" }}>
          {/* chart rail (real data) */}
          <aside style={{ background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 16, padding: "16px 15px", display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ font: `700 10px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.accent }}>Chart</div>
            <RailSection title="Problems" items={encounter.problems.map((p: Problem) => [p.label, p.code].filter(Boolean).join(" · "))} empty="None listed" />
            <MedicationsRail medications={encounter.medications} warnings={boxedWarnings} />
            <RailSection
              title="Allergies"
              items={[
                ...encounter.allergies.map((a: Allergy) => a.substance),
                // Allergies known from prior visits, tagged with their source —
                // history the conflict check already accounts for.
                ...allAllergies
                  .filter((a) => a.source !== "this visit")
                  .filter((a, i, arr) => arr.findIndex((x) => x.substance === a.substance) === i)
                  .filter((a) => !encounter.allergies.some((cur) => cur.substance.toLowerCase() === a.substance.toLowerCase()))
                  .map((a) => `${a.substance} (${a.source})`),
              ]}
              empty="NKDA"
            />
            <RailSection title="Vitals" items={encounter.vitals.map((v: Vital) => `${v.name} ${v.value}`)} empty="None recorded" />
            <RailSection title="Labs" items={encounter.labs.map((l: Lab) => `${l.name} ${l.value ?? l.valueText ?? ""}`.trim())} empty="None recorded" />

            {/* Document-scan allergy suggestions: proposed from uploaded
                records with the source sentence; the clinician confirms. */}
            <AllergySuggestions encounterId={encounter.id} suggestions={allergySuggestions} />

            {/* Since last visit: medication reconciliation. */}
            {reconciliation &&
              (reconciliation.started.length > 0 || reconciliation.stopped.length > 0 || reconciliation.changed.length > 0) && (
                <div style={{ marginTop: 4, paddingTop: 13, borderTop: `1px dashed ${T.line}` }}>
                  <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>
                    Since last visit
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, lineHeight: 1.45, color: T.body }}>
                    {reconciliation.started.map((m, i) => (
                      <div key={`s${i}`}>
                        <span style={{ font: `700 9px/1 ${T.mono}`, color: "#166534", background: "#dcfce7", borderRadius: 3, padding: "2px 5px", marginRight: 6 }}>STARTED</span>
                        {[m.name, m.dose].filter(Boolean).join(" ")}
                      </div>
                    ))}
                    {reconciliation.stopped.map((m, i) => (
                      <div key={`x${i}`}>
                        <span style={{ font: `700 9px/1 ${T.mono}`, color: "#8f2e24", background: "#fbedea", borderRadius: 3, padding: "2px 5px", marginRight: 6 }}>STOPPED</span>
                        {[m.name, m.dose].filter(Boolean).join(" ")}
                      </div>
                    ))}
                    {reconciliation.changed.map((c, i) => (
                      <div key={`c${i}`}>
                        <span style={{ font: `700 9px/1 ${T.mono}`, color: "#92400e", background: "#fef3c7", borderRadius: 3, padding: "2px 5px", marginRight: 6 }}>CHANGED</span>
                        {c.name}: {c.from} → {c.to}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Vitals trends across visits (numeric series with ≥2 points). */}
            {trends.length > 0 && (
              <div style={{ marginTop: 4, paddingTop: 13, borderTop: `1px dashed ${T.line}` }}>
                <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>
                  Trends
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {trends.map((t) => {
                    const values = t.points.map((p) => p.value);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const range = max - min || 1;
                    const w = 72;
                    const h = 18;
                    const step = values.length > 1 ? w / (values.length - 1) : w;
                    const path = values
                      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
                      .join(" ");
                    const rising = values[values.length - 1] > values[0];
                    return (
                      <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                        <span style={{ color: T.muted, width: 92, flexShrink: 0 }}>{t.name}</span>
                        <svg width={w} height={h + 2} style={{ flexShrink: 0 }} aria-hidden>
                          <path d={path} fill="none" stroke={T.accent} strokeWidth="1.5" />
                        </svg>
                        <span style={{ font: `500 10.5px ${T.mono}`, color: T.body }}>
                          {values[0]} → {values[values.length - 1]}
                          {t.unit ? ` ${t.unit}` : ""} {rising ? "↑" : values[values.length - 1] < values[0] ? "↓" : "→"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Patient continuity: prior visits (matched by external ref) and
                uploaded history documents. */}
            {history.length > 0 && (
              <div style={{ marginTop: 4, paddingTop: 13, borderTop: `1px dashed ${T.line}` }}>
                <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>
                  Previous visits
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {history.map((h) => (
                    <a
                      key={h.encounter.id}
                      href={`/cases/${h.encounter.id}`}
                      style={{ fontSize: 11.5, lineHeight: 1.45, color: T.accentInk, textDecoration: "none" }}
                    >
                      <span style={{ font: `500 10px/1 ${T.mono}`, color: T.muted, marginRight: 6 }}>
                        {h.encounter.occurredAt.slice(0, 10)}
                      </span>
                      <span style={{ textDecoration: "underline" }}>{h.encounter.chiefComplaint ?? "visit"}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <HistoryDocs encounterId={encounter.id} initialDocuments={historyDocs} />

            {/* True ambient capture (passive, diarized) isn't built. Push-button
                dictation IS: the note's "+ Add transcript" panel has a mic that
                turns speech into DR:/PT: lines via the browser speech engine. */}
            <div style={{ marginTop: 4, paddingTop: 13, borderTop: `1px dashed ${T.line}` }}>
              <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>Visit transcript</div>
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: T.faint }}>Dictate with the mic (demo speech engine) or paste a transcript in the note — either grounds spoken lines. Hands-free ambient capture is coming.</div>
            </div>
          </aside>

          {/* visit note — client island rendering generateNote()'s spans, with a
              paste-transcript flow that re-grounds `spoken` spans via /api/note.
              Below it: follow-up reminders with clinician-chosen recipients. */}
          <div>
            <NoteCard
              encounterId={encounter.id}
              initialNote={note}
              doseFindings={doseFindings}
              allergyFindings={allergyFindings}
              medications={encounter.medications}
              clinicianName={clinician?.fullName}
              clinicianCredential={clinician?.credential}
            />
            <FollowUpCard
              encounterId={encounter.id}
              initialFollowUps={followUps}
              suggestions={followUpSuggestions}
            />
          </div>

          {/* Auto-surfaced cheat-sheets (curated library, problem-matched) + the
              Q&A engine, contextual to this patient */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {cheatSheets.map((sheet) => (
              <CheatSheetCard key={sheet.id} sheet={sheet} />
            ))}
            {regionalPatterns.map((pattern) => (
              <RegionalPatternCard key={pattern.id} pattern={pattern} />
            ))}
            <HandoutsCard handouts={handouts} />
            <div>
              <div style={{ font: `700 10px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.accent, marginBottom: 10 }}>Ask about this patient</div>
              <QAPanel encounterId={encounter.id} initialFramework={defaultFramework} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
