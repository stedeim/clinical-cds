# Pabaid — 5-minute doctor demo

Goal: not to impress. To find out what a working clinician would trust, ignore, or turn off. You demo for two minutes at a time, then shut up and watch their face.

## Before the meeting (5 min)

1. `npm run dev` in `~/Documents/Cowork/apps/clinical-cds`, open http://localhost:3000 in **Chrome** (dictation needs it).
2. Create the loaded test case at **New case**:
   - Age **58**, sex female
   - Chief complaint: `Hypertension follow-up; morning headaches`
   - Problems: type `essential hyperten` → pick **I10**. Then type `knee pain` and press Enter.
   - Medications: type `lisinopril` → pick **Lisinopril (Oral Pill)** → pick **20 mg Tab**. Then type `Lisinopril 200 mg daily` in the same box and press Enter (yes, both — the second one is the bad dose that fires the safety net).
   - Create, open the case, leave the tab ready.
3. On that case, add one follow-up: "Recheck K+/creatinine in 2 weeks", recipients Patient + My assistant. Set the due date to last week so the dashboard shows red.
4. Test your mic once: + Add transcript → consent box → Start dictation → say a sentence → Stop.

If the dev server restarts mid-demo the created case disappears. Keep this setup list handy so you can rebuild in 90 seconds.

## The walkthrough, in order

**Beat 1 — the case builds itself (45s).** Open the case. Point at the right panel: guideline cheat-sheet with ACC/AHA citations, regional prescribing card sourced to CMS data, a printable patient handout from the NIH. Say: "Nobody asked for any of this. It reacted to the chart. Every card names its source."

**Beat 2 — the safety net (60s).** Point at the med list: the ⬛ BOXED badge on lisinopril. Hover it: that's the live FDA label, fetal toxicity warning. Then the amber dose banner: 200 mg against a cited 80 mg ceiling. Click **Revise dose…**, type `20 mg`, save. The flag turns green because the math checks out, not because you clicked a button. Say: "It never tells you what to prescribe. It shows you what the label says and re-checks whatever you decide."

**Beat 3 — the note writes itself, honestly (90s).** Click **+ Add transcript**. Check the consent box, hit **Start dictation**, and role-play four lines of a visit (switch the Doctor/Patient toggle as you go). Stop, hit **Ground note**. Show the teal underlines: every underlined phrase traces to a transcript line. Show the exam section: blank, with "left blank rather than inserting a normal template." Say: "It refuses to invent an exam. Anything the AI guessed is highlighted amber and marked 'confirm'. Anything you say gets traced to the recording."

**Beat 4 — cut the fluff (30s).** Hit **Summarize**. Key points, pertinent negatives, patient concerns. Hover one point: the tooltip shows the exact lines it came from.

**Beat 5 — finish the visit (60s).** Click **edit** on the Subjective, add one sentence of your own, save. Sign the note. Print/PDF: show the signed attestation (or unsign first and show the DRAFT watermark). Then add a follow-up, pick who gets reminded — Patient, Me, My assistant. Go to the home page: the red **overdue** item is waiting at the top.

Total: about 4.5 minutes. Then stop talking.

## The questions that matter (let them ramble)

1. "Walk me through what you did after your last patient left the room. How long did the note take?"
2. "Which of these cards would you turn off first?"
3. "What here would you not trust? Why?"
4. "If this showed you 'most doctors in your province prescribe X first for this' — useful, or noise?"
5. "What would have to be true before you'd use this with a real patient?"
6. "Who books your follow-ups today, and how often does one fall through?"

Write down their exact words, especially question 3. The complaints are the roadmap.

## What not to claim

- The AI answers are stub output in this demo. Say so if asked: "Demo mode. Live reasoning plugs in with an API key."
- Dictation runs on the browser's speech engine. Not for real patients yet; a medical-grade transcription service replaces it.
- Nothing persists between restarts yet, and no real patient data can touch this until the compliance work (BAAs, hosted database) is done.
- Never say "diagnosis," "recommends," or "tells you what to do." Pabaid surfaces cited considerations. The doctor decides. That framing is a legal boundary, not marketing.
