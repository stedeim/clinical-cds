import type { GuidelineFramework, Problem } from "../types";
import { REGIONAL_PATTERNS, type RegionalPattern } from "./library";

// Match the encounter's problems + detected region against the regional
// prescribing-pattern library. Same contract as the cheat-sheet engine: pure,
// deterministic, code prefix first, keyword fallback, capped, silent when
// there's no sourced entry for this region/condition.

const MAX_CARDS = 2;

export function surfaceRegionalPatterns(
  problems: Problem[],
  framework: GuidelineFramework,
): RegionalPattern[] {
  const regional = REGIONAL_PATTERNS.filter((p) => p.framework === framework);
  if (regional.length === 0) return [];

  const out: RegionalPattern[] = [];
  for (const problem of problems) {
    const match = matchProblem(problem, regional);
    if (match && !out.some((p) => p.id === match.id)) out.push(match);
    if (out.length >= MAX_CARDS) break;
  }
  return out;
}

function matchProblem(problem: Problem, patterns: RegionalPattern[]): RegionalPattern | null {
  const code = problem.code?.toUpperCase().trim();
  if (code) {
    for (const p of patterns) {
      if (p.codePrefixes.some((prefix) => code.startsWith(prefix.toUpperCase()))) return p;
    }
  }
  const label = problem.label.toLowerCase();
  for (const p of patterns) {
    if (p.keywords.some((k) => label.includes(k))) return p;
  }
  return null;
}
