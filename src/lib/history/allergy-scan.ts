import { ALLERGY_CLASSES } from "../allergy/rules";
import type { Allergy } from "../types";
import type { PatientDocument } from "./store";

// Scan uploaded history documents for allergy mentions.
//
// Deterministic and vocabulary-bound: a suggestion requires BOTH an allergy
// word ("allergy", "allergic", "anaphylaxis", "hives"...) AND a known
// allergen keyword from the curated class table within the same sentence.
// Every suggestion carries the exact source sentence so the clinician can
// judge it in context, and NOTHING is ever added to the record without their
// explicit confirmation — the scan proposes, the doctor disposes.

export interface AllergySuggestion {
  substance: string; // the matched allergen keyword, e.g. "penicillin"
  context: string; // the sentence it was found in, trimmed
  documentId: string;
  documentName: string;
}

const ALLERGY_SIGNAL = /\b(allerg\w*|anaphyla\w*|hives|urticaria|intoleran\w*|adverse reaction)\b/i;

// Negation guard: "no known allergies", "denies allergy to penicillin".
const NEGATION = /\b(no known|nkda|denies|denied|without|negative for)\b/i;

export function scanDocumentsForAllergies(
  documents: Pick<PatientDocument, "id" | "filename" | "text">[],
  alreadyRecorded: Allergy[],
): AllergySuggestion[] {
  const recorded = new Set(
    alreadyRecorded.flatMap((a) =>
      a.substance
        .toLowerCase()
        .split(/[\s,/-]+/)
        .filter((t) => t.length >= 4),
    ),
  );

  const out: AllergySuggestion[] = [];
  const seen = new Set<string>();

  for (const doc of documents) {
    // Sentence-ish fragments; OCR text often uses newlines as separators.
    for (const raw of doc.text.split(/(?<=[.!?])\s+|\n+/)) {
      const sentence = raw.trim();
      if (!sentence || sentence.length > 300) continue;
      if (!ALLERGY_SIGNAL.test(sentence)) continue;
      if (NEGATION.test(sentence)) continue;

      const lower = sentence.toLowerCase();
      for (const cls of ALLERGY_CLASSES) {
        for (const keyword of cls.allergenKeywords) {
          if (!lower.includes(keyword)) continue;
          if (recorded.has(keyword)) continue; // already on the record
          if (seen.has(keyword)) continue; // one suggestion per substance
          seen.add(keyword);
          out.push({
            substance: keyword,
            context: sentence.length > 180 ? sentence.slice(0, 180) + "…" : sentence,
            documentId: doc.id,
            documentName: doc.filename,
          });
        }
      }
    }
  }
  return out;
}
