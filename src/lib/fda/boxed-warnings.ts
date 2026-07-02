import type { Medication } from "../types";
import { matchDoseRule } from "../dosecheck/rules";

// FDA boxed-warning ("black box") flags from the openFDA drug-label API.
//
// Keyless (240 req/min per IP), server-side only — same posture as the RxNorm
// lookup: only the drug NAME leaves the process, never dose or PHI, and the
// clinician's browser never talks to the FDA.
//
// Three honest states, and the UI may only ever claim two of them:
//   • { hasBoxedWarning: true, summary }  → show the flag, cited to the label
//   • { hasBoxedWarning: false }          → say nothing (absence isn't a claim)
//   • null (drug not found / API down)    → say nothing — NEVER "no warning"
// A missing flag must never read as "checked and clear".
//
// Labels change rarely; results are cached in-memory for 24h so an encounter
// page doesn't re-hit the API per render.

export interface BoxedWarningResult {
  ingredient: string; // what was actually queried
  hasBoxedWarning: boolean;
  summary: string | null; // first ~400 chars of the label's boxed warning
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 500;
const cache = new Map<string, { result: BoxedWarningResult | null; expires: number }>();

// Resolve the query term: the curated ingredient when we know it (canonical,
// lowercase), otherwise the first word of the med name — a reasonable guess
// that at worst yields a 404 → null → silence.
export function queryTermFor(med: Medication): string {
  return (matchDoseRule(med.name)?.ingredient ?? med.name.split(/[\s(]/)[0]).toLowerCase();
}

export function parseLabelResponse(ingredient: string, data: unknown): BoxedWarningResult {
  const results = (data as { results?: unknown[] })?.results;
  const label = Array.isArray(results) ? (results[0] as { boxed_warning?: unknown }) : undefined;
  const boxed = label?.boxed_warning;
  if (Array.isArray(boxed) && boxed.length > 0 && typeof boxed[0] === "string") {
    const text = boxed.join(" ").replace(/\s+/g, " ").trim();
    return {
      ingredient,
      hasBoxedWarning: true,
      summary: text.length > 400 ? text.slice(0, 400) + "…" : text,
    };
  }
  return { ingredient, hasBoxedWarning: false, summary: null };
}

async function fetchBoxedWarning(ingredient: string): Promise<BoxedWarningResult | null> {
  const base = process.env.OPENFDA_BASE_URL ?? "https://api.fda.gov";
  const search = `openfda.generic_name.exact:"${ingredient.toUpperCase()}"`;
  try {
    const res = await fetch(`${base}/drug/label.json?search=${encodeURIComponent(search)}&limit=1`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 404) return null; // not in openFDA → unknown, no claim
    if (!res.ok) return null;
    return parseLabelResponse(ingredient, await res.json());
  } catch {
    return null; // network/timeout → unknown, no claim
  }
}

export async function checkBoxedWarnings(meds: Medication[]): Promise<(BoxedWarningResult | null)[]> {
  return Promise.all(
    meds.map(async (med) => {
      const term = queryTermFor(med);
      if (!term) return null;

      const now = Date.now();
      const hit = cache.get(term);
      if (hit && hit.expires > now) return hit.result;

      const result = await fetchBoxedWarning(term);
      if (cache.size >= MAX_CACHE) {
        for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
        if (cache.size >= MAX_CACHE) cache.clear(); // blunt but bounded
      }
      // Failures are cached briefly too (5 min) so a flapping API doesn't get
      // hammered on every page view.
      cache.set(term, { result, expires: now + (result ? CACHE_TTL_MS : 5 * 60_000) });
      return result;
    }),
  );
}

// Test-only reset.
export function _resetBoxedWarningCache(): void {
  cache.clear();
}
