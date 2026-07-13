import { describe, it, expect } from "vitest";
import { serializeNote, noteFilename, INFERRED_MARKER } from "@/lib/note/export";
import type { GeneratedNote } from "@/lib/note/schema";
import type { DoseFinding } from "@/lib/dosecheck/schema";

// serializeNote is the "take the note out of the app" seam — a pure function so
// the exact bytes a clinician copies/downloads are unit-testable. These tests
// pin the honesty guarantees that must survive export: the inferred marker, the
// clinician-authored exam separation, the cited dose cautions, and the
// draft-vs-signed footer.

function makeNote(overrides: Partial<GeneratedNote> = {}): GeneratedNote {
  return {
    encounterId: "demo-encounter-1",
    model: "mock",
    generatedAt: "2026-07-01T14:30:00.000Z",
    transcriptId: null,
    sections: [
      {
        heading: "subjective",
        spans: [{ text: "Chief complaint: cough", provenance: "structured", sourceRef: "encounter:chiefComplaint", confidence: 1 }],
      },
      { heading: "objective", spans: [] },
      {
        heading: "assessment",
        spans: [{ text: "1. Essential hypertension (I10)", provenance: "structured", sourceRef: "problem:0", confidence: 1 }],
      },
      {
        heading: "plan",
        spans: [{ text: "Lisinopril 10 mg daily", provenance: "structured", sourceRef: "med:0", confidence: 1 }],
      },
    ],
    ...overrides,
  };
}

describe("serializeNote", () => {
  it("renders all four SOAP headings and the encounter header", () => {
    const out = serializeNote(makeNote());
    expect(out).toContain("VISIT NOTE");
    expect(out).toContain("Encounter: demo-encounter-1");
    expect(out).toContain("SUBJECTIVE");
    expect(out).toContain("OBJECTIVE");
    expect(out).toContain("ASSESSMENT");
    expect(out).toContain("PLAN");
  });

  it("is the doctor's document: clinic letterhead, no product or model branding", () => {
    const out = serializeNote(makeNote(), { letterhead: "Willow Creek Family Practice" });
    expect(out).toContain("WILLOW CREEK FAMILY PRACTICE — VISIT NOTE");
    expect(out).not.toContain("Pabaid");
    expect(out).not.toContain("PABAID");
    expect(out).not.toContain("mock"); // the model name never appears
  });

  it("marks an inferred span with the confirm-me marker", () => {
    const note = makeNote({
      sections: [
        {
          heading: "subjective",
          spans: [{ text: "Likely viral URI", provenance: "inferred", sourceRef: null, confidence: 0.6 }],
        },
        { heading: "objective", spans: [] },
        { heading: "assessment", spans: [] },
        { heading: "plan", spans: [] },
      ],
    });
    const out = serializeNote(note);
    expect(out).toContain(`Likely viral URI ${INFERRED_MARKER}`);
  });

  it("renders clinician-authored exam lines under an explicit subheading", () => {
    const out = serializeNote(makeNote(), { examLines: ["Lungs clear bilaterally", "No edema"] });
    expect(out).toContain("Physical exam (entered by clinician):");
    expect(out).toContain("- Lungs clear bilaterally");
    expect(out).toContain("- No edema");
  });

  it("prints an honest 'left blank' line when no exam and no objective spans", () => {
    const out = serializeNote(makeNote());
    expect(out).toContain("left blank, not templated");
  });

  it("reproduces a flagged dose finding WITH its citation", () => {
    const finding: DoseFinding = {
      medication: "Amlodipine",
      rxcui: "17767",
      ingredient: "amlodipine",
      parsedDoseMg: 20,
      ceilingMg: 10,
      status: "exceeds",
      message: "Amlodipine 20 mg/day exceeds the 10 mg/day reference ceiling.",
      citation: { title: "Amlodipine max daily dose", source: "DailyMed" },
    };
    const out = serializeNote(makeNote(), { doseFindings: [finding] });
    expect(out).toContain("DOSE CAUTIONS");
    expect(out).toContain("exceeds the 10 mg/day reference ceiling");
    expect(out).toContain("[Amlodipine max daily dose — DailyMed]");
  });

  it("omits the cautions block when no finding is flagging", () => {
    const ok: DoseFinding = {
      medication: "Lisinopril",
      rxcui: "29046",
      ingredient: "lisinopril",
      parsedDoseMg: 10,
      ceilingMg: 80,
      status: "ok",
      message: "Within reference range.",
      citation: null,
    };
    const out = serializeNote(makeNote(), { doseFindings: [ok] });
    expect(out).not.toContain("DOSE CAUTIONS");
  });

  // The accept/reject flow: a flagged caution exports with the clinician's
  // decision attached — kept, revised (with the honest re-check result), or an
  // explicit "not yet reviewed" so an undecided flag can't pass silently.
  const flaggedLisinopril: DoseFinding = {
    medication: "Lisinopril",
    rxcui: null,
    ingredient: "lisinopril",
    parsedDoseMg: 200,
    ceilingMg: 80,
    status: "exceeds",
    message: "Lisinopril ~200 mg/day is above the reference maximum of 80 mg/day.",
    citation: { title: "Lisinopril — maximum daily dose", source: "FDA label (DailyMed)" },
  };

  it("marks an undecided flagged caution as not yet reviewed", () => {
    const out = serializeNote(makeNote(), { doseFindings: [flaggedLisinopril] });
    expect(out).toContain("Clinician decision: not yet reviewed.");
  });

  it("records a 'kept as documented' decision", () => {
    const out = serializeNote(makeNote(), {
      doseFindings: [flaggedLisinopril],
      doseDecisions: { 0: { kind: "kept" } },
    });
    expect(out).toContain("Clinician decision: reviewed — kept as documented.");
    expect(out).not.toContain("not yet reviewed");
  });

  it("records a revised decision with the re-check result, and annotates the plan line", () => {
    const out = serializeNote(makeNote(), {
      doseFindings: [flaggedLisinopril],
      doseDecisions: {
        0: {
          kind: "revised",
          newDose: "20 mg",
          refreshed: {
            medication: "Lisinopril",
            rxcui: null,
            ingredient: "lisinopril",
            parsedDoseMg: 20,
            ceilingMg: 80,
            status: "ok",
            message: "Lisinopril ~20 mg/day is within the reference maximum of 80 mg/day.",
            citation: null,
          },
        },
      },
    });
    // Decision recorded under the original caution — the audit trail survives.
    expect(out).toContain('Clinician decision: revised to "20 mg". Lisinopril ~20 mg/day is within');
    // And the PLAN line itself carries the revision — that's what hits the EHR.
    expect(out).toContain('Lisinopril 10 mg daily (dose revised by clinician to "20 mg")');
  });

  it("watermarks an unsigned note as DRAFT", () => {
    const out = serializeNote(makeNote());
    expect(out).toContain("DRAFT — not signed.");
    expect(out).not.toContain("Electronically signed by");
  });

  it("attests a signed note with name, credential, and timestamp", () => {
    const out = serializeNote(makeNote(), {
      signature: { clinicianName: "Demo Clinician", credential: "MD", signedAt: "2026-07-01T15:00:00.000Z" },
    });
    expect(out).toContain("Electronically signed by Demo Clinician, MD on 2026-07-01T15:00:00.000Z.");
    expect(out).not.toContain("DRAFT — not signed.");
  });

  it("renders addenda AFTER the attestation — amend, never edit", () => {
    const out = serializeNote(makeNote(), {
      signature: { clinicianName: "Demo Clinician", credential: "MD", signedAt: "2026-07-01T15:00:00.000Z" },
      addenda: [{ text: "Lab results returned after signing: K+ 4.1.", at: "2026-07-01T18:00:00.000Z" }],
    });
    const signedIdx = out.indexOf("Electronically signed by");
    const addendumIdx = out.indexOf("ADDENDUM (2026-07-01T18:00:00.000Z):");
    expect(signedIdx).toBeGreaterThan(-1);
    expect(addendumIdx).toBeGreaterThan(signedIdx);
    expect(out).toContain("Lab results returned after signing");
  });

  it("notes when the source was a pasted transcript", () => {
    const out = serializeNote(makeNote({ transcriptId: "pasted" }));
    expect(out).toContain("Grounded in a pasted visit transcript.");
  });
});

describe("noteFilename", () => {
  it("builds a stable, filesystem-safe name from encounter + date", () => {
    expect(noteFilename(makeNote())).toBe("visit-note-demo-encounter-1-2026-07-01.txt");
  });

  it("sanitizes unsafe characters in the encounter id", () => {
    expect(noteFilename(makeNote({ encounterId: "enc/../weird id" }))).toBe("visit-note-enc----weird-id-2026-07-01.txt");
  });
});
