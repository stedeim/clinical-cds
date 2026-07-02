import type { Problem } from "../types";
import { CHEAT_SHEETS, type CheatSheet } from "./library";

// Match the encounter's problem list against the curated library.
//
// Pure and deterministic: ICD-10 code prefix first (the strong signal), label
// keyword as fallback. Deduped by topic, capped so the panel never floods —
// the two most chart-relevant cards beat six generic ones. Problems with no
// library entry surface nothing.

const MAX_CARDS = 2;

export function surfaceCheatSheets(problems: Problem[]): CheatSheet[] {
  const out: CheatSheet[] = [];
  for (const problem of problems) {
    const sheet = matchProblem(problem);
    if (sheet && !out.some((s) => s.id === sheet.id)) out.push(sheet);
    if (out.length >= MAX_CARDS) break;
  }
  return out;
}

function matchProblem(problem: Problem): CheatSheet | null {
  const code = problem.code?.toUpperCase().trim();
  if (code) {
    for (const sheet of CHEAT_SHEETS) {
      if (sheet.codePrefixes.some((p) => code.startsWith(p.toUpperCase()))) return sheet;
    }
  }
  const label = problem.label.toLowerCase();
  for (const sheet of CHEAT_SHEETS) {
    if (sheet.keywords.some((k) => label.includes(k))) return sheet;
  }
  return null;
}
