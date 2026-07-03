import { describe, it, expect, beforeEach } from "vitest";
import { dueStatus } from "@/lib/followup/due";
import { createFollowUp, listOpenFollowUps, setFollowUpStatus, _resetFollowUps } from "@/lib/followup/store";

// Due-status boundaries: an item is overdue strictly AFTER its due day ends
// (due-today is "due soon", not overdue), and the dashboard feed contains
// only open (pending/sent) items.

describe("dueStatus", () => {
  it("is not overdue on the due day itself", () => {
    expect(dueStatus("2026-07-02", new Date("2026-07-02T22:00:00Z"))).toBe("due_soon");
  });

  it("is overdue the day after", () => {
    expect(dueStatus("2026-07-02", new Date("2026-07-03T00:00:01Z"))).toBe("overdue");
  });

  it("is due_soon inside the 7-day window, upcoming beyond it", () => {
    expect(dueStatus("2026-07-08", new Date("2026-07-02T12:00:00Z"))).toBe("due_soon");
    expect(dueStatus("2026-07-20", new Date("2026-07-02T12:00:00Z"))).toBe("upcoming");
  });
});

describe("listOpenFollowUps", () => {
  beforeEach(() => _resetFollowUps());

  const INPUT = {
    encounterId: "demo-encounter-1",
    action: "Recheck labs",
    dueAt: "2026-07-10",
    recipients: ["patient"] as ["patient"],
  };

  it("returns pending and sent items, drops completed/cancelled, sorted by due date", () => {
    const a = createFollowUp({ ...INPUT, dueAt: "2026-07-20" }, "clin-a");
    const b = createFollowUp({ ...INPUT, dueAt: "2026-07-05" }, "clin-a");
    const c = createFollowUp({ ...INPUT, dueAt: "2026-07-01" }, "clin-a");
    setFollowUpStatus(a.id, "clin-a", "sent");
    setFollowUpStatus(c.id, "clin-a", "completed");
    createFollowUp(INPUT, "clin-b"); // someone else's

    const open = listOpenFollowUps("clin-a");
    expect(open.map((f) => f.id)).toEqual([b.id, a.id]);
  });
});
