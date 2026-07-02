import type { CSSProperties } from "react";

// Pabaid — synthesized "best of the best" direction.
//
// This is the opinionated single direction distilled from the three-way
// exploration in ../page.tsx (1A Journal / 1B Soft / 1C Slate). The picks:
//
//   • Flow / layout      → 1C Slate: 3 columns with a live left transcript rail.
//   • Card system         → 1B Soft: rounded white cards on a padded canvas,
//                           soft shadows — approachable, not sterile.
//   • Type & warmth       → 1A Journal: Newsreader serif for note + section
//                           headings and the calm Spoken/Inferred legend.
//   • Hard-data precision → 1C Slate: IBM Plex Mono for BP, ICD codes, the REC
//                           timer, and dose strings only.
//   • Inferred treatment  → 1A/1B: a subtle amber highlight (not a dotted
//                           underline) so AI-inferred text is legible at a glance.
//   • Color               → ONE trustworthy accent tied to the real app token
//                           (clinical #0e7490 teal) on a warm-neutral canvas;
//                           danger uses the app token #b91c1c.
//
// Same encounter + same four moats as the comparison: exam left blank instead of
// hallucinated, inferred-vs-spoken highlighting, RxNorm dose flag, auto-surfaced
// Q&A cheat-sheet. This is the candidate to graduate into the encounter screen.

export const metadata = {
  title: "Pabaid · The direction",
};

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const KEYFRAMES = `
@keyframes vsPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.3;transform:scale(.78);}}
@keyframes vsWave{0%,100%{transform:scaleY(.28);}50%{transform:scaleY(1);}}
`;

const WAVE_DELAYS = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.3, 0.5, 0.18, 0.66];

// ---- Synthesized theme -----------------------------------------------------
const T = {
  canvas: "#EDF0EF", // warm-cool neutral (between 1A paper & 1B cool)
  ink: "#0f2b31", // deep teal-ink, warmer than pure slate
  body: "#33454a", // body copy
  muted: "#7c9096", // secondary / captions
  faint: "#a9bbc0", // dividers-as-text, dot placeholders
  line: "#E4E9E8", // hairline borders
  panelBg: "#F6F8F7", // rail / panel wash
  card: "#ffffff",
  accent: "#0e7490", // app token: clinical teal — the single accent
  accentInk: "#0b5e73",
  accentBg: "#e2f0f2",
  accentBg2: "#eef6f7",
  accentLine: "#c9e2e6",
  inferBg: "#FBF0D6", // amber highlight for AI-inferred text
  inferLine: "#E4C97A",
  inferInk: "#8a6a12",
  danger: "#b91c1c", // app token
  dangerInk: "#8f2f26",
  dangerBg: "#fdf1ef",
  dangerLine: "#f0c9c2",
  recDot: "#c1502a", // warm recording indicator
  recInk: "#8a4a1f",
  recBg: "#F6EBE1",
  serif: "'Newsreader',ui-serif,Georgia,serif",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
};

const cardShadow = "0 6px 22px -14px rgba(15,43,49,.32)";

function label(): CSSProperties {
  return {
    font: `700 10.5px/1 ${T.sans}`,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: T.accent,
  };
}

function Waveform({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 52, margin: "14px 18px" }}>
      {WAVE_DELAYS.map((d, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: "100%",
            background: color,
            borderRadius: 3,
            transformOrigin: "center",
            animation: "vsWave 1s ease-in-out infinite",
            animationDelay: `${d}s`,
          }}
        />
      ))}
    </div>
  );
}

function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ font: `600 11px/1 ${T.mono}`, color: T.accentInk, background: T.accentBg, borderRadius: 5, padding: "3px 7px" }}>{children}</span>
  );
}

/* ======================================================= THE DIRECTION ===== */
function DesktopMock() {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 660,
        background: T.canvas,
        borderRadius: 22,
        boxShadow: "0 30px 60px -38px rgba(15,43,49,.5)",
        overflow: "hidden",
        fontFamily: T.sans,
        padding: 16,
      }}
    >
      {/* topbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, font: `600 21px/1 ${T.serif}`, color: T.ink }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: `conic-gradient(${T.accent} 0 50%,${T.ink} 0 100%)`, display: "inline-block" }} />
          Pabaid
          <span style={{ font: `500 11px/1 ${T.sans}`, color: T.faint, letterSpacing: ".02em", marginLeft: 1 }}>/pab·aid/</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 13px", background: T.card, borderRadius: 22, fontSize: 13, color: T.body, boxShadow: "0 2px 8px -5px rgba(15,43,49,.35)" }}>
          <b style={{ color: T.ink }}>Margaret Chen</b>
          <span style={{ color: T.faint }}>·</span>58F<span style={{ color: T.faint }}>·</span>HTN follow-up
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 13px", background: T.recBg, borderRadius: 22, font: `600 12px/1 ${T.mono}`, color: T.recInk }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.recDot, display: "inline-block", animation: "vsPulse 1.4s ease-in-out infinite" }} />
          REC 04:12
        </div>
      </div>

      {/* ask bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: T.card, borderRadius: 14, boxShadow: "0 4px 14px -9px rgba(15,43,49,.35)", marginBottom: 16 }}>
        <span style={{ color: T.accent, fontSize: 16 }}>⌕</span>
        <span style={{ fontSize: 14, color: T.muted }}>Ask a clinical question…</span>
        <span style={{ flex: 1 }} />
        <span style={{ font: `600 11px/1 ${T.sans}`, color: T.accentInk, background: T.accentBg, borderRadius: 20, padding: "5px 11px" }}>Cited answers</span>
      </div>

      {/* body — 3 columns: transcript rail · note · panel */}
      <div style={{ display: "grid", gridTemplateColumns: "156px 1.5fr 1fr", gap: 16 }}>
        {/* transcript rail */}
        <div style={{ background: T.panelBg, border: `1px solid ${T.line}`, borderRadius: 16, padding: "16px 14px" }}>
          <div style={{ font: `700 10px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 13 }}>Transcript</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 11.5, lineHeight: 1.5, color: T.body }}>
            <div><span style={{ font: `600 10px ${T.mono}`, color: T.accent }}>PT</span>&nbsp; …monitor&rsquo;s reading 150s over 90s.</div>
            <div><span style={{ font: `600 10px ${T.mono}`, color: T.ink }}>DR</span>&nbsp; Right knee — going up stairs?</div>
            <div><span style={{ font: `600 10px ${T.mono}`, color: T.accent }}>PT</span>&nbsp; Yes, about three weeks.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.faint, font: `600 10px ${T.mono}` }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, animation: "vsPulse 1.4s ease-in-out infinite" }} />
              live
            </div>
          </div>
        </div>

        {/* note */}
        <div style={{ background: T.card, borderRadius: 16, padding: "20px 22px", boxShadow: cardShadow }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `1px solid ${T.line}`, paddingBottom: 11, marginBottom: 16 }}>
            <div style={{ font: `600 18px/1 ${T.serif}`, color: T.ink }}>Visit Note</div>
            <div style={{ display: "flex", gap: 13, fontSize: 11, color: T.muted }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: T.ink }} />Spoken</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: T.inferBg, boxShadow: `inset 0 -1px 0 ${T.inferLine}` }} />Inferred</span>
            </div>
          </div>

          <div style={{ ...label(), marginBottom: 7 }}>Subjective</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: T.body, margin: "0 0 8px" }}>
            58F for hypertension follow-up. Reports morning headaches and home BP readings in the 150s/90s over the past two weeks. New right-knee pain for ~3 weeks, worse ascending stairs; denies trauma or swelling.{" "}
            <span style={{ background: T.inferBg, boxShadow: `inset 0 -1px 0 ${T.inferLine}`, padding: "0 3px", borderRadius: 3, color: T.inferInk }}>
              Review of systems otherwise negative.<sup style={{ font: `700 9px ${T.mono}`, color: T.inferInk }}>&nbsp;AI</sup>
            </span>
          </p>

          <div style={{ ...label(), margin: "17px 0 7px" }}>Objective</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, font: `500 13.5px/1 ${T.mono}`, color: T.ink, marginBottom: 9 }}>
            BP 152/94 · HR 78
            <span style={{ font: `600 10px 'Plus Jakarta Sans'`, color: T.accentInk, background: T.accentBg, borderRadius: 20, padding: "3px 9px" }}>synced · Omron 2m ago</span>
          </div>
          <div style={{ padding: "11px 14px", border: `1.5px dashed ${T.accentLine}`, borderRadius: 12, background: T.accentBg2, fontSize: 12.5, color: T.body, lineHeight: 1.5 }}>
            No exam findings were spoken this visit. Pabaid leaves the exam blank rather than inserting a normal template.{" "}
            <span style={{ color: T.accent, fontWeight: 700, cursor: "pointer" }}>+ Add exam</span>
          </div>

          <div style={{ ...label(), margin: "17px 0 7px" }}>Assessment</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13.5, color: T.body }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>1. Essential hypertension, uncontrolled <CodeChip>I10</CodeChip></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>2. Right knee pain, likely osteoarthritis <CodeChip>M25.561</CodeChip></div>
          </div>

          <div style={{ ...label(), margin: "17px 0 7px" }}>Plan</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: T.body, margin: "0 0 8px" }}>
            Increase <b>lisinopril</b> to <span style={{ font: `600 12.5px ${T.mono}`, background: T.dangerBg, color: T.danger, padding: "1px 4px", borderRadius: 4 }}>200 mg</span> daily. Order BMP; recheck K⁺/creatinine in 2 weeks. Knee: trial acetaminophen 650 mg PRN; X-ray if no improvement. Follow-up 4 weeks.
          </p>
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "12px 14px", background: T.dangerBg, border: `1.5px solid ${T.dangerLine}`, borderRadius: 13, marginTop: 6 }}>
            <span style={{ color: T.danger, fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>⚠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: T.dangerInk, fontSize: 13 }}>Dose check · <span style={{ fontFamily: T.mono, fontWeight: 600 }}>lisinopril 200 mg/day</span></div>
              <div style={{ fontSize: 12, color: "#a5726b", marginTop: 2 }}>Exceeds max 80 mg/day (RxNorm). Likely &ldquo;20 mg.&rdquo;</div>
              <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: T.danger, borderRadius: 20, padding: "6px 14px" }}>Use 20 mg</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.dangerInk, border: `1.5px solid ${T.dangerLine}`, borderRadius: 20, padding: "6px 14px" }}>Keep 200 mg</span>
              </div>
            </div>
          </div>
        </div>

        {/* panel — auto-surfaced + you asked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: T.card, borderRadius: 16, padding: "17px 18px", boxShadow: cardShadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, font: `700 10px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.accent, marginBottom: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent }} />Auto-surfaced · Hypertension
            </div>
            <div style={{ font: `600 16px/1.3 ${T.serif}`, color: T.ink, marginBottom: 9 }}>First-line management</div>
            <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, lineHeight: 1.65, color: T.body }}>
              <li>Thiazide, ACE-i / ARB, or CCB (JNC8 / ACC-AHA 2017).</li>
              <li>Target &lt;130/80 mmHg for most adults.</li>
              <li>Reassess 2–4 wks after a dose change; monitor K⁺ on ACE-i.</li>
            </ul>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <span style={{ font: `600 10px ${T.mono}`, color: T.accentInk, background: T.accentBg, borderRadius: 4, padding: "3px 8px" }}>AAFP</span>
              <span style={{ font: `600 10px ${T.mono}`, color: T.accentInk, background: T.accentBg, borderRadius: 4, padding: "3px 8px" }}>ACC/AHA 2017</span>
            </div>
          </div>
          <div style={{ background: T.card, borderRadius: 16, padding: "17px 18px", boxShadow: cardShadow }}>
            <div style={{ font: `700 10px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>You asked</div>
            <div style={{ font: `600 14px/1.3 ${T.serif}`, color: T.ink, marginBottom: 9 }}>Colon cancer screening with family history?</div>
            <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, lineHeight: 1.65, color: T.body }}>
              <li>Begin at 40, or 10 yrs before the youngest relative&rsquo;s diagnosis — whichever is earlier.</li>
              <li>Colonoscopy every 5 yrs (vs. 10 average-risk).</li>
            </ul>
            <div style={{ marginTop: 11, font: `400 10px ${T.mono}`, color: T.muted }}>verified from library · USPSTF, ACG</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div style={{ width: 300, flexShrink: 0, background: T.ink, borderRadius: 42, padding: 11, boxShadow: "0 30px 55px -32px rgba(15,43,49,.6)" }}>
      <div style={{ background: T.canvas, borderRadius: 32, overflow: "hidden", height: 600, display: "flex", flexDirection: "column", fontFamily: T.sans }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px", font: `600 12px ${T.mono}`, color: T.ink }}><span>9:41</span><span style={{ letterSpacing: 1 }}>●●● ▨</span></div>
        <div style={{ padding: "8px 18px 0" }}>
          <div style={{ font: `600 17px/1.2 ${T.serif}`, color: T.ink }}>Margaret Chen</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, font: `600 12px ${T.mono}`, color: T.recInk, marginTop: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: T.recDot, animation: "vsPulse 1.4s ease-in-out infinite" }} />REC 04:12</div>
        </div>
        <Waveform color={T.accent} />
        <div style={{ margin: "0 16px", padding: "12px 14px", background: T.card, borderRadius: 14, fontSize: 12.5, lineHeight: 1.5, color: T.body, boxShadow: "0 4px 14px -9px rgba(15,43,49,.3)" }}>&ldquo;…home monitor&rsquo;s been reading 150s over 90s, and the right knee hurts going up stairs.&rdquo;</div>
        <div style={{ margin: "12px 16px 0", padding: "12px 14px", background: T.accentBg, borderRadius: 14 }}>
          <div style={{ font: `700 10px ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.accentInk, marginBottom: 5 }}>Cheat-sheet · Hypertension</div>
          <div style={{ fontSize: 12, color: T.body, lineHeight: 1.5 }}>First-line: thiazide, ACE-i/ARB, CCB. Target &lt;130/80.</div>
        </div>
        <div style={{ margin: "10px 16px 0", padding: "10px 13px", background: T.dangerBg, border: `1.5px solid ${T.dangerLine}`, borderRadius: 14, display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: T.danger, fontWeight: 700 }}>⚠</span><span style={{ font: `600 11px ${T.mono}`, color: T.dangerInk }}>lisinopril 200 mg? · max 80</span></div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "14px 0 22px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.card, boxShadow: "0 4px 12px -6px rgba(15,43,49,.4)", display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, fontSize: 12, fontWeight: 700 }}>Ask</div>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.recDot, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px -8px rgba(193,80,42,.6)" }}><span style={{ width: 20, height: 20, background: "#fff", borderRadius: 4 }} /></div>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.card, boxShadow: "0 4px 12px -6px rgba(15,43,49,.4)", display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, fontSize: 15 }}>❚❚</div>
        </div>
      </div>
    </div>
  );
}

function RationaleRow({ from, took }: { from: string; took: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      <span style={{ flexShrink: 0, width: 74, font: `700 10px/1.3 ${T.sans}`, letterSpacing: ".06em", textTransform: "uppercase", color: T.accent }}>{from}</span>
      <span style={{ fontSize: 13, lineHeight: 1.55, color: T.body }}>{took}</span>
    </div>
  );
}

export default function BestDesignPage() {
  return (
    <div
      style={{
        // Full-bleed: escape the app's max-w-5xl <main>.
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        minHeight: "100vh",
        background: "#E4E8E7",
        padding: "44px 34px 90px",
        fontFamily: T.sans,
      }}
    >
      <link rel="stylesheet" href={FONTS_HREF} />
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div style={{ maxWidth: 1360, margin: "0 auto 30px" }}>
        <div style={{ font: `700 12px/1 ${T.sans}`, letterSpacing: ".16em", textTransform: "uppercase", color: T.muted }}>
          Pabaid · The direction · <a href="/design" style={{ color: T.accent, textDecoration: "none" }}>← back to 1a / 1b / 1c</a>
        </div>
        <h1 style={{ font: `600 34px/1.1 ${T.serif}`, color: T.ink, margin: "12px 0 8px", letterSpacing: "-.01em" }}>Best of the three, one system</h1>
        <p style={{ maxWidth: 780, margin: 0, fontSize: 15, lineHeight: 1.6, color: T.body }}>
          The strongest element from each direction, resolved into a single visual language: warm and document-like where the clinician reads, precise where the data lives, and calm everywhere. One accent (the app&rsquo;s clinical teal), one danger red, one amber for AI-inferred text.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20, maxWidth: 780, background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "16px 18px", boxShadow: cardShadow }}>
          <RationaleRow from="1C flow" took="Three columns with a live transcript rail — the most clinically useful and the most differentiated layout." />
          <RationaleRow from="1B cards" took="Rounded white cards on a padded canvas with soft shadows — approachable, not sterile." />
          <RationaleRow from="1A type" took="Newsreader serif for the note and section headings, and the calm Spoken / Inferred legend." />
          <RationaleRow from="1C data" took="IBM Plex Mono for the hard data only — BP, ICD codes, the REC timer, dose strings." />
          <RationaleRow from="1A/1B" took="AI-inferred text as a subtle amber highlight rather than a dotted underline — visible at a glance." />
        </div>
      </div>

      <section style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
          <DesktopMock />
          <PhoneMock />
        </div>
      </section>
    </div>
  );
}
