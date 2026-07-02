"use client";

import { useState } from "react";
import type { Problem, Medication } from "@/lib/types";
import { AutocompleteInput } from "./AutocompleteInput";
import {
  searchConditions,
  searchMedications,
  strengthToDose,
} from "@/lib/intake/clinical-tables";
import { parseMedicationEntry } from "@/lib/case-intake";

// Structured pickers for problems (ICD-10-CM) and medications (RxTerms),
// backed by the keyless NIH Clinical Tables API. Picked entries carry real
// codes/doses; free text still works (Enter without a selection), so the
// picker helps without trapping.

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm text-slate-700">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
      >
        ×
      </button>
    </span>
  );
}

export function ProblemsField({
  problems,
  onChange,
}: {
  problems: Problem[];
  onChange: (next: Problem[]) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">Problems</label>
      {problems.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {problems.map((p, i) => (
            <Chip key={i} onRemove={() => onChange(problems.filter((_, j) => j !== i))}>
              {p.label}
              {p.code && <span className="font-mono text-xs text-clinical">{p.code}</span>}
            </Chip>
          ))}
        </div>
      )}
      <AutocompleteInput
        placeholder="Search ICD-10 (e.g. hypertension) — or type and press Enter"
        fetchOptions={async (term) =>
          (await searchConditions(term)).map((c) => ({
            id: c.code,
            primary: c.label,
            secondary: c.code,
          }))
        }
        onSelect={(o) => onChange([...problems, { label: o.primary, code: o.secondary }])}
        onFreeText={(text) => onChange([...problems, { label: text }])}
      />
    </div>
  );
}

export function MedicationsField({
  medications,
  onChange,
}: {
  medications: Medication[];
  onChange: (next: Medication[]) => void;
}) {
  // After picking a drug that has strengths, offer them as one-click options
  // before the chip is finalized. Skipping keeps the med with no dose (the
  // dose check reports it honestly as unparseable/not-checked).
  const [pendingDrug, setPendingDrug] = useState<{ name: string; strengths: string[] } | null>(null);
  const [strengthsByName, setStrengthsByName] = useState<Record<string, string[]>>({});

  function addMedication(med: Medication) {
    onChange([...medications, med]);
    setPendingDrug(null);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink">Medications</label>
      {medications.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {medications.map((m, i) => (
            <Chip key={i} onRemove={() => onChange(medications.filter((_, j) => j !== i))}>
              {m.name}
              {m.dose && <span className="font-mono text-xs text-clinical">{m.dose}</span>}
              {m.frequency && <span className="text-xs text-slate-500">{m.frequency}</span>}
            </Chip>
          ))}
        </div>
      )}

      {pendingDrug ? (
        <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-xs font-medium text-slate-600">
            {pendingDrug.name} — pick a strength (or skip):
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pendingDrug.strengths.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addMedication({ name: pendingDrug.name, dose: strengthToDose(s) })}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-700 hover:border-clinical hover:text-clinical"
              >
                {s.trim()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addMedication({ name: pendingDrug.name })}
              className="rounded px-2 py-1 text-xs text-slate-500 underline"
            >
              skip
            </button>
          </div>
        </div>
      ) : (
        <AutocompleteInput
          placeholder="Search drugs (e.g. lisinopril) — or type 'name dose freq' and press Enter"
          fetchOptions={async (term) => {
            const meds = await searchMedications(term);
            // Stash strengths so onSelect can offer them without a refetch.
            setStrengthsByName(Object.fromEntries(meds.map((m) => [m.name, m.strengths])));
            return meds.map((m) => ({
              id: m.name,
              primary: m.name,
              secondary: m.strengths.length ? `${m.strengths.length} strengths` : undefined,
            }));
          }}
          onSelect={(o) => {
            const strengths = strengthsByName[o.primary] ?? [];
            if (strengths.length > 0) setPendingDrug({ name: o.primary, strengths });
            else addMedication({ name: o.primary });
          }}
          onFreeText={(text) => addMedication(parseMedicationEntry(text))}
        />
      )}
    </div>
  );
}
