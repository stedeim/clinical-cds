import { describe, it, expect } from "vitest";
import { surfaceRegionalPatterns } from "@/lib/regional/engine";
import { REGIONAL_PATTERNS } from "@/lib/regional/library";
import { FRAMEWORK_IDS } from "@/lib/guidelines";

// Regional patterns are region + condition matched, cited to a public
// dataset, and silent when we have no sourced entry — never a padded card.

const HTN = { code: "I10", label: "Essential hypertension" };

describe("surfaceRegionalPatterns", () => {
  it("matches by region and ICD prefix", () => {
    const us = surfaceRegionalPatterns([HTN], "US");
    expect(us).toHaveLength(1);
    expect(us[0].id).toBe("us-htn");

    const uk = surfaceRegionalPatterns([HTN], "UK_NICE");
    expect(uk[0].id).toBe("uk-htn");
  });

  it("regional divergence is real: UK card names ramipril, US card lisinopril", () => {
    const us = surfaceRegionalPatterns([HTN], "US")[0].bullets.join(" ");
    const uk = surfaceRegionalPatterns([HTN], "UK_NICE")[0].bullets.join(" ");
    expect(us.toLowerCase()).toContain("lisinopril");
    expect(uk.toLowerCase()).toContain("ramipril");
  });

  it("falls back to label keywords without a code", () => {
    const out = surfaceRegionalPatterns([{ label: "type 2 diabetes, uncontrolled" }], "US");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("us-dm2");
  });

  it("stays silent for regions or conditions without a sourced entry", () => {
    expect(surfaceRegionalPatterns([HTN], "WHO")).toHaveLength(0);
    expect(surfaceRegionalPatterns([HTN], "NZ")).toHaveLength(0);
    expect(surfaceRegionalPatterns([{ code: "S52.5", label: "Radius fracture" }], "US")).toHaveLength(0);
  });

  it("caps at two cards and dedupes", () => {
    const out = surfaceRegionalPatterns(
      [HTN, { code: "E11.9", label: "T2DM" }, { code: "E78.5", label: "Hyperlipidemia" }, HTN],
      "US",
    );
    expect(out.map((p) => p.id)).toEqual(["us-htn", "us-dm2"]);
  });
});

describe("library integrity", () => {
  it("every entry is cited, matchable, region-valid, and unique", () => {
    const ids = new Set<string>();
    for (const p of REGIONAL_PATTERNS) {
      expect(p.source, p.id).toMatch(/\d{4}/); // dataset vintage required
      expect(p.bullets.length, p.id).toBeGreaterThan(0);
      expect(p.codePrefixes.length + p.keywords.length, p.id).toBeGreaterThan(0);
      expect(FRAMEWORK_IDS).toContain(p.framework);
      expect(ids.has(p.id), p.id).toBe(false);
      ids.add(p.id);
    }
  });

  it("no entry fabricates a percentage — rank-based statements only until network data exists", () => {
    for (const p of REGIONAL_PATTERNS) {
      expect(p.bullets.join(" "), p.id).not.toMatch(/\d+\s*(%|percent)/i);
    }
  });
});
