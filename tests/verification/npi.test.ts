import { describe, it, expect, afterEach, vi } from "vitest";
import { isValidNpiFormat, matchesName, verifyClinicianNpi } from "@/lib/verification/npi";

// Clinician verification against the NPPES registry. The invariant under
// test: auto-verification only ever says YES on a full match — every failure
// mode (typo, not found, org NPI, inactive, name mismatch, registry down)
// degrades to "pending" for manual review, never to auto-reject.

function mockRegistry(payload: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 503,
      json: async () => payload,
    })),
  );
}

function registryResult(overrides: Record<string, unknown> = {}) {
  return {
    result_count: 1,
    results: [
      {
        enumeration_type: "NPI-1",
        basic: { first_name: "Margaret", last_name: "Chen", credential: "MD", status: "A" },
        ...overrides,
      },
    ],
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("isValidNpiFormat", () => {
  it("accepts the CMS documentation example NPI (valid Luhn)", () => {
    expect(isValidNpiFormat("1234567893")).toBe(true);
  });

  it("rejects checksum failures, wrong lengths, and non-digits", () => {
    expect(isValidNpiFormat("1234567890")).toBe(false); // bad check digit
    expect(isValidNpiFormat("123456789")).toBe(false);
    expect(isValidNpiFormat("12345678931")).toBe(false);
    expect(isValidNpiFormat("12345678a3")).toBe(false);
    expect(isValidNpiFormat("")).toBe(false);
  });
});

describe("matchesName", () => {
  it("matches despite case, punctuation, and extra middle names", () => {
    expect(matchesName("Margaret", "Chen", "Margaret Chen")).toBe(true);
    expect(matchesName("Margaret", "Chen", "Dr. Margaret A. Chen")).toBe(true);
    expect(matchesName("MARGARET", "CHEN", "margaret chen")).toBe(true);
    expect(matchesName("Mary-Anne", "O'Brien", "Mary Anne O Brien")).toBe(true);
  });

  it("rejects a different person", () => {
    expect(matchesName("Margaret", "Chen", "John Chen")).toBe(false);
    expect(matchesName("Margaret", "Chen", "Margaret Smith")).toBe(false);
    expect(matchesName("", "", "Margaret Chen")).toBe(false);
  });
});

describe("verifyClinicianNpi", () => {
  const GOOD = { npi: "1234567893", fullName: "Margaret Chen" };

  it("verifies an active individual provider with a matching name", async () => {
    mockRegistry(registryResult());
    const d = await verifyClinicianNpi(GOOD);
    expect(d.verdict).toBe("verified");
  });

  it("pends on a checksum failure without calling the registry", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const d = await verifyClinicianNpi({ ...GOOD, npi: "1234567890" });
    expect(d.verdict).toBe("pending");
    expect(d.reason).toContain("checksum");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("pends when the NPI is not found", async () => {
    mockRegistry({ result_count: 0, results: [] });
    const d = await verifyClinicianNpi(GOOD);
    expect(d.verdict).toBe("pending");
    expect(d.reason).toContain("not found");
  });

  it("pends on an organizational NPI", async () => {
    mockRegistry(registryResult({ enumeration_type: "NPI-2" }));
    const d = await verifyClinicianNpi(GOOD);
    expect(d.verdict).toBe("pending");
    expect(d.reason).toContain("organization");
  });

  it("pends on an inactive provider", async () => {
    mockRegistry({
      result_count: 1,
      results: [
        { enumeration_type: "NPI-1", basic: { first_name: "Margaret", last_name: "Chen", status: "D" } },
      ],
    });
    const d = await verifyClinicianNpi(GOOD);
    expect(d.verdict).toBe("pending");
    expect(d.reason).toContain("not active");
  });

  it("pends on a name mismatch — manual review, never auto-reject", async () => {
    mockRegistry(registryResult());
    const d = await verifyClinicianNpi({ ...GOOD, fullName: "John Smith" });
    expect(d.verdict).toBe("pending");
    expect(d.reason).toContain("does not match");
  });

  it("pends when the registry is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const d = await verifyClinicianNpi(GOOD);
    expect(d.verdict).toBe("pending");
    expect(d.reason).toContain("unreachable");
  });
});
