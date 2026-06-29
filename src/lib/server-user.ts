// Server-only helpers for pages that need the current user identity.
//
// In stub mode this returns a synthetic user so pages render without keys. With
// Supabase configured it reads the cookie-backed session and returns the real
// user (or null if unauthenticated).

import { createUserClient, createServiceClient } from "./supabase/server";
import type { CurrentClinician } from "./clinician";

export interface ServerUser {
  id: string;
  email?: string;
}

export async function getServerUser(): Promise<ServerUser | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Stub mode: synthetic demo user.
    return { id: "demo-clinician", email: "demo@consilium.local" };
  }

  try {
    const supabase = await createUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export async function getCurrentClinicianFromSession(): Promise<CurrentClinician | null> {
  const user = await getServerUser();
  if (!user) return null;

  // Avoid a circular import by dynamically importing clinician.ts inside this helper.
  const { getCurrentClinician } = await import("./clinician");
  return getCurrentClinician(user.id);
}

// Role-only check helper; page code can use it for quick redirects.
export async function requireServerUser(): Promise<ServerUser> {
  const user = await getServerUser();
  if (!user) throw new NotAuthenticatedError();
  return user;
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "NotAuthenticatedError";
  }
}

// For server-side writes that bypass RLS.
export { createServiceClient };
