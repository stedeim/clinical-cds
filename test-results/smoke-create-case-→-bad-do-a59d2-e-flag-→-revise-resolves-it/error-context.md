# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> create case → bad dose fires the flag → revise resolves it
- Location: e2e/smoke.spec.ts:24:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.fill: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByPlaceholder('e.g. 20 mg')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "Pabaid" [ref=e4] [cursor=pointer]:
        - /url: /
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]: demo@pabaid.local
          - button "Sign out" [ref=e8] [cursor=pointer]
        - generic [ref=e9]: Decision support · not a diagnosis
  - main [ref=e10]:
    - generic [ref=e12]:
      - generic [ref=e13]:
        - link "Pabaid" [ref=e14] [cursor=pointer]:
          - /url: /
          - text: Pabaid
        - generic [ref=e16]:
          - generic [ref=e17]: 58 patient
          - generic [ref=e18]: ·
          - generic [ref=e19]: HTN follow-up e2e
        - generic [ref=e20]: Ambient scribe · soon
      - generic [ref=e22]:
        - complementary [ref=e23]:
          - generic [ref=e24]: Chart
          - generic [ref=e25]:
            - generic [ref=e26]: Problems
            - generic [ref=e28]: Essential hypertension
          - generic [ref=e29]:
            - generic [ref=e30]: Medications
            - 'generic "FDA BOXED WARNING (from the drug label, via openFDA): WARNING: FETAL TOXICITY See full prescribing information for complete boxed warning. When pregnancy is detected, discontinue lisinopril as soon as possible. ( 5.1 ) Drugs that act directly on the renin-angiotensin system can cause injury and death to the developing fetus. ( 5.1 ) WARNING: FETAL TOXICITY When pregnancy is detected, discontinue lisinopril as soon as possible [see WARNINGS AND PRECAU…" [ref=e32]': Lisinopril 200 mg⬛ BOXED
          - generic [ref=e33]:
            - generic [ref=e34]: Allergies
            - generic [ref=e35]: NKDA
          - generic [ref=e36]:
            - generic [ref=e37]: Vitals
            - generic [ref=e38]: None recorded
          - generic [ref=e39]:
            - generic [ref=e40]: Labs
            - generic [ref=e41]: None recorded
          - generic [ref=e42]:
            - generic [ref=e43]:
              - generic [ref=e44]: History documents
              - button "+ Upload" [ref=e45] [cursor=pointer]
            - generic [ref=e46]: Upload prior records as .txt, .docx, or .pdf — the text becomes part of this patient’s history.
          - generic [ref=e47]:
            - generic [ref=e48]: Visit transcript
            - generic [ref=e49]: Dictate with the mic (demo speech engine) or paste a transcript in the note — either grounds spoken lines. Hands-free ambient capture is coming.
        - generic [ref=e50]:
          - generic [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e53]: Visit Note
              - generic [ref=e54]:
                - generic [ref=e55]: From chart data
                - button "+ Add transcript" [ref=e56] [cursor=pointer]
            - generic [ref=e57]:
              - generic [ref=e58]: Subjective
              - button "edit" [ref=e59] [cursor=pointer]
            - paragraph [ref=e60]: "Chief complaint: HTN follow-up e2e"
            - generic [ref=e61]: Objective
            - generic [ref=e62]:
              - text: No exam findings were recorded this visit. Pabaid leaves the exam blank rather than inserting a normal template.
              - button "+ Add exam" [ref=e63] [cursor=pointer]
            - generic [ref=e64]:
              - generic [ref=e65]: Assessment
              - button "edit" [ref=e66] [cursor=pointer]
            - generic [ref=e69]: 1. Essential hypertension
            - generic [ref=e70]:
              - generic [ref=e71]: Plan
              - button "edit" [ref=e72] [cursor=pointer]
            - generic [ref=e74]:
              - generic [ref=e75]: Lisinopril 200 mg daily
              - generic "Lisinopril ~200 mg/day is above the reference maximum of 80 mg/day — consider confirming the intended dose. [Lisinopril — maximum daily dose — FDA label (DailyMed)]" [ref=e76]: ⚠ dose
            - generic [ref=e79]:
              - generic [ref=e80]: ⚠
              - generic [ref=e81]:
                - generic [ref=e82]: Dose check · Lisinopril
                - generic [ref=e83]: Lisinopril ~200 mg/day is above the reference maximum of 80 mg/day — consider confirming the intended dose.
                - generic [ref=e84]: Lisinopril — maximum daily dose — FDA label (DailyMed)
                - generic [ref=e85]:
                  - button "Revise dose…" [active] [ref=e86] [cursor=pointer]
                  - button "Keep as documented" [ref=e87] [cursor=pointer]
            - generic [ref=e88]:
              - button "Sign note" [ref=e89] [cursor=pointer]
              - button "Copy" [ref=e90] [cursor=pointer]
              - button "Download .txt" [ref=e91] [cursor=pointer]
              - button "Print / PDF" [ref=e92] [cursor=pointer]
              - generic [ref=e93]: Draft — not signed. Exported copies are watermarked DRAFT.
          - generic [ref=e94]:
            - generic [ref=e95]:
              - generic [ref=e96]: Follow-up reminders
              - generic [ref=e97]: you choose who gets reminded
            - generic [ref=e98]:
              - textbox "What needs to happen? e.g. Recheck K⁺/creatinine" [ref=e99]
              - generic [ref=e100]:
                - generic [ref=e101]:
                  - text: due
                  - textbox "due" [ref=e102]: 2026-07-17
                - generic [ref=e103]:
                  - generic [ref=e104]: "remind:"
                  - button "Patient" [pressed] [ref=e105] [cursor=pointer]
                  - button "Me" [pressed] [ref=e106] [cursor=pointer]
                  - button "My assistant" [ref=e107] [cursor=pointer]
                - button "Add follow-up" [disabled] [ref=e108]
        - generic [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]: Auto-surfaced · Hypertension
            - generic [ref=e113]: First-line management
            - list [ref=e114]:
              - listitem [ref=e115]: Thiazide, ACE-i / ARB, or CCB first-line (ACC/AHA 2017).
              - listitem [ref=e116]: Target <130/80 mmHg for most adults.
              - listitem [ref=e117]: Reassess 2–4 wks after a dose change; monitor K⁺/creatinine on ACE-i or ARB.
            - generic [ref=e118]:
              - generic [ref=e119]: ACC/AHA 2017
              - generic [ref=e120]: JNC8
              - generic [ref=e121]: cited from library
          - generic [ref=e122]:
            - generic [ref=e123]: Regional patterns · United States
            - generic [ref=e125]: Hypertension — what peers commonly prescribe
            - list [ref=e126]:
              - listitem [ref=e127]: Lisinopril and amlodipine are consistently among the most-dispensed antihypertensives in Medicare Part D.
              - listitem [ref=e128]: Losartan leads ARBs; hydrochlorothiazide remains the most common thiazide.
              - listitem [ref=e129]: Metoprolol is the most-dispensed beta blocker (often for co-existing indications).
            - generic [ref=e130]:
              - generic [ref=e131]: CMS Medicare Part D, 2023
              - generic [ref=e132]: descriptive — not a recommendation
          - generic [ref=e133]:
            - generic [ref=e134]: Ask about this patient
            - generic [ref=e136]:
              - generic [ref=e137]:
                - heading "Ask about this patient" [level=2] [ref=e138]
                - combobox "Guideline framework" [ref=e139]:
                  - option "US societies" [selected]
                  - option "UK NICE"
                  - option "Canada"
                  - option "Australia"
                  - option "New Zealand"
                  - option "Ireland"
                  - option "WHO"
              - textbox "e.g. Given this patient, what should I consider?" [ref=e140]
              - generic [ref=e141]:
                - button "What should I consider for this presentation?" [ref=e142] [cursor=pointer]
                - button "What workup is reasonable given these labs?" [ref=e143] [cursor=pointer]
                - button "Could a medication be contributing?" [ref=e144] [cursor=pointer]
              - button "Get considerations" [disabled] [ref=e146]
  - button "Open Next.js Dev Tools" [ref=e152] [cursor=pointer]:
    - img [ref=e153]
  - alert [ref=e156]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | // Demo-critical behaviors, end to end in a real browser. Free-text entry
  4  | // paths only (no dependency on external autocomplete APIs) so the suite is
  5  | // deterministic and offline-safe.
  6  | 
  7  | test("home page renders the case list", async ({ page }) => {
  8  |   await page.goto("/");
  9  |   await expect(page.getByRole("heading", { name: "Your cases" })).toBeVisible();
  10 |   await expect(page.getByText("Persistent dry cough")).toBeVisible();
  11 | });
  12 | 
  13 | test("seeded demo case renders the encounter with its moats", async ({ page }) => {
  14 |   await page.goto("/cases/demo-encounter-1");
  15 |   await expect(page.getByText("Visit Note")).toBeVisible();
  16 |   // Blank-exam honesty affordance.
  17 |   await expect(page.getByText("leaves the exam blank")).toBeVisible();
  18 |   // Auto-surfaced guideline card for the seeded hypertension problem.
  19 |   await expect(page.getByText("First-line management").first()).toBeVisible();
  20 |   // The demo case's lisinopril 10 mg must NOT raise a dose flag.
  21 |   await expect(page.getByText("Dose check ·")).toHaveCount(0);
  22 | });
  23 | 
  24 | test("create case → bad dose fires the flag → revise resolves it", async ({ page }) => {
  25 |   await page.goto("/cases/new");
  26 | 
  27 |   await page.getByRole("spinbutton").fill("58"); // age
  28 |   await page.getByRole("textbox").nth(1).fill("HTN follow-up e2e"); // chief complaint
  29 |   // Free-text problem + med (Enter path — no external API).
  30 |   await page.getByPlaceholder(/Search ICD-10/).fill("Essential hypertension");
  31 |   await page.getByPlaceholder(/Search ICD-10/).press("Enter");
  32 |   await page.getByPlaceholder(/Search drugs/).fill("Lisinopril 200 mg daily");
  33 |   await page.getByPlaceholder(/Search drugs/).press("Enter");
  34 |   await page.getByRole("button", { name: "Create case" }).click();
  35 | 
  36 |   await page.getByRole("link", { name: "Open case →" }).click();
  37 | 
  38 |   // The dose flag fires with its citation…
  39 |   await expect(page.getByText("Dose check · Lisinopril")).toBeVisible();
  40 |   await expect(page.getByText("above the reference maximum")).toBeVisible();
  41 | 
  42 |   // …and the clinician's revision resolves it honestly.
  43 |   await page.getByRole("button", { name: "Revise dose…" }).click();
> 44 |   await page.getByPlaceholder("e.g. 20 mg").fill("20 mg");
     |                                             ^ Error: locator.fill: Test timeout of 45000ms exceeded.
  45 |   await page.getByRole("button", { name: "Save & re-check" }).click();
  46 |   await expect(page.getByText("within the reference maximum")).toBeVisible();
  47 |   await expect(page.getByText("✓ dose reviewed")).toBeVisible();
  48 | });
  49 | 
  50 | test("transcript grounding produces spoken spans and the summary cuts fluff", async ({ page }) => {
  51 |   await page.goto("/cases/demo-encounter-1");
  52 | 
  53 |   await page.getByRole("button", { name: "+ Add transcript" }).click();
  54 |   await page.getByRole("button", { name: "use sample" }).click();
  55 |   await page.getByRole("button", { name: "Ground note", exact: true }).click();
  56 | 
  57 |   // Grounded transcript panel with speaker labels.
  58 |   await expect(page.getByText("Grounded in 4 transcript lines")).toBeVisible();
  59 |   // Spoken span from the sample lands in the note.
  60 |   await expect(page.getByText("cough started about five days ago").first()).toBeVisible();
  61 | 
  62 |   // Summarize: pertinent negatives extracted, greeting-style fluff absent.
  63 |   await page.getByRole("button", { name: /Summarize — skip the fluff/ }).click();
  64 |   await expect(page.getByText("Visit summary")).toBeVisible();
  65 |   await expect(page.getByText("Pertinent negatives")).toBeVisible();
  66 | });
  67 | 
  68 | test("sign locks the note and addendum appends", async ({ page }) => {
  69 |   await page.goto("/cases/demo-encounter-1");
  70 | 
  71 |   await expect(page.getByRole("button", { name: "edit" }).first()).toBeVisible();
  72 |   await page.getByRole("button", { name: "Sign note" }).click();
  73 | 
  74 |   // Locked: edit affordances gone, addendum offered.
  75 |   await expect(page.getByRole("button", { name: "edit" })).toHaveCount(0);
  76 |   await page.getByRole("button", { name: "+ Addendum" }).click();
  77 |   await page.getByPlaceholder(/Lab results returned/).fill("Post-signing addendum from e2e.");
  78 |   await page.getByRole("button", { name: "Add addendum", exact: true }).click();
  79 |   await expect(page.getByText("Post-signing addendum from e2e.")).toBeVisible();
  80 |   // With an addendum on record, unsign is no longer offered.
  81 |   await expect(page.getByRole("button", { name: /unsign/ })).toHaveCount(0);
  82 | });
  83 | 
```