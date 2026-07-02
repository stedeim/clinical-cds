import type { CSSProperties } from "react";

// Pabaid.dc.html — implemented from the Claude Design handoff bundle
// (suki-alternative-development-plan/project/Pabaid.dc.html).
//
// The design is a Turn-1 exploration: the SAME outpatient family-medicine
// encounter rendered in three visual systems ("directions"). All three show the
// product moats: the exam left blank instead of hallucinated, inferred-vs-spoken
// highlighting, RxNorm dose flags, and the auto-surfaced Q&A cheat-sheet.
//
// This route recreates the mockup pixel-faithfully as real React so the chosen
// direction can graduate into the product UI. Once a direction is picked, delete
// the other two render fns + theme entries and lift the winner into the encounter
// screen. Reference the options in chat as 1a / 1b / 1c.

export const metadata = {
  title: "Pabaid · Three clinical-calm directions",
};

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600;6..72,700&family=Public+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const KEYFRAMES = `
@keyframes vsPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.3;transform:scale(.78);}}
@keyframes vsWave{0%,100%{transform:scaleY(.28);}50%{transform:scaleY(1);}}
`;

// Waveform bar animation-delays, verbatim from the design (12 bars).
const WAVE_DELAYS = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.3, 0.5, 0.18, 0.66];

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
            animation: `vsWave 1s ease-in-out infinite`,
            animationDelay: `${d}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================= 1A · JOURNAL */
function JournalMock() {
  const sage = "#5f7a67";
  const label: CSSProperties = {
    font: "600 11px/1 'Public Sans'",
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: sage,
  };
  return (
    <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* desktop */}
      <div
        style={{
          flex: 1,
          minWidth: 640,
          background: "#FBF9F3",
          border: "1px solid #E3DDD1",
          borderRadius: 6,
          boxShadow: "0 24px 50px -34px rgba(60,50,30,.4)",
          overflow: "hidden",
          fontFamily: "'Public Sans',sans-serif",
        }}
      >
        {/* topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 20px", borderBottom: "1px solid #E7E1D6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, font: "600 19px/1 'Newsreader',serif", color: "#211f1a" }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", background: "conic-gradient(#5f7a67 0 50%,#211f1a 0 100%)", display: "inline-block" }} />
            Pabaid
            <span style={{ font: "400 11px/1 'Public Sans'", color: "#a49f92", letterSpacing: ".02em", marginLeft: 1 }}>/pab·aid/</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #E3DDD1", borderRadius: 20, fontSize: 13, color: "#4a4840" }}>
            <b style={{ fontWeight: 600, color: "#211f1a" }}>Margaret Chen</b>
            <span style={{ color: "#a49f92" }}>·</span>58F<span style={{ color: "#a49f92" }}>·</span>HTN follow-up
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#F4EDE3", borderRadius: 20, fontSize: 12.5, fontWeight: 600, color: "#8a4a1f" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c1502a", display: "inline-block", animation: "vsPulse 1.4s ease-in-out infinite" }} />
            Recording&nbsp;04:12
          </div>
        </div>
        {/* search band */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E7E1D6", background: "#FCFBF6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 15px", background: "#fff", border: "1px solid #E3DDD1", borderRadius: 6 }}>
            <span style={{ color: sage, fontSize: 15 }}>⌕</span>
            <span style={{ fontSize: 14, color: "#98938a" }}>Ask a clinical question…</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "#b7b1a4", border: "1px solid #E3DDD1", borderRadius: 4, padding: "2px 6px" }}>Cited from library</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
            {["Colon cancer screening & family history", "Statin threshold ASCVD 7.5%", "Pediatric asthma step-up"].map((t) => (
              <span key={t} style={{ fontSize: 11.5, color: sage, background: "#EEF2ED", borderRadius: 20, padding: "4px 10px" }}>{t}</span>
            ))}
          </div>
        </div>
        {/* body */}
        <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr" }}>
          {/* note col */}
          <div style={{ padding: "20px 22px", borderRight: "1px solid #E7E1D6" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a8a294", marginBottom: 12 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9c2b2" }} />
              …the headaches, mostly mornings, and my home monitor&rsquo;s been reading 150s over 90s…
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "1px solid #E7E1D6", paddingBottom: 10, marginBottom: 16 }}>
              <div style={{ font: "600 17px/1 'Newsreader',serif", color: "#211f1a" }}>Visit Note</div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#8f8f86" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#211f1a" }} />Spoken</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: "#F1E2BC", boxShadow: "inset 0 -1px 0 #D9B85E" }} />Inferred</span>
              </div>
            </div>

            <div style={{ ...label, marginBottom: 7 }}>Subjective</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#33322c", margin: "0 0 8px" }}>
              58F for hypertension follow-up. Reports morning headaches and home BP readings in the 150s/90s over the past two weeks. New right-knee pain for ~3 weeks, worse ascending stairs; denies trauma or swelling.{" "}
              <span style={{ background: "#F1E2BC", boxShadow: "inset 0 -1px 0 #D9B85E", padding: "0 2px", borderRadius: 2 }}>
                Review of systems otherwise negative.<sup style={{ fontSize: 9, color: "#9a7a1e", fontWeight: 700 }}>&nbsp;AI</sup>
              </span>
            </p>

            <div style={{ ...label, margin: "16px 0 7px" }}>Objective</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#33322c", marginBottom: 8 }}>
              BP <b>152/94</b> · HR <b>78</b>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: sage, background: "#EEF2ED", borderRadius: 4, padding: "2px 6px" }}>synced · Omron 2m ago</span>
            </div>
            <div style={{ padding: "10px 12px", border: "1px dashed #CBC2AF", borderRadius: 5, background: "#FCFAF3", fontSize: 12.5, fontStyle: "italic", color: "#8b8577", lineHeight: 1.5 }}>
              No exam findings were spoken this visit. Pabaid leaves the exam blank rather than inserting a normal template.{" "}
              <span style={{ color: sage, fontStyle: "normal", fontWeight: 600, cursor: "pointer" }}>+ Add exam</span>
            </div>

            <div style={{ ...label, margin: "16px 0 7px" }}>Assessment</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, color: "#33322c" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>1. Essential hypertension, uncontrolled <span style={{ font: "600 11px/1 'Public Sans'", color: sage, border: "1px solid #CBD8CD", borderRadius: 3, padding: "2px 6px" }}>I10</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>2. Right knee pain, likely osteoarthritis <span style={{ font: "600 11px/1 'Public Sans'", color: sage, border: "1px solid #CBD8CD", borderRadius: 3, padding: "2px 6px" }}>M25.561</span></div>
            </div>

            <div style={{ ...label, margin: "16px 0 7px" }}>Plan</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#33322c", margin: "0 0 6px" }}>
              Increase <b>lisinopril</b> to <span style={{ background: "#FBEDEA", color: "#a33325", fontWeight: 600, padding: "0 3px", borderRadius: 2 }}>200 mg</span> daily. Order BMP; recheck K⁺/creatinine in 2 weeks. Knee: trial acetaminophen 650 mg PRN; X-ray if no improvement. Follow-up 4 weeks.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", background: "#FBEDEA", border: "1px solid #E7B3A8", borderRadius: 5, marginTop: 6 }}>
              <span style={{ color: "#b23a2e", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#8f2e24", fontSize: 13 }}>Dose check · lisinopril 200 mg/day</div>
                <div style={{ fontSize: 12, color: "#9a6a61", marginTop: 1 }}>Exceeds max 80 mg/day (RxNorm). Likely &ldquo;20 mg.&rdquo;</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "#b23a2e", borderRadius: 4, padding: "5px 11px" }}>Use 20 mg</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#8f2e24", border: "1px solid #E7B3A8", borderRadius: 4, padding: "5px 11px" }}>Keep 200 mg</span>
                </div>
              </div>
            </div>
          </div>
          {/* panel col */}
          <div style={{ padding: "20px 20px", background: "#FCFBF6", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: sage, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: sage }} />Auto-surfaced · Hypertension
              </div>
              <div style={{ background: "#fff", border: "1px solid #E3DDD1", borderRadius: 6, padding: "14px 15px" }}>
                <div style={{ font: "600 15px/1.3 'Newsreader',serif", color: "#211f1a", marginBottom: 9 }}>First-line management</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6, color: "#43423b" }}>
                  <li>Thiazide, ACE-i / ARB, or CCB (JNC8 / ACC-AHA 2017).</li>
                  <li>Target &lt;130/80 mmHg for most adults.</li>
                  <li>Reassess 2&ndash;4 wks after a dose change; monitor K⁺ on ACE-i.</li>
                </ul>
                <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: sage, background: "#EEF2ED", borderRadius: 4, padding: "3px 8px" }}>AAFP</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: sage, background: "#EEF2ED", borderRadius: 4, padding: "3px 8px" }}>ACC/AHA 2017</span>
                </div>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#98938a", marginBottom: 10 }}>You asked</div>
              <div style={{ background: "#fff", border: "1px solid #E3DDD1", borderRadius: 6, padding: "14px 15px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#211f1a", marginBottom: 9 }}>Colon cancer screening with family history?</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.6, color: "#43423b" }}>
                  <li>Begin at 40, or 10 yrs before the youngest relative&rsquo;s diagnosis &mdash; whichever is earlier.</li>
                  <li>Colonoscopy every 5 yrs (vs. 10 average-risk).</li>
                </ul>
                <div style={{ marginTop: 11, fontSize: 10.5, color: "#a8a294" }}>Verified from library · USPSTF, ACG</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* phone */}
      <div style={{ width: 300, flexShrink: 0, background: "#211f1a", borderRadius: 40, padding: 11, boxShadow: "0 26px 50px -30px rgba(60,50,30,.55)" }}>
        <div style={{ background: "#FBF9F3", borderRadius: 30, overflow: "hidden", height: 600, display: "flex", flexDirection: "column", fontFamily: "'Public Sans',sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px", fontSize: 12, fontWeight: 600, color: "#211f1a" }}><span>9:41</span><span style={{ letterSpacing: 1 }}>●●● ▨</span></div>
          <div style={{ padding: "6px 18px 0" }}>
            <div style={{ font: "600 17px/1.2 'Newsreader',serif", color: "#211f1a" }}>Margaret Chen</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#8a4a1f", marginTop: 3 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#c1502a", animation: "vsPulse 1.4s ease-in-out infinite" }} />Recording 04:12</div>
          </div>
          <Waveform color={sage} />
          <div style={{ margin: "0 16px", padding: "11px 13px", background: "#fff", border: "1px solid #E7E1D6", borderRadius: 12, fontSize: 12.5, lineHeight: 1.5, color: "#43423b" }}>&ldquo;…home monitor&rsquo;s been reading 150s over 90s, and the right knee hurts going up stairs.&rdquo;</div>
          <div style={{ margin: "12px 16px 0", padding: "11px 13px", background: "#EEF2ED", borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: sage, marginBottom: 5 }}>Cheat-sheet · Hypertension</div>
            <div style={{ fontSize: 12, color: "#33322c", lineHeight: 1.5 }}>First-line: thiazide, ACE-i/ARB, CCB. Target &lt;130/80.</div>
          </div>
          <div style={{ margin: "10px 16px 0", padding: "9px 12px", background: "#FBEDEA", border: "1px solid #E7B3A8", borderRadius: 12, display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#b23a2e", fontWeight: 700 }}>⚠</span><span style={{ fontSize: 11.5, color: "#8f2e24", fontWeight: 600 }}>lisinopril 200 mg? · max 80</span></div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "14px 0 22px" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1.5px solid #CBC2AF", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b8577", fontSize: 13 }}>Ask</div>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#c1502a", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 20, height: 20, background: "#fff", borderRadius: 4 }} /></div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1.5px solid #CBC2AF", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b8577", fontSize: 16 }}>❚❚</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ 1B · SOFT */
function SoftMock() {
  const teal = "#0ea5a5";
  const label: CSSProperties = {
    font: "700 11px/1 'Plus Jakarta Sans'",
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: teal,
  };
  return (
    <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* desktop */}
      <div style={{ flex: 1, minWidth: 640, background: "#F1F5F7", borderRadius: 20, boxShadow: "0 24px 55px -34px rgba(20,60,70,.5)", overflow: "hidden", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: 16 }}>
        {/* topbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, font: "700 19px/1 'Sora',sans-serif", color: "#12313a" }}>
            <span style={{ width: 20, height: 20, borderRadius: 7, background: "linear-gradient(135deg,#12b3a6,#0e8f9c)", display: "inline-block" }} />
            Pabaid<span style={{ font: "600 11px/1 'Plus Jakarta Sans'", color: "#9db0b6", letterSpacing: ".02em", marginLeft: 1 }}>/pab·aid/</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 13px", background: "#fff", borderRadius: 22, fontSize: 13, color: "#4a5a60", boxShadow: "0 2px 8px -4px rgba(20,60,70,.3)" }}>
            <b style={{ color: "#12313a" }}>Margaret Chen</b><span style={{ color: "#a9bbc0" }}>·</span>58F<span style={{ color: "#a9bbc0" }}>·</span>HTN f/u
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "#ffe9e6", borderRadius: 22, fontSize: 12.5, fontWeight: 700, color: "#d64535" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e23d3d", animation: "vsPulse 1.4s ease-in-out infinite" }} />Recording 04:12
          </div>
        </div>
        {/* search */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: "#fff", borderRadius: 16, boxShadow: "0 4px 14px -8px rgba(20,60,70,.35)", marginBottom: 16 }}>
          <span style={{ color: teal, fontSize: 16 }}>⌕</span><span style={{ fontSize: 14, color: "#9db0b6" }}>Ask a clinical question…</span><span style={{ flex: 1 }} /><span style={{ fontSize: 11, fontWeight: 600, color: teal, background: "#e2f6f5", borderRadius: 20, padding: "4px 10px" }}>Cited answers</span>
        </div>
        {/* body */}
        <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 16 }}>
          {/* note */}
          <div style={{ background: "#fff", borderRadius: 18, padding: "20px 22px", boxShadow: "0 6px 20px -12px rgba(20,60,70,.28)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#a9bbc0", marginBottom: 14 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#cfe0e2" }} />…home monitor&rsquo;s been reading 150s over 90s…</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ font: "700 17px/1 'Sora',sans-serif", color: "#12313a" }}>Visit Note</div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#8fa2a8" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#12313a" }} />Spoken</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 8, borderRadius: 3, background: "#FFE7B8" }} />Inferred</span>
              </div>
            </div>
            <div style={{ ...label, marginBottom: 7 }}>Subjective</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#37474d", margin: "0 0 8px" }}>
              58F for hypertension follow-up. Morning headaches; home BP 150s/90s over two weeks. New right-knee pain ~3 weeks, worse on stairs; denies trauma or swelling.{" "}
              <span style={{ background: "#FFF1D4", padding: "1px 4px", borderRadius: 5, color: "#9a6a12" }}>Review of systems otherwise negative.<sup style={{ fontSize: 9, fontWeight: 800 }}>&nbsp;AI</sup></span>
            </p>
            <div style={{ ...label, margin: "16px 0 7px" }}>Objective</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#37474d", marginBottom: 9 }}>BP <b>152/94</b> · HR <b>78</b> <span style={{ fontSize: 10.5, fontWeight: 700, color: teal, background: "#e2f6f5", borderRadius: 20, padding: "3px 9px" }}>synced · Omron</span></div>
            <div style={{ padding: "11px 14px", border: "1.5px dashed #bfd6d8", borderRadius: 12, background: "#f5fafa", fontSize: 12.5, color: "#6b8288", lineHeight: 1.5 }}>No exam findings were spoken. Pabaid leaves the exam blank rather than templating a normal exam. <span style={{ color: teal, fontWeight: 700, cursor: "pointer" }}>+ Add exam</span></div>
            <div style={{ ...label, margin: "16px 0 7px" }}>Assessment</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13.5, color: "#37474d" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>1. Essential hypertension, uncontrolled <span style={{ font: "700 11px/1 'Plus Jakarta Sans'", color: teal, background: "#e2f6f5", borderRadius: 20, padding: "3px 9px" }}>I10</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>2. Right knee pain, likely OA <span style={{ font: "700 11px/1 'Plus Jakarta Sans'", color: teal, background: "#e2f6f5", borderRadius: 20, padding: "3px 9px" }}>M25.561</span></div>
            </div>
            <div style={{ ...label, margin: "16px 0 7px" }}>Plan</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#37474d", margin: "0 0 8px" }}>Increase <b>lisinopril</b> to <span style={{ background: "#ffe9e6", color: "#d64535", fontWeight: 700, padding: "1px 4px", borderRadius: 5 }}>200 mg</span> daily. Order BMP; recheck K⁺/creatinine in 2 wks. Knee: acetaminophen 650 mg PRN; X-ray if no improvement. Follow-up 4 wks.</p>
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "12px 14px", background: "#fff4f2", border: "1.5px solid #f6c6bf", borderRadius: 14 }}>
              <span style={{ color: "#e23d3d", fontWeight: 700, fontSize: 15 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#c23325", fontSize: 13 }}>Dose check · lisinopril 200 mg/day</div>
                <div style={{ fontSize: 12, color: "#b07a72", marginTop: 2 }}>Exceeds max 80 mg/day (RxNorm). Likely &ldquo;20 mg.&rdquo;</div>
                <div style={{ display: "flex", gap: 8, marginTop: 9 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#e23d3d", borderRadius: 20, padding: "6px 14px" }}>Use 20 mg</span><span style={{ fontSize: 12, fontWeight: 700, color: "#c23325", border: "1.5px solid #f6c6bf", borderRadius: 20, padding: "6px 14px" }}>Keep</span></div>
              </div>
            </div>
          </div>
          {/* panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: "17px 18px", boxShadow: "0 6px 20px -12px rgba(20,60,70,.28)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: teal, marginBottom: 11 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: teal }} />Auto-surfaced · Hypertension</div>
              <div style={{ font: "700 15px/1.3 'Sora',sans-serif", color: "#12313a", marginBottom: 9 }}>First-line management</div>
              <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, lineHeight: 1.65, color: "#42565c" }}>
                <li>Thiazide, ACE-i/ARB, or CCB (JNC8 / ACC-AHA).</li>
                <li>Target &lt;130/80 mmHg for most adults.</li>
                <li>Reassess 2&ndash;4 wks after dose change; monitor K⁺.</li>
              </ul>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}><span style={{ fontSize: 10.5, fontWeight: 700, color: teal, background: "#e2f6f5", borderRadius: 20, padding: "4px 10px" }}>AAFP</span><span style={{ fontSize: 10.5, fontWeight: 700, color: teal, background: "#e2f6f5", borderRadius: 20, padding: "4px 10px" }}>ACC/AHA</span></div>
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: "17px 18px", boxShadow: "0 6px 20px -12px rgba(20,60,70,.28)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "#9db0b6", marginBottom: 10 }}>You asked</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#12313a", marginBottom: 9 }}>Colon cancer screening &amp; family history?</div>
              <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, lineHeight: 1.65, color: "#42565c" }}>
                <li>Start at 40, or 10 yrs before youngest relative&rsquo;s dx.</li>
                <li>Colonoscopy every 5 yrs (vs. 10).</li>
              </ul>
              <div style={{ marginTop: 11, fontSize: 10.5, color: "#a9bbc0" }}>Verified from library · USPSTF, ACG</div>
            </div>
          </div>
        </div>
      </div>
      {/* phone */}
      <div style={{ width: 300, flexShrink: 0, background: "#12313a", borderRadius: 44, padding: 11, boxShadow: "0 26px 50px -30px rgba(20,60,70,.6)" }}>
        <div style={{ background: "#F1F5F7", borderRadius: 34, overflow: "hidden", height: 600, display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px", fontSize: 12, fontWeight: 700, color: "#12313a" }}><span>9:41</span><span style={{ letterSpacing: 1 }}>●●● ▨</span></div>
          <div style={{ padding: "8px 18px 0" }}>
            <div style={{ font: "700 17px/1.2 'Sora',sans-serif", color: "#12313a" }}>Margaret Chen</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "#d64535", marginTop: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e23d3d", animation: "vsPulse 1.4s ease-in-out infinite" }} />Recording 04:12</div>
          </div>
          <Waveform color={teal} />
          <div style={{ margin: "0 16px", padding: "12px 14px", background: "#fff", borderRadius: 16, fontSize: 12.5, lineHeight: 1.5, color: "#42565c", boxShadow: "0 4px 14px -8px rgba(20,60,70,.3)" }}>&ldquo;…150s over 90s, and the right knee hurts going up stairs.&rdquo;</div>
          <div style={{ margin: "12px 16px 0", padding: "12px 14px", background: "#e2f6f5", borderRadius: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: teal, marginBottom: 5 }}>Cheat-sheet · Hypertension</div>
            <div style={{ fontSize: 12, color: "#37474d", lineHeight: 1.5 }}>First-line: thiazide, ACE-i/ARB, CCB. Target &lt;130/80.</div>
          </div>
          <div style={{ margin: "10px 16px 0", padding: "10px 13px", background: "#fff4f2", border: "1.5px solid #f6c6bf", borderRadius: 16, display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#e23d3d", fontWeight: 700 }}>⚠</span><span style={{ fontSize: 11.5, color: "#c23325", fontWeight: 700 }}>lisinopril 200 mg? · max 80</span></div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "14px 0 22px" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", boxShadow: "0 4px 12px -6px rgba(20,60,70,.4)", display: "flex", alignItems: "center", justifyContent: "center", color: teal, fontSize: 12, fontWeight: 700 }}>Ask</div>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#e23d3d", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px -8px rgba(226,61,61,.7)" }}><span style={{ width: 20, height: 20, background: "#fff", borderRadius: 5 }} /></div>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", boxShadow: "0 4px 12px -6px rgba(20,60,70,.4)", display: "flex", alignItems: "center", justifyContent: "center", color: teal, fontSize: 15 }}>❚❚</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================== 1C · SLATE */
function SlateMock() {
  const blue = "#2563eb";
  const mono = "'IBM Plex Mono',monospace";
  const soap: CSSProperties = { font: `600 10px/1 ${mono}`, letterSpacing: ".1em", color: blue };
  return (
    <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* desktop */}
      <div style={{ flex: 1, minWidth: 640, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 24px 55px -36px rgba(15,23,42,.5)", overflow: "hidden", fontFamily: "'IBM Plex Sans',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, font: "600 18px/1 'Space Grotesk',sans-serif", color: "#0f172a" }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: blue, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>P</span>
            Pabaid<span style={{ font: `400 11px/1 ${mono}`, color: "#94a3b8", marginLeft: 1 }}>/pab·aid/</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", border: "1px solid #E2E8F0", borderRadius: 6, fontSize: 13, color: "#475569" }}>
            <b style={{ color: "#0f172a" }}>Margaret Chen</b><span style={{ color: "#cbd5e1" }}>/</span>58F<span style={{ color: "#cbd5e1" }}>/</span>HTN f/u
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, font: `600 12px/1 ${mono}`, color: "#dc2626" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", animation: "vsPulse 1.4s ease-in-out infinite" }} />REC 04:12
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
          <span style={{ color: blue, fontSize: 15 }}>⌕</span><span style={{ fontSize: 14, color: "#94a3b8" }}>Ask a clinical question…</span><span style={{ flex: 1 }} /><span style={{ font: `600 10.5px/1 ${mono}`, color: blue, background: "#eff4ff", border: "1px solid #d6e2ff", borderRadius: 5, padding: "4px 8px" }}>RAG · cited</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1.5fr 1fr" }}>
          {/* transcript rail */}
          <div style={{ padding: "16px 14px", borderRight: "1px solid #E2E8F0", background: "#F8FAFC" }}>
            <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: ".08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>Transcript</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 11.5, lineHeight: 1.5, color: "#64748b" }}>
              <div><span style={{ font: `600 10px ${mono}`, color: blue }}>PT</span> …monitor&rsquo;s reading 150s over 90s.</div>
              <div><span style={{ font: `600 10px ${mono}`, color: "#0f172a" }}>DR</span> Right knee &mdash; going up stairs?</div>
              <div><span style={{ font: `600 10px ${mono}`, color: blue }}>PT</span> Yes, about three weeks.</div>
              <div style={{ color: "#cbd5e1" }}>●●● live</div>
            </div>
          </div>
          {/* note */}
          <div style={{ padding: "18px 20px", borderRight: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E2E8F0", paddingBottom: 10, marginBottom: 15 }}>
              <div style={{ font: "600 16px/1 'Space Grotesk',sans-serif", color: "#0f172a" }}>Visit Note</div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#0f172a" }} />Spoken</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 0, borderBottom: "2px dotted #c2820b" }} />Inferred</span>
              </div>
            </div>
            <div style={{ ...soap, marginBottom: 7 }}>S · SUBJECTIVE</div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "#334155", margin: "0 0 8px" }}>58F, hypertension follow-up. Morning headaches; home BP 150s/90s &times;2 wks. New right-knee pain ~3 wks, worse on stairs; denies trauma/swelling. <span style={{ borderBottom: "2px dotted #c2820b", color: "#334155" }}>Review of systems otherwise negative.<sup style={{ font: `700 9px ${mono}`, color: "#c2820b" }}>&nbsp;AI</sup></span></p>
            <div style={{ ...soap, margin: "16px 0 7px" }}>O · OBJECTIVE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, font: `500 13px/1 ${mono}`, color: "#0f172a", marginBottom: 9 }}>BP 152/94 · HR 78 <span style={{ font: "600 10px 'IBM Plex Sans'", color: blue, background: "#eff4ff", borderRadius: 4, padding: "3px 7px" }}>synced · Omron</span></div>
            <div style={{ padding: "10px 13px", border: "1px dashed #cbd5e1", borderRadius: 7, background: "#F8FAFC", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>Exam not verbalized. Objective left blank &mdash; no auto-generated normal exam. <span style={{ color: blue, fontWeight: 600, cursor: "pointer" }}>+ Add exam</span></div>
            <div style={{ ...soap, margin: "16px 0 7px" }}>A · ASSESSMENT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, color: "#334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>1. Essential hypertension, uncontrolled <span style={{ font: `600 11px/1 ${mono}`, color: blue, background: "#eff4ff", borderRadius: 4, padding: "3px 7px" }}>I10</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>2. Right knee pain, likely OA <span style={{ font: `600 11px/1 ${mono}`, color: blue, background: "#eff4ff", borderRadius: 4, padding: "3px 7px" }}>M25.561</span></div>
            </div>
            <div style={{ ...soap, margin: "16px 0 7px" }}>P · PLAN</div>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "#334155", margin: "0 0 8px" }}>Increase <b>lisinopril</b> to <span style={{ font: `600 12px ${mono}`, background: "#fef2f2", color: "#dc2626", padding: "1px 4px", borderRadius: 4 }}>200 mg</span> daily. BMP; recheck K⁺/Cr in 2 wks. Knee: acetaminophen 650 mg PRN; X-ray if no improvement. F/U 4 wks.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 13px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
              <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 14 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#b91c1c", fontSize: 12.5 }}>Dose check · <span style={{ fontFamily: "'IBM Plex Mono'" }}>lisinopril 200 mg/day</span></div>
                <div style={{ fontSize: 11.5, color: "#c47a76", marginTop: 2 }}>Exceeds max 80 mg/day (RxNorm). Likely &ldquo;20 mg.&rdquo;</div>
                <div style={{ display: "flex", gap: 8, marginTop: 9 }}><span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff", background: "#dc2626", borderRadius: 5, padding: "5px 12px" }}>Use 20 mg</span><span style={{ fontSize: 11.5, fontWeight: 600, color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 5, padding: "5px 12px" }}>Keep</span></div>
              </div>
            </div>
          </div>
          {/* panel */}
          <div style={{ padding: "18px 18px", background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 15 }}>
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "15px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, font: `600 10px/1 ${mono}`, letterSpacing: ".06em", textTransform: "uppercase", color: blue, marginBottom: 11 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: blue }} />Auto · Hypertension</div>
              <div style={{ font: "600 15px/1.3 'Space Grotesk',sans-serif", color: "#0f172a", marginBottom: 9 }}>First-line management</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.6, color: "#475569" }}>
                <li>Thiazide, ACE-i/ARB, or CCB (JNC8 / ACC-AHA).</li>
                <li>Target &lt;130/80 mmHg for most adults.</li>
                <li>Reassess 2&ndash;4 wks; monitor K⁺ on ACE-i.</li>
              </ul>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}><span style={{ font: `600 10px ${mono}`, color: blue, background: "#eff4ff", borderRadius: 4, padding: "3px 8px" }}>AAFP</span><span style={{ font: `600 10px ${mono}`, color: blue, background: "#eff4ff", borderRadius: 4, padding: "3px 8px" }}>ACC/AHA</span></div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "15px 16px" }}>
              <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: ".06em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>You asked</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a", marginBottom: 9 }}>Colon cancer screening &amp; family history?</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.6, color: "#475569" }}>
                <li>Start at 40, or 10 yrs before youngest relative&rsquo;s dx.</li>
                <li>Colonoscopy q5y (vs. q10y).</li>
              </ul>
              <div style={{ marginTop: 11, font: `400 10px ${mono}`, color: "#94a3b8" }}>verified · USPSTF, ACG</div>
            </div>
          </div>
        </div>
      </div>
      {/* phone */}
      <div style={{ width: 300, flexShrink: 0, background: "#0f172a", borderRadius: 42, padding: 11, boxShadow: "0 26px 50px -30px rgba(15,23,42,.6)" }}>
        <div style={{ background: "#F8FAFC", borderRadius: 32, overflow: "hidden", height: 600, display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Sans',sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px", font: `600 12px ${mono}`, color: "#0f172a" }}><span>9:41</span><span style={{ letterSpacing: 1 }}>●●● ▨</span></div>
          <div style={{ padding: "8px 18px 0" }}>
            <div style={{ font: "600 17px/1.2 'Space Grotesk',sans-serif", color: "#0f172a" }}>Margaret Chen</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, font: `600 12px ${mono}`, color: "#dc2626", marginTop: 4 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#dc2626", animation: "vsPulse 1.4s ease-in-out infinite" }} />REC 04:12</div>
          </div>
          <Waveform color={blue} />
          <div style={{ margin: "0 16px", padding: "11px 13px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 12, lineHeight: 1.5, color: "#475569" }}>&ldquo;…150s over 90s, and the right knee hurts going up stairs.&rdquo;</div>
          <div style={{ margin: "12px 16px 0", padding: "11px 13px", background: "#eff4ff", border: "1px solid #d6e2ff", borderRadius: 10 }}>
            <div style={{ font: `600 10px ${mono}`, letterSpacing: ".05em", textTransform: "uppercase", color: blue, marginBottom: 5 }}>Cheat-sheet · Hypertension</div>
            <div style={{ fontSize: 11.5, color: "#334155", lineHeight: 1.5 }}>First-line: thiazide, ACE-i/ARB, CCB. Target &lt;130/80.</div>
          </div>
          <div style={{ margin: "10px 16px 0", padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#dc2626", fontWeight: 700 }}>⚠</span><span style={{ font: `600 11px ${mono}`, color: "#b91c1c" }}>lisinopril 200 mg? max 80</span></div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "14px 0 22px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: blue, font: "600 12px 'IBM Plex Sans'" }}>Ask</div>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 20, height: 20, background: "#fff", borderRadius: 4 }} /></div>
            <div style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 15 }}>❚❚</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectionHeader({ badge, badgeStyle, title, titleStyle, sub }: {
  badge: string;
  badgeStyle: CSSProperties;
  title: string;
  titleStyle: CSSProperties;
  sub: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 32, height: 26, padding: "0 9px", ...badgeStyle }}>{badge}</span>
      <h2 style={{ margin: 0, ...titleStyle }}>{title}</h2>
      <span style={{ fontSize: 13, color: "#8f8f86" }}>{sub}</span>
    </div>
  );
}

export default function DesignPage() {
  return (
    <div
      style={{
        // Full-bleed: escape the app's max-w-5xl <main> so the 1360px canvas fits.
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        minHeight: "100vh",
        background: "#E9E9E4",
        padding: "44px 34px 90px",
        fontFamily: "'Public Sans',system-ui,sans-serif",
      }}
    >
      <link rel="stylesheet" href={FONTS_HREF} />
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div style={{ maxWidth: 1360, margin: "0 auto 34px" }}>
        <div style={{ font: "600 12px/1 'Public Sans'", letterSpacing: ".16em", textTransform: "uppercase", color: "#8f8f86" }}>Pabaid.io · Ambient AI · Turn 1</div>
        <h1 style={{ font: "600 34px/1.1 'Newsreader',serif", color: "#211f1a", margin: "12px 0 8px", letterSpacing: "-.01em" }}>Three clinical-calm directions</h1>
        <p style={{ maxWidth: 760, margin: 0, fontSize: 15, lineHeight: 1.6, color: "#63625b" }}>
          Same outpatient family-medicine encounter, three visual systems. All three show the moats: <b style={{ color: "#3f3e38" }}>the exam left blank instead of hallucinated</b>, <b style={{ color: "#3f3e38" }}>inferred vs. spoken highlighting</b>, <b style={{ color: "#3f3e38" }}>RxNorm dose flags</b>, and the <b style={{ color: "#3f3e38" }}>auto-surfaced Q&amp;A cheat-sheet</b>. Reference options in chat as <a href="#1a" style={{ color: "#5f7a67" }}>1a</a>, <a href="#1b" style={{ color: "#0ea5a5" }}>1b</a>, <a href="#1c" style={{ color: "#2563eb" }}>1c</a>.
        </p>
      </div>

      <section style={{ maxWidth: 1360, margin: "0 auto", display: "flex", flexDirection: "column", gap: 56 }}>
        <div id="1a" style={{ scrollMarginTop: 24 }}>
          <DirectionHeader
            badge="1A"
            badgeStyle={{ borderRadius: 6, background: "#211f1a", color: "#fbf9f3", font: "700 13px/1 'Public Sans'" }}
            title="Journal — editorial & warm"
            titleStyle={{ font: "600 22px/1 'Newsreader',serif", color: "#211f1a" }}
            sub="Newsreader + Public Sans · paper, ink & sage · hairline rules"
          />
          <JournalMock />
        </div>

        <div id="1b" style={{ scrollMarginTop: 24 }}>
          <DirectionHeader
            badge="1B"
            badgeStyle={{ borderRadius: 8, background: "#0ea5a5", color: "#fff", font: "700 13px/1 'Plus Jakarta Sans'" }}
            title="Soft — rounded & friendly"
            titleStyle={{ font: "700 22px/1 'Sora',sans-serif", color: "#12313a" }}
            sub="Sora + Plus Jakarta Sans · cool white cards, teal · soft shadows"
          />
          <SoftMock />
        </div>

        <div id="1c" style={{ scrollMarginTop: 24 }}>
          <DirectionHeader
            badge="1C"
            badgeStyle={{ borderRadius: 5, background: "#2563eb", color: "#fff", font: "700 13px/1 'IBM Plex Sans'" }}
            title="Slate — structured power-tool"
            titleStyle={{ font: "600 22px/1 'Space Grotesk',sans-serif", color: "#0f172a" }}
            sub="Space Grotesk + IBM Plex Sans/Mono · slate & blue · data-dense, calm"
          />
          <SlateMock />
        </div>
      </section>
    </div>
  );
}
