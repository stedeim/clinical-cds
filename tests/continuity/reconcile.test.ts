import { describe, it, expect } from "vitest";
import { reconcileMedications, vitalsTrends } from "@/lib/continuity/reconcile";

describe("reconcileMedications", () => {
  it("detects started, stopped, and dose-changed meds", () => {
    const previous = [
      { name: "Lisinopril", dose: "10 mg", frequency: "daily" },
      { name: "Metformin", dose: "500 mg", frequency: "BID" },
    ];
    const current = [
      { name: "Lisinopril", dose: "20 mg", frequency: "daily" }, // changed
      { name: "Atorvastatin", dose: "20 mg" }, // started
      // Metformin stopped
    ];
    const r = reconcileMedications(current, previous);
    expect(r.started.map((m) => m.name)).toEqual(["Atorvastatin"]);
    expect(r.stopped.map((m) => m.name)).toEqual(["Metformin"]);
    expect(r.changed).toEqual([{ name: "Lisinopril", from: "10 mg daily", to: "20 mg daily" }]);
  });

  it("matches brand to generic through the dose-rule ingredient (Zestril = lisinopril)", () => {
    const r = reconcileMedications(
      [{ name: "Lisinopril (Oral Pill)", dose: "10 mg" }],
      [{ name: "Zestril", dose: "10 mg" }],
    );
    expect(r.started).toHaveLength(0);
    expect(r.stopped).toHaveLength(0);
    expect(r.changed).toHaveLength(0); // same drug, same dose
  });

  it("reports nothing when the lists match", () => {
    const meds = [{ name: "Lisinopril", dose: "10 mg", frequency: "daily" }];
    const r = reconcileMedications(meds, meds);
    expect(r.started.length + r.stopped.length + r.changed.length).toBe(0);
  });
});

describe("vitalsTrends", () => {
  it("splits BP into systolic/diastolic series, oldest first", () => {
    const trends = vitalsTrends([
      { date: "2026-07-01", vitals: [{ name: "BP", value: "152/94", unit: "mmHg" }] },
      { date: "2026-05-01", vitals: [{ name: "BP", value: "128/82", unit: "mmHg" }] },
    ]);
    const sys = trends.find((t) => t.name === "BP (systolic)")!;
    expect(sys.points.map((p) => p.value)).toEqual([128, 152]); // sorted by date
    const dia = trends.find((t) => t.name === "BP (diastolic)")!;
    expect(dia.points.map((p) => p.value)).toEqual([82, 94]);
  });

  it("requires two points for a trend; skips non-numeric values", () => {
    const trends = vitalsTrends([
      { date: "2026-07-01", vitals: [{ name: "HR", value: "74" }, { name: "Temp", value: "afebrile" }] },
      { date: "2026-05-01", vitals: [{ name: "HR", value: "88" }] },
    ]);
    expect(trends.map((t) => t.name)).toEqual(["HR"]);
    expect(trends[0].points.map((p) => p.value)).toEqual([88, 74]);
  });
});
