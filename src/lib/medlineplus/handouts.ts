import type { Problem } from "../types";

// Patient education handouts from MedlinePlus Connect (NLM/NIH).
//
// Keyless service built exactly for this: give it an ICD-10-CM code, get the
// matching plain-language patient page. Pairs with the coded problems the
// intake autocomplete now captures — a doctor can hand the patient vetted
// NIH education material for each diagnosis in one click.
//
// Server-side, same posture as RxNorm/openFDA: only the ICD-10 CODE leaves
// the process (never patient identity), responses cached 24h, failures are
// silent — a missing handout is a gap, not an error.

export interface Handout {
  code: string; // ICD-10-CM that produced it
  problemLabel: string; // the chart problem it belongs to
  title: string; // e.g. "High Blood Pressure"
  url: string; // medlineplus.gov page
}

const ICD10CM_OID = "2.16.840.1.113883.6.90";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { entry: { title: string; url: string } | null; expires: number }>();

export function parseConnectResponse(data: unknown): { title: string; url: string } | null {
  const entries = (data as { feed?: { entry?: unknown[] } })?.feed?.entry;
  if (!Array.isArray(entries) || entries.length === 0) return null;
  // The first entry is MedlinePlus's primary patient page for the code.
  const first = entries[0] as {
    title?: { _value?: unknown };
    link?: { href?: unknown }[];
  };
  const title = first?.title?._value;
  const url = first?.link?.[0]?.href;
  if (typeof title !== "string" || typeof url !== "string" || !title || !url) return null;
  return { title, url };
}

async function fetchHandoutForCode(code: string): Promise<{ title: string; url: string } | null> {
  const now = Date.now();
  const hit = cache.get(code);
  if (hit && hit.expires > now) return hit.entry;

  const base = process.env.MEDLINEPLUS_BASE_URL ?? "https://connect.medlineplus.gov";
  let entry: { title: string; url: string } | null = null;
  try {
    const res = await fetch(
      `${base}/service?mainSearchCriteria.v.cs=${ICD10CM_OID}&mainSearchCriteria.v.c=${encodeURIComponent(code)}&knowledgeResponseType=application/json`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (res.ok) entry = parseConnectResponse(await res.json());
  } catch {
    entry = null; // network/timeout → no handout, silently
  }

  cache.set(code, { entry, expires: now + (entry ? CACHE_TTL_MS : 5 * 60_000) });
  return entry;
}

export async function getHandouts(problems: Problem[]): Promise<Handout[]> {
  // Only coded problems can be looked up; dedupe codes so twin problems don't
  // double-fetch or double-list.
  const seen = new Set<string>();
  const coded = problems.filter((p) => {
    const code = p.code?.trim().toUpperCase();
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });

  const results = await Promise.all(
    coded.map(async (p) => {
      const entry = await fetchHandoutForCode(p.code!.trim().toUpperCase());
      return entry ? { code: p.code!, problemLabel: p.label, title: entry.title, url: entry.url } : null;
    }),
  );
  return results.filter((h): h is Handout => h !== null);
}

// Test-only reset.
export function _resetHandoutCache(): void {
  cache.clear();
}
