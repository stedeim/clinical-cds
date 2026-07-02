import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "@/app/api/query/route";

// Route-handler tests for /api/query in stub mode (no Supabase, no Anthropic
// key): demo clinician auto-verified, memory store serves the seeded case, CDS
// engine returns its deterministic mock.

const SEEDED_ENCOUNTER = "demo-encounter-1";

function post(body: unknown): Promise<Response> {
  const req = new Request("http://localhost/api/query", {
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

describe("POST /api/query", () => {
  it("400s when the question is too short", async () => {
    const res = await post({ encounterId: SEEDED_ENCOUNTER, question: "hi" });
    expect(res.status).toBe(400);
  });

  it("400s when encounterId is missing", async () => {
    const res = await post({ question: "What is the blood pressure trend?" });
    expect(res.status).toBe(400);
  });

  it("404s when the encounter is not found", async () => {
    const res = await post({ encounterId: "no-such-encounter", question: "Any concerns to review?" });
    expect(res.status).toBe(404);
  });

  it("200s with a structured response and model for a valid query", async () => {
    const res = await post({ encounterId: SEEDED_ENCOUNTER, question: "Any concerns to review for this visit?" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.model).toBeTruthy();
    expect(json.response).toBeTruthy();
  });
});
