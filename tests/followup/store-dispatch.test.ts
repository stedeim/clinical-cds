import { describe, it, expect, beforeEach } from "vitest";
import { createFollowUp, listFollowUps, getFollowUp, _resetFollowUps } from "@/lib/followup/store";
import { dispatchReminder, stubChannel } from "@/lib/followup/dispatch";
import { FollowUpCreate } from "@/lib/followup/schema";

const INPUT = {
  encounterId: "demo-encounter-1",
  action: "Recheck K+/creatinine",
  dueAt: "2026-07-16",
  recipients: ["patient", "clinician"] as ("patient" | "clinician")[],
};

describe("follow-up store", () => {
  beforeEach(() => _resetFollowUps());

  it("creates and lists follow-ups scoped to the clinician", () => {
    const created = createFollowUp(INPUT, "clin-a");
    expect(created.status).toBe("pending");
    expect(listFollowUps("demo-encounter-1", "clin-a")).toHaveLength(1);
    // Another clinician cannot see or fetch it.
    expect(listFollowUps("demo-encounter-1", "clin-b")).toHaveLength(0);
    expect(getFollowUp(created.id, "clin-b")).toBeUndefined();
  });

  it("sorts the list by due date", () => {
    createFollowUp({ ...INPUT, dueAt: "2026-08-01" }, "clin-a");
    createFollowUp({ ...INPUT, dueAt: "2026-07-10" }, "clin-a");
    const due = listFollowUps("demo-encounter-1", "clin-a").map((f) => f.dueAt);
    expect(due).toEqual(["2026-07-10", "2026-08-01"]);
  });
});

describe("schema", () => {
  it("requires at least one recipient", () => {
    expect(FollowUpCreate.safeParse({ ...INPUT, recipients: [] }).success).toBe(false);
  });

  it("rejects unknown recipients and bad dates", () => {
    expect(FollowUpCreate.safeParse({ ...INPUT, recipients: ["spouse"] }).success).toBe(false);
    expect(FollowUpCreate.safeParse({ ...INPUT, dueAt: "not-a-date" }).success).toBe(false);
  });
});

describe("dispatchReminder (stub channel)", () => {
  beforeEach(() => _resetFollowUps());

  it("is honest: delivered=false, recipients preserved, follow-up marked sent", async () => {
    const f = createFollowUp(INPUT, "clin-a");
    const dispatch = await dispatchReminder(f, stubChannel);
    expect(dispatch.delivered).toBe(false);
    expect(dispatch.channel).toBe("stub");
    expect(dispatch.recipients).toEqual(["patient", "clinician"]);
    expect(dispatch.detail).toContain("no real message sent");
    expect(getFollowUp(f.id, "clin-a")?.status).toBe("sent");
  });
});
