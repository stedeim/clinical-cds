import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "@/app/api/summary/route";

// Route-handler tests for /api/summary in stub mode (no Supabase, no
// Anthropic key): demo clinician auto-verified, seeded case, extractive mock.

const SEEDED_ENCOUNTER = "demo-encounter-1";

function post(body: unknown): Promise<Response> {
  const req = new Request("http://localhost/api/summary", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req) as unknown as Promise<Response>;
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/summary", () => {
  it("400s on an invalid body", async () => {
    const res = await post({ encounterId: SEEDED_ENCOUNTER }); // no transcript
    expect(res.status).toBe(400);
  });

  it("404s when the encounter is not found", async () => {
    const res = await post({
      encounterId: "no-such-encounter",
      transcriptText: "PT: The cough started five days ago.",
    });
    expect(res.status).toBe(404);
  });

  it("200s with a grounded mock summary and the parsed transcript", async () => {
    const res = await post({
      encounterId: SEEDED_ENCOUNTER,
      transcriptText:
        "DR: Good morning, how are you?\nPT: The cough started five days ago, mostly at night.\nPT: No fever that I've noticed.",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.model).toBe("mock");
    expect(data.summary.keyPoints.length).toBeGreaterThan(0);
    expect(data.summary.pertinentNegatives.length).toBeGreaterThan(0);
    expect(Array.isArray(data.transcript)).toBe(true);
    // Greeting fluff must not survive.
    const all = JSON.stringify(data.summary);
    expect(all).not.toContain("Good morning");
  });
});
