import { createServiceClient, MissingSupabaseConfigError, createUserClientFromCookies } from "./supabase/server";
import type { DbClinician } from "./db/types";

// Clinician verification gate. When Supabase is configured, the /api/query route
// checks the signed-in user's verification_status before returning CDS output.
// In stub mode (no Supabase) the gate is skipped and a demo-clinician pass-through
// is returned so the vertical slice stays runnable without keys.

export interface CurrentClinician {
  id: string;
  fullName: string;
  credential: string;
  verificationStatus: DbClinician["verification_status"];
  primaryFramework: DbClinician["primary_framework"];
  isVerified: boolean;
  // Founding-beta grant: free access in exchange for an honest review.
  // Bypasses the (future) paywall; never affects clinical verification.
  isBeta: boolean;
}

export async function getCurrentClinician(authUserId?: string): Promise<CurrentClinician | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Stub mode: allow a demo clinician so the app works without Supabase.
    if (authUserId) {
      return {
        id: authUserId,
        fullName: "Demo Clinician",
        credential: "MD",
        verificationStatus: "verified",
        primaryFramework: "US",
        isVerified: true,
        isBeta: false,
      };
    }
    return null;
  }

  if (!authUserId) return null;

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("clinicians")
      .select("id, full_name, credential, verification_status, primary_framework, is_beta")
      .eq("id", authUserId)
      .single();

    if (error || !data) {
      console.error("[clinician] failed to load clinician row:", error?.message ?? "not found");
      return null;
    }

    return {
      id: data.id,
      fullName: data.full_name,
      credential: data.credential,
      verificationStatus: data.verification_status,
      primaryFramework: data.primary_framework,
      isVerified: data.verification_status === "verified",
      isBeta: (data as { is_beta?: boolean }).is_beta === true,
    };
  } catch (err) {
    if (err instanceof MissingSupabaseConfigError) {
      console.error("[clinician] config error:", err.message);
    } else {
      console.error("[clinician] unexpected error:", err);
    }
    return null;
  }
}

export async function requireVerifiedClinician(authUserId?: string): Promise<CurrentClinician> {
  const clinician = await getCurrentClinician(authUserId);
  if (!clinician) {
    throw new AuthError("Not authenticated.", 401);
  }
  if (!clinician.isVerified) {
    throw new AuthError("Clinician account is not verified.", 403);
  }
  return clinician;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function currentUserIdFromCookies(): Promise<string | undefined> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Stub mode: same synthetic identity getServerUser() returns, so the query
    // path stays runnable (and verified) without any Supabase keys.
    return "demo-clinician";
  }
  try {
    const supabase = await createUserClientFromCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id;
  } catch {
    return undefined;
  }
}
