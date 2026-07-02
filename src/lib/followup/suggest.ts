// Suggest follow-ups from the visit's own text.
//
// Deterministic regex extraction — no LLM. Scans plan/HPI fragments for a
// time horizon ("recheck K⁺/creatinine in 2 weeks", "follow-up 4 wks",
// "X-ray if no improvement in 3 weeks") and proposes a follow-up with a due
// offset. Suggestions are exactly that: the clinician confirms, edits, and
// picks recipients before anything is created.

export interface FollowUpSuggestion {
  action: string; // the source fragment, trimmed
  dueInDays: number;
}

const UNIT_DAYS: Record<string, number> = {
  day: 1,
  days: 1,
  week: 7,
  weeks: 7,
  wk: 7,
  wks: 7,
  month: 30,
  months: 30,
  mo: 30,
};

const HORIZON =
  /(?:(?:in|within)\s+|(?:follow[- ]?up|f\/u)\s+(?:in\s+)?)(\d{1,2})\s*(days?|weeks?|wks?|months?|mo)\b/i;

export function suggestFollowUps(textLines: string[]): FollowUpSuggestion[] {
  const out: FollowUpSuggestion[] = [];
  const seen = new Set<string>();

  for (const line of textLines) {
    // Split into sentence-ish fragments so one plan line can yield several.
    for (const fragment of line.split(/[.;]/)) {
      const text = fragment.trim();
      if (!text) continue;
      const m = text.match(HORIZON);
      if (!m) continue;
      const n = parseInt(m[1], 10);
      const perUnit = UNIT_DAYS[m[2].toLowerCase()];
      if (!n || !perUnit) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ action: text, dueInDays: n * perUnit });
    }
  }
  return out;
}
