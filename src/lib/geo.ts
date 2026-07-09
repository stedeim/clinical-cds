import type { GuidelineFramework } from "./types";

// Geo-detection for the DEFAULT guideline framework.
//
// This only picks the initial value of the framework selector — the clinician
// can always override it manually, and the choice they send with a query is
// what the engine uses. Detection is header-based and requires no external
// geolocation service (no IP ever leaves the process):
//   1. x-vercel-ip-country / cf-ipcountry — set by the hosting edge (reliable);
//   2. Accept-Language region subtag (e.g. "en-AU") — a browser hint, weaker;
//   3. no signal → "US" (the app's long-standing default).
// A country we don't have a framework for maps to WHO — the honest global
// baseline, rather than pretending US guidance is local.

const COUNTRY_TO_FRAMEWORK: Record<string, GuidelineFramework> = {
  US: "US",
  GB: "UK_NICE",
  CA: "CA",
  AU: "AU",
  NZ: "NZ",
  IE: "IE",
};

export function frameworkForCountry(countryCode: string | null | undefined): GuidelineFramework | null {
  if (!countryCode) return null;
  const code = countryCode.trim().toUpperCase();
  if (!code || code.length !== 2) return null;
  return COUNTRY_TO_FRAMEWORK[code] ?? "WHO";
}

// Extract a region subtag from an Accept-Language header, e.g.
// "en-AU,en;q=0.9" → "AU". Only the first locale is considered.
export function countryFromAcceptLanguage(acceptLanguage: string | null | undefined): string | null {
  if (!acceptLanguage) return null;
  const first = acceptLanguage.split(",")[0]?.trim();
  const m = first?.match(/^[a-zA-Z]{2,3}-([a-zA-Z]{2})\b/);
  return m ? m[1].toUpperCase() : null;
}

// The raw two-letter country the request appears to come from (edge header
// first, Accept-Language hint second); null when there is no signal.
export function detectCountry(headers: Headers): string | null {
  const edge = headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  if (edge && edge.trim().length === 2) return edge.trim().toUpperCase();
  return countryFromAcceptLanguage(headers.get("accept-language"));
}

export function detectFramework(headers: Headers): GuidelineFramework {
  return frameworkForCountry(detectCountry(headers)) ?? "US";
}
