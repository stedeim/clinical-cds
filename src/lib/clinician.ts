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
  // Clinic/practice letterhead for exported notes; null when not provided.
  clinicName: string | null;
  verificationStatus: DbClinician["verification_status"];
  primaryFramework: DbClinician["primary_framework"];
  isVerified: boolean;
  // Founding-beta grant: free access in exchange for an honest review.
  // Bypasses the paywall; never affects clinical verification.
  isBeta: boolean;
  role: "clinician" | "admin";
  // Billing cache, mirrored from Stripe by the webhook (see lib/billing).
  subscriptionStatus: DbClinician["subscription_status"];
  subscriptionPlan: DbClinician["subscription_plan"];
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

export async function getCurrentClinician(authUserId?: string): Promise<CurrentClinician | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Stub mode: allow a demo clinician so the app works without Supabase.
    if (authUserId) {
      return {
        id: authUserId,
        fullName: "Demo Clinician",
        credential: "MD",
        clinicName: null,
        verificationStatus: "verified",
        primaryFramework: "US",
        isVerified: true,
        isBeta: false,
        role: "clinician",
        subscriptionStatus: "none",
        subscriptionPlan: null,
        currentPeriodEnd: null,
        stripeCustomerId: null,
      };
    }
    return null;
  }

  if (!authUserId) return null;

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("clinicians")
      .select(
        "id, full_name, credential, clinic_name, verification_status, primary_framework, is_beta, role, subscription_status, subscription_plan, current_period_end, stripe_customer_id",
      )
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
      clinicName: data.clinic_name ?? null,
      verificationStatus: data.verification_status,
      primaryFramework: data.primary_framework,
      isVerified: data.verification_status === "verified",
      isBeta: data.is_beta === true,
      role: data.role === "admin" ? "admin" : "clinician",
      subscriptionStatus: data.subscription_status ?? "none",
      subscriptionPlan: data.subscription_plan ?? null,
      currentPeriodEnd: data.current_period_end ?? null,
      stripeCustomerId: data.stripe_customer_id ?? null,
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

// Verified AND entitled: the gate for everything that creates PHI or spends
// LLM tokens. Entitlement = founding beta, a live (trialing/active)
// subscription, or billing not being configured at all (dev/stub/CI — the
// paywall only exists where Stripe does). 402 signals the paywall to the
// client, distinct from the 403 verification gate.
export async function requireEntitledClinician(authUserId?: string): Promise<CurrentClinician> {
  const clinician = await requireVerifiedClinician(authUserId);
  const { hasActiveAccess } = await import("@/lib/billing/stripe");
  if (!hasActiveAccess(clinician)) {
    throw new AuthError("An active subscription (or trial) is required.", 402);
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
