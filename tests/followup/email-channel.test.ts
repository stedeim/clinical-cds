import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { emailConfigured, emailChannel } from "@/lib/followup/email-channel";
import type { FollowUp } from "@/lib/followup/schema";

const FOLLOW_UP: FollowUp = {
  id: "fu-1",
  encounterId: "demo-encounter-1",
  clinicianId: "clin-a",
  action: "Recheck K+/creatinine",
  dueAt: "2026-07-16",
  recipients: ["patient", "clinician"],
  status: "pending",
  createdAt: "2026-07-13T00:00:00Z",
};

describe("emailConfigured", () => {
  const saved = { key: process.env.PAUBOX_API_KEY, domain: process.env.PAUBOX_DOMAIN };
  afterEach(() => {
    process.env.PAUBOX_API_KEY = saved.key;
    process.env.PAUBOX_DOMAIN = saved.domain;
  });

  it("requires both key and domain", () => {
    delete process.env.PAUBOX_API_KEY;
    delete process.env.PAUBOX_DOMAIN;
    expect(emailConfigured()).toBe(false);
    process.env.PAUBOX_API_KEY = "k";
    expect(emailConfigured()).toBe(false);
    process.env.PAUBOX_DOMAIN = "mail.example.com";
    expect(emailConfigured()).toBe(true);
  });
});

describe("emailChannel", () => {
  beforeEach(() => {
    process.env.PAUBOX_API_KEY = "test-key";
    process.env.PAUBOX_DOMAIN = "mail.example.com";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delivers to the clinician's email and is honest about the patient", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    const dispatch = await emailChannel("dr@clinic.test").send(FOLLOW_UP);
    expect(dispatch.delivered).toBe(true);
    expect(dispatch.channel).toBe("email");
    expect(dispatch.detail).toContain("dr@clinic.test");
    expect(dispatch.detail).toContain("no contact on file");
    // The provider call carries the clinician address, never a guessed one.
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.data.message.recipients).toEqual(["dr@clinic.test"]);
    // Subject stays PHI-free.
    expect(body.data.message.headers.subject).not.toContain("K+");
  });

  it("does not call the provider for patient-only reminders", async () => {
    const dispatch = await emailChannel("dr@clinic.test").send({
      ...FOLLOW_UP,
      recipients: ["patient"],
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(dispatch.delivered).toBe(false);
    expect(dispatch.detail).toContain("no message sent");
  });

  it("reports delivered=false when the provider rejects", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 422 }));
    const dispatch = await emailChannel("dr@clinic.test").send(FOLLOW_UP);
    expect(dispatch.delivered).toBe(false);
    expect(dispatch.detail).toContain("rejected");
  });

  it("reports delivered=false when the provider is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));
    const dispatch = await emailChannel("dr@clinic.test").send(FOLLOW_UP);
    expect(dispatch.delivered).toBe(false);
    expect(dispatch.detail).toContain("couldn't be reached");
  });
});
