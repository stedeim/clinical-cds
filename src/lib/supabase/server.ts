// Server-side Supabase clients.
//
// `createServiceClient` is for Route Handlers / Server Components that must bypass
// RLS to read/write clinical data on behalf of the authenticated user. It must
// ONLY run in server code and NEVER be sent to the browser.
//
// `createUserClientFromRequest` builds a request-scoped client from cookies; it
// sees exactly what the signed-in user sees (RLS-enforced). We use it to get the
// current session in /api/query and gate CDS output behind verification status.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export type { SupabaseClient };

// ---------------------------------------------------------------------------
// Service role client (server-only; bypasses RLS)
// ---------------------------------------------------------------------------
export function createServiceClient(): SupabaseClient {
  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingSupabaseConfigError(`${name} is not set`);
  return value;
}

export class MissingSupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingSupabaseConfigError";
  }
}

// ---------------------------------------------------------------------------
// Request-scoped user client (RLS-respecting, cookie-backed)
// ---------------------------------------------------------------------------
export async function createUserClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new MissingSupabaseConfigError("Supabase URL or anon key missing.");
  }
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set(name, "", { ...options, maxAge: 0 });
      },
    },
  });
}

// Convenience for Route Handlers: returns session + user or null, plus the client.
export async function getSessionFromRequest(_req: NextRequest) {
  const supabase = await createUserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { supabase, session };
}

// Legacy overload kept for inline use in Server Components where `request` is
// unavailable (uses `cookies()` directly).
export async function createUserClientFromCookies() {
  return createUserClient();
}
