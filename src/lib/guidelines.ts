import type { GuidelineFramework } from "./types";

// Guideline-abstraction layer (Moat 4).
//
// The reasoning prompt is framework-aware: the same case can be reasoned under
// US society guidelines, UK NICE, or WHO. This module is the single extension
// point — add a jurisdiction here and the engine, prompt, and citations adapt.
// Keeping it data (not branching logic scattered through the codebase) is what
// makes "add Canada / Australia / EU" a config change rather than a refactor.

export interface FrameworkProfile {
  id: GuidelineFramework;
  label: string;
  // Compact label for tight UI (the framework <select>).
  shortLabel: string;
  // Injected into the system prompt to steer sourcing + terminology.
  guidance: string;
  // Preferred primary sources, surfaced to the model for citation grounding.
  preferredSources: string[];
}

// Single source of truth for the framework id list — the zod enums in the API
// boundary and case intake derive from this, so adding a jurisdiction here is
// the whole change (plus a DB enum migration).
export const FRAMEWORK_IDS = ["US", "UK_NICE", "CA", "AU", "NZ", "IE", "WHO"] as const satisfies readonly GuidelineFramework[];

export const FRAMEWORKS: Record<GuidelineFramework, FrameworkProfile> = {
  US: {
    id: "US",
    label: "United States (specialty society guidelines)",
    shortLabel: "US societies",
    guidance:
      "Prioritize US specialty society guidance (e.g., ACP, AHA/ACC, IDSA, USPSTF) " +
      "and FDA drug labeling. Use US units and brand/generic conventions.",
    preferredSources: ["USPSTF", "ACP", "AHA/ACC", "IDSA", "FDA label"],
  },
  UK_NICE: {
    id: "UK_NICE",
    label: "United Kingdom (NICE)",
    shortLabel: "UK NICE",
    guidance:
      "Prioritize NICE guidelines and the BNF for medicines. Use UK terminology " +
      "and SI units where NICE does. Note where NICE diverges from US practice.",
    preferredSources: ["NICE", "BNF", "SIGN"],
  },
  CA: {
    id: "CA",
    label: "Canada (national and specialty society guidelines)",
    shortLabel: "Canada",
    guidance:
      "Prioritize Canadian guidance (Canadian Task Force on Preventive Health Care, " +
      "Hypertension Canada, Diabetes Canada, specialty societies) and Health Canada " +
      "product monographs. Use SI units and Canadian brand/generic conventions.",
    preferredSources: ["CTFPHC", "Hypertension Canada", "Diabetes Canada", "Health Canada monograph"],
  },
  AU: {
    id: "AU",
    label: "Australia (RACGP / Therapeutic Guidelines)",
    shortLabel: "Australia",
    guidance:
      "Prioritize Australian guidance (RACGP Red Book, Therapeutic Guidelines, " +
      "Australian Medicines Handbook) and TGA-approved product information. " +
      "Use SI units and Australian conventions (PBS listings where relevant).",
    preferredSources: ["RACGP", "Therapeutic Guidelines (eTG)", "AMH", "TGA PI"],
  },
  NZ: {
    id: "NZ",
    label: "New Zealand (bpacnz / NZ Formulary)",
    shortLabel: "New Zealand",
    guidance:
      "Prioritize New Zealand guidance (bpacnz, Ministry of Health NZ) and the " +
      "New Zealand Formulary; Medsafe data sheets for medicines. Use SI units " +
      "and note PHARMAC funding constraints where relevant.",
    preferredSources: ["bpacnz", "NZ Formulary", "Medsafe", "Ministry of Health NZ"],
  },
  IE: {
    id: "IE",
    label: "Ireland (HSE / NCEC)",
    shortLabel: "Ireland",
    guidance:
      "Prioritize Irish guidance (HSE, NCEC National Clinical Guidelines) and " +
      "HPRA-authorised SmPCs for medicines. NICE and UK sources are commonly " +
      "referenced in Irish practice — note when guidance is adopted from them.",
    preferredSources: ["HSE", "NCEC", "HPRA SmPC", "NICE (as referenced)"],
  },
  WHO: {
    id: "WHO",
    label: "World Health Organization",
    shortLabel: "WHO",
    guidance:
      "Prioritize WHO recommendations and essential-medicines framing, suitable " +
      "for resource-variable settings. Flag where local guidelines may differ.",
    preferredSources: ["WHO guidelines", "WHO Model List of Essential Medicines"],
  },
};

export function resolveFramework(
  pref: GuidelineFramework | undefined,
): FrameworkProfile {
  return FRAMEWORKS[pref ?? "US"] ?? FRAMEWORKS.US;
}
