import { defineConfig } from "@playwright/test";

// E2E smoke suite — locks the demo-critical behaviors so future changes
// can't silently break them. Runs against a dedicated dev server on :3100
// (never fights a dev server already running on :3000) using the system
// Chrome channel — no browser download needed.

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3100",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    // Force stub mode even when .env.local configures Supabase: shell env
    // takes precedence over .env files in Next, and empty values read as
    // unconfigured. The smoke suite is deterministic and offline by design.
    command: "NEXT_PUBLIC_SUPABASE_URL= SUPABASE_SERVICE_ROLE_KEY= NEXT_PUBLIC_SUPABASE_ANON_KEY= ANTHROPIC_API_KEY= npx next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
