import { describe, it, expect, vi, afterEach } from "vitest";
import { parseDoseToMg, parseFrequencyPerDay, checkDoses } from "@/lib/dosecheck/engine";
import type { Medication } from "@/lib/types";

describe("parseDoseToMg", () => {
  it("reads mg values", () => {
    expect(parseDoseToMg("10 mg")).toBe(10);
    expect(parseDoseToMg("200mg")).toBe(200);
  });

  it("converts g and mcg to mg", () => {
    expect(parseDoseToMg("0.5 g")).toBe(500);
    expect(parseDoseToMg("50 mcg")).toBeCloseTo(0.05, 6);
    expect(parseDoseToMg("50 micrograms")).toBeCloseTo(0.05, 6);
  });

  it("assumes mg for a bare number", () => {
    expect(parseDoseToMg("10")).toBe(10);
  });

  it("returns null when no dose can be read", () => {
    expect(parseDoseToMg(undefined)).toBeNull();
    expect(parseDoseToMg("")).toBeNull();
    expect(parseDoseToMg("as directed")).toBeNull();
  });
});

describe("parseFrequencyPerDay", () => {
  it("defaults to once daily for blank/unknown frequency", () => {
    expect(parseFrequencyPerDay(undefined)).toBe(1);
    expect(parseFrequencyPerDay("")).toBe(1);
    expect(parseFrequencyPerDay("with meals")).toBe(1);
  });

  it("reads latin dosing abbreviations", () => {
    expect(parseFrequencyPerDay("bid")).toBe(2);
    expect(parseFrequencyPerDay("TID")).toBe(3);
    expect(parseFrequencyPerDay("qid")).toBe(4);
    expect(parseFrequencyPerDay("once daily")).toBe(1);
    expect(parseFrequencyPerDay("qod")).toBe(0.5);
  });

  it("reads explicit qNh / every-N-hours intervals", () => {
    expect(parseFrequencyPerDay("q8h")).toBe(3);
    expect(parseFrequencyPerDay("every 6 hours")).toBe(4);
  });

  it("reads weekly dosing", () => {
    expect(parseFrequencyPerDay("weekly")).toBeCloseTo(1 / 7, 6);
  });
});

describe("checkDoses", () => {
  it("returns one finding per med, in order", async () => {
    const meds: Medication[] = [
      { name: "Lisinopril", dose: "10 mg", frequency: "daily" },
      { name: "Amlodipine", dose: "5 mg", frequency: "daily" },
    ];
    const findings = await checkDoses(meds);
    expect(findings.map((f) => f.medication)).toEqual(["Lisinopril", "Amlodipine"]);
  });

  it("flags a well-under-ceiling dose as ok, with no citation (silence)", async () => {
    const [f] = await checkDoses([{ name: "Lisinopril", dose: "10 mg", frequency: "daily" }]);
    expect(f.status).toBe("ok");
    expect(f.parsedDoseMg).toBe(10);
    expect(f.ceilingMg).toBe(80);
    expect(f.citation).toBeNull();
  });

  it("flags an over-ceiling total daily dose as exceeds, WITH a citation", async () => {
    // Amlodipine ceiling is 10 mg/day; 10 mg BID = 20 mg/day.
    const [f] = await checkDoses([{ name: "Amlodipine", dose: "10 mg", frequency: "bid" }]);
    expect(f.status).toBe("exceeds");
    expect(f.parsedDoseMg).toBe(20);
    expect(f.citation).not.toBeNull();
    expect(f.citation?.source).toContain("FDA");
  });

  it("multiplies single dose by frequency for the daily total", async () => {
    // Lisinopril 30 mg BID = 60 mg/day, still under the 80 mg ceiling → ok.
    const [f] = await checkDoses([{ name: "Lisinopril", dose: "30 mg", frequency: "bid" }]);
    expect(f.parsedDoseMg).toBe(60);
    expect(f.status).toBe("ok");
  });

  it("returns unknown for a drug not in the table (never a guess)", async () => {
    const [f] = await checkDoses([{ name: "Ibuprofen", dose: "400 mg", frequency: "tid" }]);
    expect(f.status).toBe("unknown");
    expect(f.parsedDoseMg).toBeNull();
    expect(f.ceilingMg).toBeNull();
    expect(f.citation).toBeNull();
  });

  it("returns unparseable when the drug is known but the dose can't be read", async () => {
    const [f] = await checkDoses([{ name: "Lisinopril", dose: "as directed" }]);
    expect(f.status).toBe("unparseable");
    expect(f.parsedDoseMg).toBeNull();
    expect(f.ceilingMg).toBe(80);
    expect(f.citation).toBeNull();
  });
});

describe("checkDoses with RxNorm enrichment", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubRxNav() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("related")) {
          return {
            ok: true,
            json: async () => ({
              relatedGroup: { conceptGroup: [{ tty: "IN", conceptProperties: [{ name: "Lisinopril" }] }] },
            }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({ idGroup: { rxnormId: ["29046"] } }),
        } as Response;
      }),
    );
  }

  it("fills rxcui/ingredient additively without changing status or citation", async () => {
    stubRxNav();
    const [f] = await checkDoses([{ name: "Lisinopril", dose: "10 mg", frequency: "daily" }], { useRxNorm: true });
    expect(f.rxcui).toBe("29046");
    // status/citation unchanged by enrichment
    expect(f.status).toBe("ok");
    expect(f.citation).toBeNull();
    // curated ingredient wins; already "lisinopril" from the rules table
    expect(f.ingredient).toBe("lisinopril");
  });

  it("keeps the offline finding intact when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const [f] = await checkDoses([{ name: "Lisinopril", dose: "10 mg", frequency: "daily" }], { useRxNorm: true });
    expect(f.rxcui).toBeNull();
    expect(f.status).toBe("ok");
  });

  it("does not touch the network when useRxNorm is off", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await checkDoses([{ name: "Lisinopril", dose: "10 mg" }]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
