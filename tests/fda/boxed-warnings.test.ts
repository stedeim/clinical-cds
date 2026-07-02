import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkBoxedWarnings,
  parseLabelResponse,
  queryTermFor,
  _resetBoxedWarningCache,
} from "@/lib/fda/boxed-warnings";

// Boxed-warning flags from openFDA. The honesty invariant under test: a
// positive flag requires a confirmed boxed_warning field on the label; every
// other outcome (no field, 404, network failure) yields no-claim states that
// the UI renders as silence — never as "checked and clear".

function labelPayload(boxed?: string[]) {
  return { results: [boxed ? { boxed_warning: boxed } : {}] };
}

beforeEach(() => _resetBoxedWarningCache());
afterEach(() => vi.unstubAllGlobals());

describe("queryTermFor", () => {
  it("uses the curated ingredient when the dose rules know the drug", () => {
    expect(queryTermFor({ name: "Zestril 10 mg" })).toBe("lisinopril");
  });

  it("falls back to the first word, lowercased, RxTerms-style names included", () => {
    expect(queryTermFor({ name: "Semaglutide (Injectable)" })).toBe("semaglutide");
  });
});

describe("parseLabelResponse", () => {
  it("extracts and truncates a boxed warning", () => {
    const long = "WARNING: FETAL TOXICITY " + "x".repeat(500);
    const r = parseLabelResponse("lisinopril", labelPayload([long]));
    expect(r.hasBoxedWarning).toBe(true);
    expect(r.summary!.length).toBeLessThanOrEqual(401);
    expect(r.summary).toContain("FETAL TOXICITY");
  });

  it("reports a definitive absence when the label has no boxed_warning", () => {
    const r = parseLabelResponse("amlodipine", labelPayload());
    expect(r).toEqual({ ingredient: "amlodipine", hasBoxedWarning: false, summary: null });
  });
});

describe("checkBoxedWarnings", () => {
  it("flags confirmed warnings and stays silent on unknowns", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("LISINOPRIL")) {
          return { ok: true, status: 200, json: async () => labelPayload(["WARNING: FETAL TOXICITY …"]) };
        }
        return { ok: false, status: 404, json: async () => ({}) };
      }),
    );
    const [lisinopril, mystery] = await checkBoxedWarnings([
      { name: "Lisinopril", dose: "10 mg" },
      { name: "Mysterydrug" },
    ]);
    expect(lisinopril?.hasBoxedWarning).toBe(true);
    expect(mystery).toBeNull(); // unknown → no claim
  });

  it("degrades to null (no claim) on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const [r] = await checkBoxedWarnings([{ name: "Lisinopril" }]);
    expect(r).toBeNull();
  });

  it("caches by ingredient — one fetch for repeated meds across calls", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => labelPayload(["WARNING …"]),
    }));
    vi.stubGlobal("fetch", fetchSpy);
    await checkBoxedWarnings([{ name: "Lisinopril 10 mg" }]);
    await checkBoxedWarnings([{ name: "Zestril" }]); // same ingredient via dose rules
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
