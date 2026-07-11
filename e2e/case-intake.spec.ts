import { test, expect } from "@playwright/test";

// The intake happy path — an authenticated clinician (stub mode, so
// getServerUser returns a verified demo clinician automatically) fills the
// minimum required fields and lands directly in the encounter view for the
// case they just created.
//
// This complements the broader dose-check flow in smoke.spec.ts by focusing
// on the intake contract itself: submit → 201 → router.push → encounter.

test("intake form redirects into the new encounter on success", async ({ page }) => {
  await page.goto("/cases/new");

  await page.getByLabel("Chief complaint").fill("Sore throat, 3 days");
  await page.getByLabel("Age").fill("34");
  await page.getByRole("button", { name: "Create case" }).click();

  // The router.push resolves to /cases/<uuid> — assert the URL first, then
  // the encounter view chrome (Visit Note is the tell that EncounterView
  // rendered).
  await page.waitForURL(/\/cases\/[^/]+$/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/cases\/new$/);
  await expect(page.getByText("Visit Note")).toBeVisible();
  // The new case's chief complaint is now the topbar subtitle.
  await expect(page.getByText("Sore throat, 3 days").first()).toBeVisible();
});

test("intake form blocks submission when chief complaint is missing", async ({ page }) => {
  await page.goto("/cases/new");

  // Only fill non-required fields, then click Create.
  await page.getByLabel("Age").fill("40");
  await page.getByRole("button", { name: "Create case" }).click();

  // We stay on /cases/new (either browser-native required tripped or our
  // client-side Zod check fired). No navigation to /cases/<id>.
  await expect(page).toHaveURL(/\/cases\/new$/);
});
