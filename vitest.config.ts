import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest config for the unit/contract suite.
//
// `environment: "node"` — everything under test is pure server logic (engines,
// schemas, parsers, route handlers). No jsdom needed; the React client islands
// aren't unit-tested here.
//
// The `@/` alias mirrors tsconfig.json paths so specs can import route handlers
// (which use `@/lib/...`) the same way the app does.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Deterministic by default: no network. Any test that needs fetch stubs it
    // explicitly (see dosecheck rxnorm spec).
    globals: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
