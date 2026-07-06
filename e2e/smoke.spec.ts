import { test, expect } from "@playwright/test";

// Demo-critical behaviors, end to end in a real browser. Free-text entry
// paths only (no dependency on external autocomplete APIs) so the suite is
// deterministic and offline-safe.

test("home page renders the case list", async ({ page }) => {
  await page.goto("/");
  // Signed in: a time-of-day greeting with the doctor's name; otherwise "Your cases".
  await expect(
    page.getByRole("heading", { name: /Good (morning|afternoon|evening), Dr\.|Your cases/ }),
  ).toBeVisible();
  await expect(page.getByText("Persistent dry cough")).toBeVisible();
  // The seeded demo patient's display name.
  await expect(page.getByText("Margaret Chen")).toBeVisible();
});

test("seeded demo case renders the encounter with its moats", async ({ page }) => {
  await page.goto("/cases/demo-encounter-1");
  await expect(page.getByText("Visit Note")).toBeVisible();
  // Blank-exam honesty affordance.
  await expect(page.getByText("leaves the exam blank")).toBeVisible();
  // Auto-surfaced guideline card for the seeded hypertension problem.
  await expect(page.getByText("First-line management").first()).toBeVisible();
  // The demo case's lisinopril 10 mg must NOT raise a dose flag.
  await expect(page.getByText("Dose check ·")).toHaveCount(0);
});

test("create case → bad dose fires the flag → revise resolves it", async ({ page }) => {
  await page.goto("/cases/new");

  await page.getByLabel("Age").fill("58");
  await page.getByLabel("Chief complaint").fill("HTN follow-up e2e");
  // Free-text problem + med (Enter path — no external API).
  await page.getByPlaceholder(/Search ICD-10/).fill("Essential hypertension");
  await page.getByPlaceholder(/Search ICD-10/).press("Enter");
  await page.getByPlaceholder(/Search drugs/).fill("Lisinopril 200 mg daily");
  await page.getByPlaceholder(/Search drugs/).press("Enter");
  await page.getByRole("button", { name: "Create case" }).click();

  await page.getByRole("link", { name: "Open case →" }).click();

  // The dose flag fires with its citation…
  await expect(page.getByText("Dose check · Lisinopril")).toBeVisible();
  await expect(page.getByText("above the reference maximum")).toBeVisible();

  // …and the clinician's revision resolves it honestly. (Click-until-effect:
  // on a cold compile the first click can land before React hydrates.)
  await expect(async () => {
    await page.getByRole("button", { name: "Revise dose…" }).click();
    await expect(page.getByPlaceholder("e.g. 20 mg")).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await page.getByPlaceholder("e.g. 20 mg").fill("20 mg");
  await page.getByRole("button", { name: "Save & re-check" }).click();
  await expect(page.getByText("within the reference maximum")).toBeVisible();
  await expect(page.getByText("✓ dose reviewed")).toBeVisible();
});

test("transcript grounding produces spoken spans and the summary cuts fluff", async ({ page }) => {
  await page.goto("/cases/demo-encounter-1");

  await page.getByRole("button", { name: "+ Add transcript" }).click();
  await page.getByRole("button", { name: "use sample" }).click();
  await page.getByRole("button", { name: "Ground note", exact: true }).click();

  // Grounded transcript panel with speaker labels.
  await expect(page.getByText("Grounded in 4 transcript lines")).toBeVisible();
  // Spoken span from the sample lands in the note.
  await expect(page.getByText("cough started about five days ago").first()).toBeVisible();

  // Summarize: pertinent negatives extracted, greeting-style fluff absent.
  await page.getByRole("button", { name: /Summarize — skip the fluff/ }).click();
  await expect(page.getByText("Visit summary")).toBeVisible();
  await expect(page.getByText("Pertinent negatives")).toBeVisible();
});

test("sign locks the note and addendum appends", async ({ page }) => {
  await page.goto("/cases/demo-encounter-1");

  await expect(page.getByRole("button", { name: "edit" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Sign note" }).click();

  // Locked: edit affordances gone, addendum offered.
  await expect(page.getByRole("button", { name: "edit" })).toHaveCount(0);
  await page.getByRole("button", { name: "+ Addendum" }).click();
  await page.getByPlaceholder(/Lab results returned/).fill("Post-signing addendum from e2e.");
  await page.getByRole("button", { name: "Add addendum", exact: true }).click();
  await expect(page.getByText("Post-signing addendum from e2e.")).toBeVisible();
  // With an addendum on record, unsign is no longer offered.
  await expect(page.getByRole("button", { name: /unsign/ })).toHaveCount(0);
});
