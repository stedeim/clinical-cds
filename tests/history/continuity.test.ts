import { describe, it, expect, beforeEach } from "vitest";
import * as memoryStore from "@/lib/memory-store";
import { createDocument, listDocuments, _resetPatientDocs, MAX_TEXT_CHARS } from "@/lib/history/store";
import { detectFormat } from "@/lib/history/extract";
import type { CaseContext } from "@/lib/types";

// Patient continuity: the external ref is the returning-patient key. A new
// case with a matching ref reuses the patient identity, so prior visits and
// their allergies attach automatically.

function makeCase(encounterId: string, externalRef: string, allergies: { substance: string }[] = []): CaseContext {
  return {
    patient: { id: `pat-${encounterId}`, externalRef, ageYears: 58, sex: "female", isTestCase: true },
    encounter: {
      id: encounterId,
      patientId: `pat-${encounterId}`,
      occurredAt: new Date().toISOString(),
      chiefComplaint: "visit",
      problems: [],
      medications: [],
      allergies,
      vitals: [],
      labs: [],
    },
  };
}

describe("patient continuity by external ref", () => {
  it("reuses the patient identity across visits with the same ref", () => {
    const first = memoryStore.saveCase(makeCase("enc-hist-1", "MRN-777", [{ substance: "penicillin" }]));
    const second = memoryStore.saveCase(makeCase("enc-hist-2", "mrn-777")); // case-insensitive

    expect(second.patient.id).toBe(first.patient.id);
    expect(second.encounter.patientId).toBe(first.patient.id);

    const history = memoryStore.listCasesForPatient(first.patient.id, "enc-hist-2");
    expect(history.map((h) => h.encounter.id)).toContain("enc-hist-1");
    expect(history.map((h) => h.encounter.id)).not.toContain("enc-hist-2");
  });

  it("keeps distinct patients distinct", () => {
    const a = memoryStore.saveCase(makeCase("enc-hist-3", "MRN-A"));
    const b = memoryStore.saveCase(makeCase("enc-hist-4", "MRN-B"));
    expect(a.patient.id).not.toBe(b.patient.id);
  });

  it("does not link cases with no external ref", () => {
    const a = memoryStore.saveCase(makeCase("enc-hist-5", ""));
    const b = memoryStore.saveCase(makeCase("enc-hist-6", ""));
    expect(a.patient.id).not.toBe(b.patient.id);
  });
});

describe("history documents store", () => {
  beforeEach(() => _resetPatientDocs());

  it("stores and lists per patient + clinician, text capped", () => {
    createDocument({ patientId: "p1", clinicianId: "c1", filename: "old.txt", format: "txt", text: "old history", ocr: false });
    createDocument({ patientId: "p1", clinicianId: "c1", filename: "big.pdf", format: "pdf", text: "x".repeat(MAX_TEXT_CHARS + 500), ocr: true });
    createDocument({ patientId: "p1", clinicianId: "c2", filename: "other-doc.txt", format: "txt", text: "not yours", ocr: false });

    const docs = listDocuments("p1", "c1");
    expect(docs.map((d) => d.filename).sort()).toEqual(["big.pdf", "old.txt"]);
    const big = docs.find((d) => d.filename === "big.pdf")!;
    expect(big.text.length).toBe(MAX_TEXT_CHARS);
  });
});

describe("detectFormat", () => {
  it("maps extensions and rejects the unknown", () => {
    expect(detectFormat("history.txt")).toBe("txt");
    expect(detectFormat("Chart Notes.DOCX")).toBe("docx");
    expect(detectFormat("records.pdf")).toBe("pdf");
    expect(detectFormat("archive.zip")).toBeNull();
    expect(detectFormat("image.png")).toBeNull();
  });
});
