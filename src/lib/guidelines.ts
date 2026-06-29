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
  // Injected into the system prompt to steer sourcing + terminology.
  guidance: string;
  // Preferred primary sources, surfaced to the model for citation grounding.
  preferredSources: string[];
}

export const FRAMEWORKS: Record<GuidelineFramework, FrameworkProfile> = {
  US: {
    id: "US",
    label: "United States (specialty society guidelines)",
    guidance:
      "Prioritize US specialty society guidance (e.g., ACP, AHA/ACC, IDSA, USPSTF) " +
      "and FDA drug labeling. Use US units and brand/generic conventions.",
    preferredSources: ["USPSTF", "ACP", "AHA/ACC", "IDSA", "FDA label"],
  },
  UK_NICE: {
    id: "UK_NICE",
    label: "United Kingdom (NICE)",
    guidance:
      "Prioritize NICE guidelines and the BNF for medicines. Use UK terminology " +
      "and SI units where NICE does. Note where NICE diverges from US practice.",
    preferredSources: ["NICE", "BNF", "SIGN"],
  },
  WHO: {
    id: "WHO",
    label: "World Health Organization",
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
