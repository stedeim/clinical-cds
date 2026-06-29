// Browser-safe Supabase client. Used in Client Components for auth and lightweight
// reads. Heavier clinical reads still happen server-side from Route Handlers / SC.
import { createBrowserClient } from "@supabase/ssr";

// @supabase/ssr is required for cookie auth; it is installed below.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new MissingSupabaseConfigError("Supabase URL or anon key missing.");
  }
  return createBrowserClient(url, key);
}

export class MissingSupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingSupabaseConfigError";
  }
}
