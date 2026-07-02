import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "@/app/api/note/route";

// Route-handler tests for /api/note, exercised in stub mode (no Supabase, no
// Anthropic key) so they're deterministic and offline: the demo clinician is
// auto-verified, the memory store serves the seeded case, and the note engine
// returns the deterministic mock.

const SEEDED_ENCOUNTER = "demo-encounter-1";

function post(body: unknown): Promise<Response> {
  const req = new Request("http://localhost/api/note", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req) as unknown as Promise<Response>;
}

beforeEach(() => {
  // Force stub mode regardless of the developer's shell env.
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/note", () => {
  it("400s on an invalid body", async () => {
    const res = await post({ transcriptText: "PT: hi" }); // missing encounterId
    expect(res.status).toBe(400);
  });

  it("404s when the encounter is not found", async () => {
    const res = await post({ encounterId: "no-such-encounter" });
    expect(res.status).toBe(404);
  });

  it("200s with a chart-only mock note when no transcript is supplied", async () => {
    const res = await post({ encounterId: SEEDED_ENCOUNTER });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.note.model).toBe("mock");
    expect(json.note.encounterId).toBe(SEEDED_ENCOUNTER);
    expect(json.note.transcriptId).toBeNull();
    expect(json.transcript).toEqual([]);
  });

  it("200s and grounds spoken spans when a transcript is pasted", async () => {
    const res = await post({
      encounterId: SEEDED_ENCOUNTER,
      transcriptText: "PT: I've had a headache.\nDR: For how long?",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.transcript).toHaveLength(2);
    expect(json.note.transcriptId).toBe("pasted");
    const spoken = json.note.sections
      .flatMap((s: { spans: { provenance: string }[] }) => s.spans)
      .filter((sp: { provenance: string }) => sp.provenance === "spoken");
    expect(spoken.length).toBe(2);
  });
});
