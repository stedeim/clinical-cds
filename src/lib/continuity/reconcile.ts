import type { Medication, Vital } from "../types";
import { matchDoseRule } from "../dosecheck/rules";

// Visit-to-visit continuity: medication reconciliation and vitals trends.
// Pure functions over the case history the external-ref continuity provides.

// ---------------------------------------------------------------------------
// Medication reconciliation — what changed since the last visit.
// Meds are matched by normalized ingredient (curated dose-rule ingredient
// when known, else the first word), so "Zestril" and "Lisinopril (Oral
// Pill)" reconcile as the same drug.
// ---------------------------------------------------------------------------

export interface MedChange {
  name: string;
  from?: string; // previous dose/frequency description
  to?: string; // current dose/frequency description
}

export interface Reconciliation {
  started: Medication[];
  stopped: Medication[];
  changed: MedChange[];
}

function medKey(med: Medication): string {
  return (matchDoseRule(med.name)?.ingredient ?? med.name.split(/[\s(]/)[0]).toLowerCase();
}

function doseDescription(med: Medication): string {
  return [med.dose, med.frequency].filter(Boolean).join(" ") || "(no dose recorded)";
}

export function reconcileMedications(current: Medication[], previous: Medication[]): Reconciliation {
  const prevByKey = new Map(previous.map((m) => [medKey(m), m]));
  const currByKey = new Map(current.map((m) => [medKey(m), m]));

  const started = current.filter((m) => !prevByKey.has(medKey(m)));
  const stopped = previous.filter((m) => !currByKey.has(medKey(m)));
  const changed: MedChange[] = [];

  for (const med of current) {
    const prev = prevByKey.get(medKey(med));
    if (!prev) continue;
    const from = doseDescription(prev);
    const to = doseDescription(med);
    if (from !== to) changed.push({ name: med.name, from, to });
  }

  return { started, stopped, changed };
}

// ---------------------------------------------------------------------------
// Vitals trends — a named vital's values across visits, oldest first.
// BP ("128/82") splits into systolic/diastolic series; other vitals must
// parse as a single number to join a trend. Non-numeric values are skipped —
// an unparseable reading is a gap, not a zero.
// ---------------------------------------------------------------------------

export interface VitalTrend {
  name: string; // "BP (systolic)", "HR", ...
  unit?: string;
  points: { date: string; value: number }[]; // oldest → newest
}

export function vitalsTrends(
  visits: { date: string; vitals: Vital[] }[], // any order; sorted here
): VitalTrend[] {
  const series = new Map<string, { unit?: string; points: { date: string; value: number }[] }>();

  const push = (name: string, unit: string | undefined, date: string, value: number) => {
    const s = series.get(name) ?? { unit, points: [] };
    s.points.push({ date, value });
    series.set(name, s);
  };

  for (const visit of [...visits].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const v of visit.vitals) {
      const bp = v.value.match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/);
      if (bp) {
        push(`${v.name} (systolic)`, v.unit, visit.date, parseInt(bp[1], 10));
        push(`${v.name} (diastolic)`, v.unit, visit.date, parseInt(bp[2], 10));
        continue;
      }
      const n = parseFloat(v.value);
      if (Number.isFinite(n)) push(v.name, v.unit, visit.date, n);
    }
  }

  // A trend needs at least two points; single readings stay where they are.
  return [...series.entries()]
    .filter(([, s]) => s.points.length >= 2)
    .map(([name, s]) => ({ name, unit: s.unit, points: s.points }));
}
