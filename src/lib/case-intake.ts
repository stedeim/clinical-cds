import { z } from "zod";
import { FRAMEWORK_IDS } from "@/lib/guidelines";
import type { CaseContext, Problem, Medication, Allergy } from "@/lib/types";

export const SexEnum = z.enum(["female", "male", "intersex", "unknown"]);
export const FrameworkEnum = z.enum(FRAMEWORK_IDS);

function toObjects(key: "label", raw: string): Problem[];
function toObjects(key: "name", raw: string): Medication[];
function toObjects(key: "substance", raw: string): Allergy[];
function toObjects(key: "label" | "name" | "substance", raw: string): unknown[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ [key]: item }));
}

// Split a free-text medication entry into name / dose / frequency so the
// dose-check engine gets a checkable `dose` field. Without this, "Lisinopril
// 200 mg daily" lands whole in `name`, the engine sees no dose, and honestly
// stays silent — the flag the intake user most needs never fires.
export function parseMedicationEntry(item: string): Medication {
  const m = item.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*(?:mcg|ug|µg|mg|g)\b\.?)\s*(.*)$/i);
  if (!m) return { name: item };
  return {
    name: m[1].trim(),
    dose: m[2].trim(),
    frequency: m[3].trim() || undefined,
  };
}

const problemsSchema = z.string().transform((s) => toObjects("label", s));
const medicationsSchema = z
  .string()
  .transform((s) => toObjects("name", s).map((med) => parseMedicationEntry(med.name)));
const allergiesSchema = z.string().transform((s) => toObjects("substance", s));

export const CaseIntakeSchema = z.object({
  externalRef: z.string().max(64).optional(),
  ageYears: z.coerce.number().int().min(0).max(130).optional(),
  sex: SexEnum.default("unknown"),
  chiefComplaint: z.string().min(1).max(500),
  hpi: z.string().max(4000).optional(),
  // Structured entries (from the autocomplete pickers) carry the ICD-10 code /
  // dose / frequency; the string arms remain for comma-separated free text.
  problems: z
    .union([z.array(z.object({ label: z.string().min(1), code: z.string().optional() })), problemsSchema])
    .default([]),
  medications: z
    .union([
      z.array(
        z.object({
          name: z.string().min(1),
          dose: z.string().optional(),
          frequency: z.string().optional(),
        }),
      ),
      medicationsSchema,
    ])
    .default([]),
  allergies: z.union([z.array(z.object({ substance: z.string() })), allergiesSchema]).default([]),
  vitals: z.string().max(2000).optional(),
  labs: z.string().max(2000).optional(),
  framework: FrameworkEnum.default("US"),
});

export function parseVitals(raw: string | undefined): CaseContext["encounter"]["vitals"] {
  if (!raw) return [];
  return raw
    .split(/[\n;]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const valueMatch = line.match(/(.+?)\s+([0-9./]+)\s*(.*)$/);
      if (valueMatch) {
        return {
          name: valueMatch[1].trim(),
          value: valueMatch[2].trim(),
          unit: valueMatch[3].trim() || undefined,
        };
      }
      return { name: line, value: "", unit: undefined };
    });
}

export function parseLabs(raw: string | undefined): CaseContext["encounter"]["labs"] {
  if (!raw) return [];
  return raw
    .split(/[\n;]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const valueMatch = line.match(/(.+?)\s+([0-9.]+)\s*(.*)$/);
      if (valueMatch) {
        return {
          name: valueMatch[1].trim(),
          value: parseFloat(valueMatch[2]),
          valueText: undefined,
          unit: valueMatch[3].trim() || undefined,
        };
      }
      return { name: line, valueText: undefined, value: undefined, unit: undefined };
    });
}

export function caseFromIntake(
  data: z.infer<typeof CaseIntakeSchema>,
  clinicianId?: string,
): CaseContext {
  const now = new Date().toISOString();
  return {
    patient: {
      id: clinicianId ? crypto.randomUUID() : "demo-patient-" + Date.now(),
      externalRef: data.externalRef,
      ageYears: data.ageYears,
      sex: data.sex,
      isTestCase: false,
    },
    encounter: {
      id: clinicianId ? crypto.randomUUID() : "demo-encounter-" + Date.now(),
      patientId: "",
      occurredAt: now,
      chiefComplaint: data.chiefComplaint,
      hpi: data.hpi,
      problems: data.problems,
      medications: data.medications,
      allergies: data.allergies,
      vitals: parseVitals(data.vitals),
      labs: parseLabs(data.labs),
    },
  };
}
