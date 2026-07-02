import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCurrentClinician,
  requireVerifiedClinician,
  currentUserIdFromCookies,
  AuthError,
} from "@/lib/clinician";

// The verification gate in stub mode (no Supabase). This is the access-control
// seam the API routes lean on; the 403 "unverified" branch is only reachable
// with a real Supabase row, so it isn't covered here.

beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("clinician gate (stub mode)", () => {
  it("returns an auto-verified demo clinician for any auth id", async () => {
    const c = await getCurrentClinician("some-user");
    expect(c).not.toBeNull();
    expect(c?.isVerified).toBe(true);
    expect(c?.verificationStatus).toBe("verified");
  });

  it("returns null when there is no auth id", async () => {
    expect(await getCurrentClinician(undefined)).toBeNull();
  });

  it("requireVerifiedClinician resolves for a present id", async () => {
    const c = await requireVerifiedClinician("some-user");
    expect(c.id).toBe("some-user");
  });

  it("requireVerifiedClinician throws AuthError 401 with no id", async () => {
    await expect(requireVerifiedClinician(undefined)).rejects.toMatchObject({
      constructor: AuthError,
      status: 401,
    });
  });

  it("currentUserIdFromCookies returns the synthetic demo identity", async () => {
    expect(await currentUserIdFromCookies()).toBe("demo-clinician");
  });
});
