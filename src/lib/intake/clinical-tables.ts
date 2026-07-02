// NIH Clinical Tables autocomplete (clinicaltables.nlm.nih.gov).
//
// Keyless, CORS-enabled, built by NLM precisely for form autocomplete — so
// the intake form can offer real ICD-10-CM codes and RxTerms drug names
// instead of free text. Structured codes at the source make every downstream
// matcher (dose check, cheat-sheets, regional patterns) more reliable.
//
// Called from the browser: only the typed search term leaves the page (like a
// doctor typing into any reference site) — never patient identity or chart.
// Response shape (v3): [total, terms[], extraFields|null, display[][]].

export interface ConditionSuggestion {
  code: string; // ICD-10-CM, e.g. "I10"
  label: string; // "Essential (primary) hypertension"
}

export interface MedicationSuggestion {
  name: string; // RxTerms display, e.g. "Lisinopril (Oral Pill)"
  strengths: string[]; // e.g. ["10 mg Tab", "20 mg Tab"]
}

const BASE = "https://clinicaltables.nlm.nih.gov/api";

export async function searchConditions(term: string): Promise<ConditionSuggestion[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const res = await fetch(
    `${BASE}/icd10cm/v3/search?sf=code,name&maxList=7&terms=${encodeURIComponent(q)}`,
  );
  if (!res.ok) return [];
  return parseConditionResponse(await res.json());
}

export function parseConditionResponse(data: unknown): ConditionSuggestion[] {
  if (!Array.isArray(data) || !Array.isArray(data[3])) return [];
  return (data[3] as unknown[])
    .filter((row): row is [string, string] => Array.isArray(row) && row.length >= 2)
    .map(([code, label]) => ({ code, label }));
}

export async function searchMedications(term: string): Promise<MedicationSuggestion[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const res = await fetch(
    `${BASE}/rxterms/v3/search?ef=STRENGTHS_AND_FORMS&maxList=7&terms=${encodeURIComponent(q)}`,
  );
  if (!res.ok) return [];
  return parseMedicationResponse(await res.json());
}

export function parseMedicationResponse(data: unknown): MedicationSuggestion[] {
  if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
  const names = data[1] as unknown[];
  const strengthsByIndex =
    (data[2] as { STRENGTHS_AND_FORMS?: unknown } | null)?.STRENGTHS_AND_FORMS ?? [];
  return names
    .filter((n): n is string => typeof n === "string")
    .map((name, i) => ({
      name,
      strengths: Array.isArray((strengthsByIndex as unknown[])[i])
        ? ((strengthsByIndex as unknown[][])[i] as unknown[]).filter(
            (s): s is string => typeof s === "string",
          )
        : [],
    }));
}

// "10 mg Tab" → "10 mg"; " 2.5 mg Tab" → "2.5 mg"; "12.5-10 mg Tab" →
// "12.5-10 mg". Drops the dose form suffix; keeps the strength as typed so
// the dose-check parser reads it the same way a hand-typed dose reads.
export function strengthToDose(strength: string): string {
  return strength.trim().replace(/\s+(Tab|Cap|Sol|Susp|Cream|Oint|Patch|Inj|Spray|Chewable)\b.*$/i, "");
}
