import { describe, it, expect } from "vitest";
import { buildPrintHtml, escapeHtml } from "@/lib/note/print";
import type { GeneratedNote } from "@/lib/note/schema";
import type { DoseFinding } from "@/lib/dosecheck/schema";

// The print document is what a clinic hands around on paper — its honesty
// guarantees are pinned here: DRAFT watermark on unsigned notes, the
// AI-inferred marker survives, exam separation, cited cautions with the
// clinician's decision, and note text can never smuggle in markup.

function makeNote(): GeneratedNote {
  return {
    encounterId: "demo-encounter-1",
    model: "mock",
    generatedAt: "2026-07-02T12:00:00.000Z",
    transcriptId: null,
    sections: [
      {
        heading: "subjective",
        spans: [
          { text: "Chief complaint: cough", provenance: "structured", sourceRef: "encounter:chiefComplaint", confidence: 1 },
          { text: "Likely viral URI.", provenance: "inferred", sourceRef: null, confidence: 0.6 },
        ],
      },
      { heading: "objective", spans: [] },
      { heading: "assessment", spans: [] },
      { heading: "plan", spans: [{ text: "Lisinopril 200 mg daily", provenance: "structured", sourceRef: "med:0", confidence: 1 }] },
    ],
  };
}

const FLAGGED: DoseFinding = {
  medication: "Lisinopril",
  rxcui: null,
  ingredient: "lisinopril",
  parsedDoseMg: 200,
  ceilingMg: 80,
  status: "exceeds",
  message: "Lisinopril ~200 mg/day is above the reference maximum of 80 mg/day.",
  citation: { title: "Lisinopril — maximum daily dose", source: "FDA label (DailyMed)" },
};

describe("escapeHtml", () => {
  it("neutralizes markup in note text", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

describe("buildPrintHtml", () => {
  it("is the doctor's document: clinic letterhead, readable date, no product or model branding", () => {
    const html = buildPrintHtml(makeNote(), { letterhead: "Willow Creek Family Practice" });
    expect(html).toContain("Willow Creek Family Practice — Visit Note");
    expect(html).not.toContain("Pabaid");
    expect(html).not.toContain("mock"); // the model name never appears
    // ISO timestamp is humanized on the printed page.
    expect(html).not.toMatch(/generated [^<]*T[^<]*Z/);
  });

  it("falls back to a plain Visit Note heading without a letterhead", () => {
    const html = buildPrintHtml(makeNote());
    expect(html).toContain("<h1>Visit Note</h1>");
    expect(html).not.toContain("Pabaid");
  });

  it("watermarks an unsigned note as DRAFT and keeps the inferred marker", () => {
    const html = buildPrintHtml(makeNote());
    expect(html).toContain('class="watermark">DRAFT');
    expect(html).toContain("DRAFT — not signed.");
    expect(html).toContain("[AI-inferred — confirm]");
    expect(html).toContain("left blank, not templated");
  });

  it("signs instead of watermarking when a signature is present", () => {
    const html = buildPrintHtml(makeNote(), {
      signature: { clinicianName: "Demo Clinician", credential: "MD", signedAt: "2026-07-02T13:00:00.000Z" },
    });
    expect(html).not.toContain('class="watermark"');
    expect(html).toContain("Electronically signed by <b>Demo Clinician, MD</b>");
  });

  it("prints cited dose cautions with the clinician's decision", () => {
    const html = buildPrintHtml(makeNote(), {
      doseFindings: [FLAGGED],
      doseDecisions: {
        0: {
          kind: "revised",
          newDose: "20 mg",
          refreshed: { ...FLAGGED, parsedDoseMg: 20, status: "ok", message: "Within the reference maximum.", citation: null },
        },
      },
    });
    expect(html).toContain("Dose cautions");
    expect(html).toContain("[Lisinopril — maximum daily dose — FDA label (DailyMed)]");
    expect(html).toContain('revised to "20 mg"');
  });

  it("renders clinician exam lines under the explicit subheading", () => {
    const html = buildPrintHtml(makeNote(), { examLines: ["Lungs clear bilaterally."] });
    expect(html).toContain("Physical exam (entered by clinician):");
    expect(html).toContain("— Lungs clear bilaterally.");
    expect(html).not.toContain("left blank");
  });

  it("escapes hostile note text end-to-end", () => {
    const note = makeNote();
    note.sections[0].spans[0].text = `<img src=x onerror=alert(1)>`;
    const html = buildPrintHtml(note);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
