import { describe, it, expect } from "vitest";
import { reviseDose, isFlagging } from "@/lib/dosecheck/decisions";
import type { Medication } from "@/lib/types";

// The revise path is the honest half of the accept/reject flow: the clinician
// enters a dose in their own words and the SAME offline check re-runs against
// it. The flag clears only when the revised dose is genuinely within the cited
// ceiling — never because a button was clicked.

const lisinopril200: Medication = { name: "Lisinopril", dose: "200 mg", frequency: "daily" };

describe("reviseDose", () => {
  it("clears the flag when the revised dose is within the reference ceiling", async () => {
    const refreshed = await reviseDose(lisinopril200, "20 mg");
    expect(refreshed.status).toBe("ok");
    expect(refreshed.parsedDoseMg).toBe(20);
    expect(isFlagging(refreshed)).toBe(false);
  });

  it("keeps flagging when the revised dose still exceeds the ceiling", async () => {
    const refreshed = await reviseDose(lisinopril200, "100 mg");
    expect(refreshed.status).toBe("exceeds");
    expect(isFlagging(refreshed)).toBe(true);
    // A flag must stay cited even through revision — schema contract.
    expect(refreshed.citation).not.toBeNull();
  });

  it("is honest about an unparseable revision — unknown beats a guess", async () => {
    const refreshed = await reviseDose(lisinopril200, "a smaller dose");
    expect(refreshed.status).toBe("unparseable");
    expect(isFlagging(refreshed)).toBe(false);
  });

  it("respects the original frequency when re-checking", async () => {
    const bid: Medication = { name: "Lisinopril", dose: "200 mg", frequency: "BID" };
    // 50 mg BID = 100 mg/day > 80 ceiling — still flags.
    const refreshed = await reviseDose(bid, "50 mg");
    expect(refreshed.status).toBe("exceeds");
    expect(refreshed.parsedDoseMg).toBe(100);
  });
});
