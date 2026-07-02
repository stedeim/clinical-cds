import { describe, it, expect } from "vitest";
import { suggestFollowUps } from "@/lib/followup/suggest";

// Deterministic extraction of follow-up candidates from visit text. These are
// suggestions the clinician confirms — the parser must find real horizons and
// stay silent on text without one.

describe("suggestFollowUps", () => {
  it("extracts an action with an 'in N weeks' horizon", () => {
    const out = suggestFollowUps(["Order BMP; recheck K+/creatinine in 2 weeks."]);
    expect(out).toHaveLength(1);
    expect(out[0].action).toContain("recheck K+/creatinine");
    expect(out[0].dueInDays).toBe(14);
  });

  it("understands follow-up phrasing and wk abbreviations", () => {
    const out = suggestFollowUps(["Knee: acetaminophen PRN. Follow-up 4 wks."]);
    expect(out).toHaveLength(1);
    expect(out[0].dueInDays).toBe(28);
  });

  it("handles days and months", () => {
    const out = suggestFollowUps(["Repeat BP check in 5 days", "Lipid panel within 3 months"]);
    expect(out.map((s) => s.dueInDays)).toEqual([5, 90]);
  });

  it("yields multiple suggestions from one line, deduped", () => {
    const out = suggestFollowUps([
      "Recheck labs in 2 weeks; X-ray if no improvement in 3 weeks.",
      "Recheck labs in 2 weeks.",
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].dueInDays).toBe(14);
    expect(out[1].dueInDays).toBe(21);
  });

  it("stays silent on text without a time horizon", () => {
    expect(suggestFollowUps(["Increase lisinopril to 20 mg daily.", "BP 128/82"])).toHaveLength(0);
    expect(suggestFollowUps([])).toHaveLength(0);
  });
});
