import { T } from "@/lib/ui/tokens";

// Marketing landing page — shown at "/" to signed-out visitors (signed-in
// clinicians get their case dashboard). Ported from Deimira's "Pabaid Home"
// Claude Design with the truth pass she approved (2026-07-08):
//   • pricing: $99 solo / $399 clinic of 6 (not the design's $299/$399)
//   • trial: 14 days, card required (not 7-day no-card)
//   • no fabricated claims: SOC 2 badge, fake clinic logos, invented stats,
//     native apps, ambient capture, and EHR sync are replaced with what the
//     product actually does today. The honest substitute for social proof is
//     the live sample encounter — proof a visitor can touch.

const S = {
  mono: `'IBM Plex Mono',monospace`,
  wrap: { maxWidth: 1160, margin: "0 auto", padding: "0 32px" } as const,
  kicker: {
    font: `600 11px/1 'IBM Plex Mono',monospace`,
    letterSpacing: ".1em",
    color: T.accent,
    marginBottom: 14,
  } as const,
  h2: {
    fontFamily: T.serif,
    fontWeight: 400,
    fontSize: "clamp(30px, 4vw, 40px)",
    lineHeight: 1.12,
    letterSpacing: "-.015em",
    margin: "0 0 14px",
    color: T.ink,
  } as const,
  darkBtn: {
    fontSize: 15,
    fontWeight: 600,
    color: "#F7F6F2",
    background: T.ink,
    borderRadius: 11,
    padding: "14px 26px",
    whiteSpace: "nowrap",
    display: "inline-block",
  } as const,
  ghostBtn: {
    fontSize: 15,
    fontWeight: 600,
    color: T.ink,
    background: "#fff",
    border: "1px solid #E0DDD2",
    borderRadius: 11,
    padding: "14px 24px",
    whiteSpace: "nowrap",
    display: "inline-block",
  } as const,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={S.kicker}>{children}</div>;
}

function Check({ dark }: { dark?: boolean }) {
  return (
    <span
      style={{
        width: 19,
        height: 19,
        borderRadius: "50%",
        background: dark ? "#a8c6b1" : T.accent,
        color: dark ? "#211f19" : "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      ✓
    </span>
  );
}

export function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(120% 90% at 50% -10%, #F7F6F2 0%, #EDECE6 70%)", color: T.ink, fontFamily: T.sans }}>
      <style>{`
        @keyframes pbPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.25;transform:scale(.65);}}
        @keyframes pbWave{0%,100%{transform:scaleY(.22);}50%{transform:scaleY(1);}}
        .pb-btn{transition:transform .1s ease,box-shadow .16s ease;cursor:pointer;}
        .pb-btn:hover{transform:translateY(-1px);}
        .pb-card{transition:box-shadow .25s ease,transform .25s ease;}
        .pb-card:hover{transform:translateY(-3px);box-shadow:0 26px 50px -34px rgba(50,42,26,.5);}
        .pb-link{transition:color .15s ease;}
        .pb-link:hover{color:#4E6B57;}
        .lp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
        .lp-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
        .lp-grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;}
        @media (max-width:900px){.lp-grid5{grid-template-columns:repeat(2,1fr);}}
        @media (max-width:560px){.lp-grid5{grid-template-columns:1fr;}}
        .lp-hero{display:grid;grid-template-columns:1.08fr .92fr;gap:52px;align-items:center;}
        .lp-split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
        @media (max-width:900px){.lp-grid3{grid-template-columns:1fr;}.lp-hero,.lp-split,.lp-grid2{grid-template-columns:1fr;gap:24px;}.lp-nav{display:none;}}
      `}</style>

      {/* ============ NAV ============ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(247,246,242,.82)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #E6E4DB",
        }}
      >
        <div style={{ ...S.wrap, padding: "15px 32px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: `600 21px/1 ${T.serif}`, letterSpacing: "-.01em" }}>
              <span style={{ width: 15, height: 15, borderRadius: "50%", background: `conic-gradient(${T.accent} 0 50%,${T.ink} 0 100%)`, display: "inline-block" }} />
              Pabaid
            </span>
            <span style={{ font: `500 11px/1 ${S.mono}`, color: "#a29d92" }}>/pab·aid/</span>
          </div>
          <nav className="lp-nav" style={{ display: "flex", gap: 28, marginLeft: 38, fontSize: 14, color: "#6b6658" }}>
            <a href="#product" className="pb-link">Product</a>
            <a href="#how" className="pb-link">How it works</a>
            <a href="#reference" className="pb-link">Reference</a>
            <a href="#security" className="pb-link">Security</a>
            <a href="#pricing" className="pb-link">Pricing</a>
          </nav>
          <div style={{ flex: 1 }} />
          <a href="/auth/login" className="pb-link" style={{ fontSize: 14, fontWeight: 500, color: "#6b6658" }}>
            Sign in
          </a>
          <a href="/auth/signup" className="pb-btn" style={{ fontSize: 13.5, fontWeight: 600, color: "#F7F6F2", background: T.ink, borderRadius: 9, padding: "9px 17px", whiteSpace: "nowrap" }}>
            Try it for free
          </a>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section style={{ ...S.wrap, padding: "60px 32px 36px" }}>
        <div className="lp-hero">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 26 }}>
              <span style={{ font: `500 11px/1 ${S.mono}`, letterSpacing: ".06em", color: T.accent, background: T.accentBg, border: "1px solid #DCE6DD", borderRadius: 20, padding: "6px 13px" }}>
                AI FOR INDEPENDENT CLINICIANS
              </span>
            </div>
            <h1 style={{ fontFamily: T.serif, fontWeight: 400, fontSize: "clamp(34px, 5vw, 52px)", lineHeight: 1.06, letterSpacing: "-.02em", margin: "0 0 22px" }}>
              The scribe that writes only what you <span style={{ fontStyle: "italic", color: T.accent }}>actually said</span> — and answers what you&rsquo;d have looked up.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5c574a", maxWidth: 520, margin: "0 0 34px" }}>
              Pabaid turns the visit into a clean, concise note. No invented exams, no note bloat,
              every dose checked against its cited ceiling. And when a question comes up mid-visit,
              the answer arrives in seconds, with its sources named.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
              <a href="/auth/signup" className="pb-btn" style={{ ...S.darkBtn, boxShadow: "0 14px 30px -14px rgba(33,31,25,.55)" }}>
                Try it for free for 14 days
              </a>
              <a href="/sample" className="pb-btn" style={S.ghostBtn}>
                Explore a sample encounter
              </a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#8b8779" }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: T.accentBg, color: T.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>✓</span>
              Cancel anytime during the trial — you won&rsquo;t be charged · NPI verification is instant
            </div>
          </div>

          {/* the real product, not stock footage: the sample encounter mid
              dose-catch, cropped straight from the live app */}
          <a href="/sample" style={{ position: "relative", height: 520, borderRadius: 20, overflow: "hidden", border: "1px solid #E0DDD2", boxShadow: "0 50px 90px -55px rgba(50,42,26,.6)", background: "#fff", display: "block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-encounter.png" alt="Pabaid catching a 200 mg lisinopril dose against its cited 80 mg ceiling" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top left" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(33,31,25,.18) 0%, rgba(33,31,25,0) 26%, rgba(33,31,25,0) 62%, rgba(33,31,25,.44) 100%)" }} />
            <div style={{ position: "absolute", left: 22, top: 20, display: "flex", alignItems: "center", gap: 8, font: `500 11px/1 ${S.mono}`, letterSpacing: ".04em", color: "#fff", background: "rgba(33,31,25,.42)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "7px 13px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8875f", display: "inline-block", animation: "pbPulse 1.5s ease-in-out infinite" }} />
              Live sample — click to try it
            </div>
            <div style={{ position: "absolute", right: 20, bottom: 20, textAlign: "right", color: "#fff", textShadow: "0 1px 10px rgba(0,0,0,.45)" }}>
              <div style={{ font: `500 17px/1.2 ${T.serif}` }}>The dose flag, mid-catch</div>
              <div style={{ fontSize: 12, color: "#e6e3d9", marginTop: 3 }}>Real product, synthetic patient</div>
            </div>
          </a>
        </div>
      </section>

      {/* ============ PRODUCT FRAME ============ */}
      <section style={{ ...S.wrap, padding: "4px 32px 40px" }}>
        <div style={{ marginTop: 24, background: "#fff", border: "1px solid #E6E4DB", borderRadius: 18, boxShadow: "0 50px 90px -55px rgba(50,42,26,.55)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 18px", borderBottom: "1px solid #EEEDE6", background: "#FCFBF8" }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E6D5CA" }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#E9E2CE" }} />
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#DDE6DE" }} />
            <span style={{ flex: 1 }} />
            <span style={{ font: `500 11px/1 ${S.mono}`, color: "#a29d92" }}>pabaid.com</span>
          </div>
          <div className="lp-grid2" style={{ gap: 0 }}>
            <div style={{ padding: "24px 26px", borderRight: "1px solid #EEEDE6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#c1502a", display: "inline-block", animation: "pbPulse 1.5s ease-in-out infinite" }} />
                <span style={{ fontSize: 12, color: "#a8a396", fontStyle: "italic" }}>
                  &ldquo;…home monitor&rsquo;s reading 150s over 90s, and the right knee hurts going up stairs.&rdquo;
                </span>
              </div>
              <div style={{ font: `500 19px/1 ${T.serif}`, marginBottom: 16 }}>Visit note</div>
              <div style={{ font: `600 10px/1 ${T.sans}`, letterSpacing: ".18em", textTransform: "uppercase", color: T.accent, marginBottom: 8 }}>Subjective</div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: T.body, margin: "0 0 16px" }}>
                58F, hypertension follow-up. Morning headaches; home BP <b style={{ fontWeight: 600 }}>150s/90s</b> ×2 wks. New right-knee pain ~3 wks, worse on stairs; denies trauma.{" "}
                <span style={{ background: T.amberBg, boxShadow: `inset 0 -1px 0 ${T.amberLine}`, padding: "0 3px", borderRadius: 3, color: T.amberInk }}>
                  ROS otherwise negative.<sup style={{ fontSize: 9, fontWeight: 700, color: "#9a7a1e" }}>AI</sup>
                </span>
              </p>
              <div style={{ font: `600 10px/1 ${T.sans}`, letterSpacing: ".18em", textTransform: "uppercase", color: T.accent, marginBottom: 8 }}>Objective</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, font: `500 13px/1 ${S.mono}`, marginBottom: 9 }}>BP 152/94 · HR 78</div>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 13px", border: `1px dashed ${T.guardLine}`, borderRadius: 10, background: T.guardBg, fontSize: 12, color: "#8a8069", lineHeight: 1.5 }}>
                <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #C6BCA3", color: "#a99a78", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>✓</span>
                Exam left blank — nothing was verbalized. No template inserted.
              </div>
              <div style={{ font: `600 10px/1 ${T.sans}`, letterSpacing: ".18em", textTransform: "uppercase", color: T.accent, margin: "16px 0 8px" }}>Plan</div>
              <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "11px 13px", background: T.redBg, border: `1px solid ${T.redLine}`, borderRadius: 10 }}>
                <span style={{ color: "#b0402f", fontSize: 14, flexShrink: 0 }}>⚠</span>
                <div style={{ fontSize: 12, color: T.redInk, lineHeight: 1.5 }}>
                  <b style={{ fontWeight: 600 }}>lisinopril 200 mg/day</b> exceeds the cited 80 mg ceiling. Likely &ldquo;20 mg.&rdquo;
                </div>
              </div>
            </div>
            <div style={{ padding: "24px 22px", background: T.panelBg }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, font: `600 10px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.accent, marginBottom: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, display: "inline-block", animation: "pbPulse 2s ease-in-out infinite" }} />
                Surfaced for you
              </div>
              <div style={{ background: "#fff", border: "1px solid #E9E7DE", borderRadius: 12, padding: "15px 16px" }}>
                <div style={{ font: `500 15px/1.3 ${T.serif}`, marginBottom: 9 }}>Hypertension — first line</div>
                <ul style={{ margin: 0, paddingLeft: 15, fontSize: 12, lineHeight: 1.65, color: "#43413a" }}>
                  <li>Thiazide, ACE-i/ARB, or CCB.</li>
                  <li>Target <span style={{ fontFamily: S.mono, fontSize: 11 }}>&lt;130/80</span>.</li>
                  <li>Reassess 2–4 wks; monitor K⁺.</li>
                </ul>
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <span style={{ font: `500 9.5px ${S.mono}`, color: T.accent, background: T.accentBg, borderRadius: 5, padding: "3px 8px" }}>AAFP</span>
                  <span style={{ font: `500 9.5px ${S.mono}`, color: T.accent, background: T.accentBg, borderRadius: 5, padding: "3px 8px" }}>ACC/AHA</span>
                </div>
              </div>
              <div style={{ marginTop: 13, font: `400 10px/1.5 ${S.mono}`, color: T.faint, textAlign: "center" }}>cited from the library · never invented</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HONEST TRUST BAR ============ */}
      <section style={{ borderTop: "1px solid #E6E4DB", borderBottom: "1px solid #E6E4DB", background: "#FCFBF8" }}>
        <div style={{ ...S.wrap, padding: "26px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 34, flexWrap: "wrap", fontSize: 13, color: "#8b8779" }}>
          <span>Clinicians verified against the NPPES registry</span>
          <span style={{ color: "#d8d3c6" }}>·</span>
          <span>Records pseudonymous by default</span>
          <span style={{ color: "#d8d3c6" }}>·</span>
          <span>Decision support, not a diagnosis</span>
        </div>
      </section>

      {/* ============ MOATS ============ */}
      <section id="product" style={{ ...S.wrap, padding: "80px 32px 20px" }}>
        <div style={{ maxWidth: 640, marginBottom: 44 }}>
          <SectionLabel>WHY CLINICIANS SWITCH</SectionLabel>
          <h2 style={S.h2}>Built around the three things doctors don&rsquo;t trust AI scribes to do.</h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5c574a", margin: 0 }}>
            Scribes invent normal exams, bury the plan in paragraphs, and mis-hear doses. Pabaid was designed to do the opposite.
          </p>
        </div>
        <div className="lp-grid3">
          <div className="pb-card" style={{ background: "#fff", border: "1px solid #E6E4DB", borderRadius: 16, padding: "26px 24px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: T.guardBg, border: `1px dashed ${T.guardLine}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#a99a78", marginBottom: 18 }}>✓</div>
            <h3 style={{ font: `500 20px/1.25 ${T.serif}`, margin: "0 0 9px" }}>It never fabricates an exam</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#5c574a", margin: 0 }}>
              If you didn&rsquo;t say it, it isn&rsquo;t in the note. The objective section stays blank rather than templating a fake &ldquo;normal&rdquo; exam.
            </p>
          </div>
          <div className="pb-card" style={{ background: "#fff", border: "1px solid #E6E4DB", borderRadius: 16, padding: "26px 24px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "#FBF3E0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <span style={{ width: 16, height: 10, borderRadius: 2, background: T.amberBg, boxShadow: `inset 0 -2px 0 ${T.amberLine}` }} />
            </div>
            <h3 style={{ font: `500 20px/1.25 ${T.serif}`, margin: "0 0 9px" }}>You see what was inferred</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#5c574a", margin: 0 }}>
              Anything Pabaid inferred rather than heard is highlighted, so proofreading takes seconds. Concise notes that read like you wrote them.
            </p>
          </div>
          <div className="pb-card" style={{ background: "#fff", border: "1px solid #E6E4DB", borderRadius: 16, padding: "26px 24px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: T.redBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#b0402f", fontSize: 18, marginBottom: 18 }}>⚠</div>
            <h3 style={{ font: `500 20px/1.25 ${T.serif}`, margin: "0 0 9px" }}>Every dose is checked</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#5c574a", margin: 0 }}>
              Drug names and doses are checked against cited reference ceilings and FDA boxed warnings. A 200 mg that should be 20 mg gets flagged before you sign.
            </p>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" style={{ ...S.wrap, padding: "80px 32px" }}>
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}>
          <SectionLabel>WEB &amp; MOBILE, ONE VISIT</SectionLabel>
          <h2 style={S.h2}>The desktop charts. The phone answers.</h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5c574a", margin: 0 }}>
            You&rsquo;re with the patient. Charting happens on the desktop; the reference lives in your palm.
          </p>
        </div>
        <div className="lp-grid2" style={{ alignItems: "stretch" }}>
          <div style={{ background: "#fff", border: "1px solid #E6E4DB", borderRadius: 18, padding: "32px 30px", display: "flex", flexDirection: "column" }}>
            <div style={{ font: `500 12px/1 ${S.mono}`, color: "#a29d92", marginBottom: 8 }}>01 · DESKTOP</div>
            <h3 style={{ font: `500 24px/1.2 ${T.serif}`, margin: "0 0 10px" }}>Dictate the visit. It drafts as you speak.</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5c574a", margin: "0 0 24px" }}>
              One tap starts dictation (with the patient&rsquo;s consent on record). Pabaid labels who said what, grounds every line of the note in the transcript, and stages ICD-10 codes as you go.
            </p>
            <div style={{ marginTop: "auto", background: "#FCFBF8", border: "1px solid #EEEDE6", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 40, marginBottom: 14 }}>
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.35, 0.15].map((d, i) => (
                  <span key={i} style={{ width: 3, height: "100%", background: T.accent, borderRadius: 3, transformOrigin: "center", animation: `pbWave 1s ease-in-out infinite`, animationDelay: `${d}s` }} />
                ))}
              </div>
              <div style={{ font: `500 12px/1 ${S.mono}`, color: "#9a5a2a", textAlign: "center" }}>REC 04:12 · transcribing</div>
            </div>
          </div>
          <div style={{ background: T.ink, borderRadius: 18, padding: "32px 30px", color: "#F5F4EF", display: "flex", flexDirection: "column" }}>
            <div style={{ font: `500 12px/1 ${S.mono}`, color: "#8f8a7c", marginBottom: 8 }}>02 · MOBILE</div>
            <h3 style={{ font: `500 24px/1.2 ${T.serif}`, margin: "0 0 10px", color: "#F5F4EF" }}>The answer&rsquo;s already in your hand.</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#c3bfb2", margin: "0 0 24px" }}>
              Install Pabaid to your phone&rsquo;s home screen and the same cited answers travel with you. Ask a question in plain language and get a three-bullet, sourced reply in seconds.
            </p>
            <div style={{ marginTop: "auto", background: "#2a2823", borderRadius: 14, padding: "16px 17px" }}>
              <div style={{ font: `600 9px/1 ${T.sans}`, letterSpacing: ".14em", textTransform: "uppercase", color: "#7fa38b", marginBottom: 9 }}>Surfaced · Hypertension</div>
              <div style={{ fontSize: 13, color: "#e6e3d9", lineHeight: 1.55 }}>
                Thiazide, ACE-i/ARB, or CCB. Target <span style={{ fontFamily: S.mono, fontSize: 12 }}>&lt;130/80</span>. Reassess 2–4 wks.
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <span style={{ font: `500 9.5px ${S.mono}`, color: "#a8c6b1", background: "#33362d", borderRadius: 5, padding: "3px 8px" }}>AAFP</span>
                <span style={{ font: `500 9.5px ${S.mono}`, color: "#a8c6b1", background: "#33362d", borderRadius: 5, padding: "3px 8px" }}>ACC/AHA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ REFERENCE ============ */}
      <section id="reference" style={{ background: T.accentBg, borderTop: "1px solid #DCE6DD", borderBottom: "1px solid #DCE6DD" }}>
        <div className="lp-split" style={{ ...S.wrap, padding: "80px 32px" }}>
          <div>
            <SectionLabel>THE REFERENCE ENGINE</SectionLabel>
            <h2 style={{ ...S.h2, fontSize: 38 }}>Stop closing the chart to open a textbook.</h2>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "#4a5347", margin: "0 0 22px" }}>
              Ask a clinical question in plain language and get a short, cited answer drawn from
              evidence-based guidelines. Every response shows the patient data it used and names
              its sources, so you can check its work.
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 13 }}>
              <li style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14.5, color: "#3c4539", lineHeight: 1.5 }}>
                <Check />Every answer names its source — USPSTF, AAFP, ACC/AHA, NICE.
              </li>
              <li style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14.5, color: "#3c4539", lineHeight: 1.5 }}>
                <Check />Guideline cards surface themselves for the diagnosis on screen.
              </li>
              <li style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14.5, color: "#3c4539", lineHeight: 1.5 }}>
                <Check />Seven regional frameworks built in — US, UK, Canada, Australia, NZ, Ireland, WHO — detected from where you practice.
              </li>
            </ul>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E0DDD2", borderRadius: 16, padding: 22, boxShadow: "0 40px 70px -50px rgba(50,42,26,.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", border: "1px solid #E6E4DB", borderRadius: 10, marginBottom: 16 }}>
              <span style={{ color: T.accent }}>⚲</span>
              <span style={{ fontSize: 13.5, color: "#5c574a" }}>Colon cancer screening interval with family history?</span>
            </div>
            <div style={{ font: `600 10px/1 ${T.sans}`, letterSpacing: ".14em", textTransform: "uppercase", color: T.accent, marginBottom: 10 }}>Answer</div>
            <ul style={{ margin: "0 0 16px", paddingLeft: 16, fontSize: 13.5, lineHeight: 1.7, color: T.body }}>
              <li>Begin at <b style={{ fontWeight: 600 }}>age 40</b>, or 10 years before the youngest affected relative&rsquo;s diagnosis — whichever is earlier.</li>
              <li>Colonoscopy <b style={{ fontWeight: 600 }}>every 5 years</b> (vs. 10 for average risk).</li>
            </ul>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 14, borderTop: "1px solid #EEEDE6", font: `400 11px ${S.mono}`, color: "#a29d92" }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: T.accentBg, color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✓</span>
              cited · USPSTF, ACG
            </div>
          </div>
        </div>
      </section>

      {/* ============ HONEST STATS ============ */}
      <section style={{ ...S.wrap, padding: "72px 32px" }}>
        <div className="lp-grid3" style={{ gap: 0, border: "1px solid #E6E4DB", borderRadius: 16, overflow: "hidden", background: "#fff" }}>
          <div style={{ padding: "36px 32px", borderRight: "1px solid #EEEDE6" }}>
            <div style={{ font: `400 52px/1 ${T.serif}`, color: T.accent, marginBottom: 8 }}>~11&nbsp;s</div>
            <div style={{ fontSize: 14, color: "#5c574a", lineHeight: 1.5 }}>from question to cited answer, measured on the live product</div>
          </div>
          <div style={{ padding: "36px 32px", borderRight: "1px solid #EEEDE6" }}>
            <div style={{ font: `400 52px/1 ${T.serif}`, color: T.accent, marginBottom: 8 }}>2&nbsp;min</div>
            <div style={{ fontSize: 14, color: "#5c574a", lineHeight: 1.5 }}>to sign up — NPI verification is instant, no enterprise contract</div>
          </div>
          <div style={{ padding: "36px 32px" }}>
            <div style={{ font: `400 52px/1 ${T.serif}`, color: T.accent, marginBottom: 8 }}>7</div>
            <div style={{ fontSize: 14, color: "#5c574a", lineHeight: 1.5 }}>guideline frameworks — US, UK, Canada, Australia, NZ, Ireland, WHO</div>
          </div>
        </div>
      </section>

      {/* ============ BETA REVIEWS ============ */}
      {/* Honest social proof: 20 clinicians are beta testing now; their
          reviews land in these slots at launch. Reserved slots, never
          fabricated quotes — and the open seats are real scarcity. */}
      <section id="beta" style={{ ...S.wrap, padding: "8px 32px 80px" }}>
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 40px" }}>
          <SectionLabel>THE FIRST TWENTY</SectionLabel>
          <h2 style={S.h2}>Twenty clinicians are shaping Pabaid right now.</h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5c574a", margin: 0 }}>
            Their reviews will live here, unedited, at launch. Until then these seats are
            reserved — and a few are still open.
          </p>
        </div>
        <div className="lp-grid5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ border: "1.5px dashed #D8D4C7", borderRadius: 14, padding: "22px 18px", background: "rgba(255,255,255,.55)", display: "flex", flexDirection: "column", minHeight: 170 }}>
              <div style={{ font: `400 30px/1 ${T.serif}`, color: "#D8D4C7" }}>&ldquo;</div>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: "#a29d92" }}>
                Reserved for a beta clinician&rsquo;s honest review.
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "#b4afa1" }}>
                Beta clinician #{n}
                <span style={{ display: "block", font: `400 10px ${S.mono}`, marginTop: 2 }}>review pending</span>
              </div>
            </div>
          ))}
          <a href="/auth/signup" className="pb-card" style={{ border: `1.5px solid ${T.accent}`, borderRadius: 14, padding: "22px 18px", background: T.accentBg, display: "flex", flexDirection: "column", minHeight: 170 }}>
            <div style={{ font: `400 30px/1 ${T.serif}`, color: T.accent }}>+</div>
            <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: "#3c5646", fontWeight: 600 }}>
              This seat could be yours. Beta clinicians get direct input on the roadmap.
            </div>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: T.accent }}>Join the beta →</div>
          </a>
        </div>
      </section>

      {/* ============ SECURITY ============ */}
      <section id="security" style={{ background: T.ink, color: "#E6E3D9" }}>
        <div className="lp-split" style={{ ...S.wrap, padding: "76px 32px" }}>
          <div>
            <div style={{ ...S.kicker, color: "#7fa38b" }}>SECURITY &amp; PRIVACY</div>
            <h2 style={{ ...S.h2, fontSize: 38, color: "#F5F4EF" }}>Built for protected health information from day one.</h2>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "#b4afa1", margin: 0 }}>
              Encrypted in transit and at rest on HIPAA-eligible infrastructure, with a business
              associate agreement program in progress ahead of general availability. The strongest
              protection is architectural: Pabaid never needs a patient&rsquo;s name to work.
            </p>
          </div>
          <div className="lp-grid2" style={{ gap: 14 }}>
            {[
              ["ISOLATION", "Row-level security scopes every chart to its own clinician"],
              ["PSEUDONYMOUS", "No patient name or date of birth required, ever"],
              ["ENCRYPTED", "AES-256 at rest, TLS in transit"],
              ["AUDITED", "An append-only trail records every CDS query"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#2a2823", border: "1px solid #38362f", borderRadius: 13, padding: 20 }}>
                <div style={{ font: `500 13px/1 ${S.mono}`, color: "#a8c6b1", marginBottom: 9 }}>{k}</div>
                <div style={{ fontSize: 13, color: "#c3bfb2", lineHeight: 1.5 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" style={{ ...S.wrap, padding: "82px 32px" }}>
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 46px" }}>
          <SectionLabel>SIMPLE, PER-CLINICIAN PRICING</SectionLabel>
          <h2 style={S.h2}>Two weeks free. Upgrade when it&rsquo;s saving you hours.</h2>
          {/* Anchor first: the market price frames ours before a card is read. */}
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#5c574a", margin: 0 }}>
            A scribe alone runs <b style={{ fontWeight: 600, color: T.ink }}>$79–$399</b> per
            clinician per month. Pabaid is the scribe, the reference, and the safety net —
            together:
          </p>
        </div>
        <div className="lp-grid2" style={{ maxWidth: 760, margin: "0 auto" }}>
          <div className="pb-card" style={{ background: "#fff", border: "1px solid #E6E4DB", borderRadius: 18, padding: "30px 28px", display: "flex", flexDirection: "column" }}>
            <div style={{ font: `500 14px/1 ${S.mono}`, color: T.accent, marginBottom: 16 }}>Solo</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
              <span style={{ font: `400 46px/1 ${T.serif}` }}>$99</span>
              <span style={{ fontSize: 14, color: "#8b8779" }}>/ clinician / mo</span>
            </div>
            <div style={{ fontSize: 13, color: "#8b8779", marginBottom: 22 }}>Billed monthly · cancel anytime</div>
            <ul style={{ margin: "0 0 26px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
              {["Dictated notes with provenance highlighting", "Dose ceilings, boxed warnings, allergy conflicts", "Cited reference engine, 7 frameworks", "Web + install to any phone"].map((f) => (
                <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: "#3c3a33" }}>
                  <span style={{ color: T.accent }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href="/auth/signup" className="pb-btn" style={{ marginTop: "auto", textAlign: "center", fontSize: 14.5, fontWeight: 600, color: T.ink, background: "#fff", border: `1px solid ${T.ink}`, borderRadius: 11, padding: 13, display: "block" }}>
              Try it for free for 14 days
            </a>
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "#8b8779" }}>
              Cancel anytime during the trial — you won&rsquo;t be charged.
            </div>
          </div>
          <div className="pb-card" style={{ background: T.ink, border: `1px solid ${T.ink}`, borderRadius: 18, padding: "30px 28px", color: "#F5F4EF", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: 20, right: 22, font: `500 10px/1 ${S.mono}`, color: T.ink, background: "#C9D8CD", borderRadius: 20, padding: "5px 11px", letterSpacing: ".04em" }}>BEST VALUE</div>
            <div style={{ font: `500 14px/1 ${S.mono}`, color: "#a8c6b1", marginBottom: 16 }}>Clinic</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
              <span style={{ font: `400 46px/1 ${T.serif}`, color: "#F5F4EF" }}>$399</span>
              <span style={{ fontSize: 14, color: "#a29d92" }}>/ mo · up to 6 clinicians</span>
            </div>
            <div style={{ fontSize: 13, color: "#a29d92", marginBottom: 22 }}>$66.50 per clinician · larger teams, talk to us</div>
            <ul style={{ margin: "0 0 26px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
              {["Everything in Solo, for the whole practice", "Six seats under one bill", "Shared patient continuity across the clinic", "Priority support"].map((f) => (
                <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: "#e6e3d9" }}>
                  <span style={{ color: "#a8c6b1" }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href="/auth/signup" className="pb-btn" style={{ marginTop: "auto", textAlign: "center", fontSize: 14.5, fontWeight: 600, color: T.ink, background: "#F5F4EF", borderRadius: 11, padding: 13, display: "block" }}>
              Try it for free for 14 days
            </a>
            <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "#a29d92" }}>
              Cancel anytime during the trial — you won&rsquo;t be charged.
            </div>
          </div>
        </div>
      </section>

      {/* ============ CLOSING CTA ============ */}
      <section style={{ ...S.wrap, padding: "0 32px", marginBottom: 20 }}>
        <div style={{ background: T.accentBg, border: "1px solid #DCE6DD", borderRadius: 20, padding: "64px 40px", textAlign: "center" }}>
          <h2 style={{ font: `400 42px/1.1 ${T.serif}`, letterSpacing: "-.02em", margin: "0 0 16px" }}>
            Chart less. Look up nothing. <span style={{ fontStyle: "italic", color: T.accent }}>See more patients.</span>
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#4a5347", maxWidth: 520, margin: "0 auto 30px" }}>
            Tonight&rsquo;s charting doesn&rsquo;t have to follow you home. Try the sample
            encounter right now, no account needed — then bring Pabaid to your next clinic day.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/auth/signup" className="pb-btn" style={{ ...S.darkBtn, fontSize: 16, borderRadius: 12, padding: "15px 30px", boxShadow: "0 16px 34px -16px rgba(33,31,25,.6)" }}>
              Try it for free for 14 days
            </a>
            <a href="/sample" className="pb-btn" style={{ ...S.ghostBtn, fontSize: 16, borderRadius: 12, padding: "15px 28px" }}>
              Explore the sample
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ borderTop: "1px solid #E6E4DB", marginTop: 60 }}>
        <div style={{ ...S.wrap, padding: "40px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, font: `600 18px/1 ${T.serif}` }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", background: `conic-gradient(${T.accent} 0 50%,${T.ink} 0 100%)`, display: "inline-block" }} />
              Pabaid
            </span>
            <span style={{ font: `500 10px/1 ${S.mono}`, color: "#a29d92" }}>/pab·aid/</span>
          </div>
          <div style={{ display: "flex", gap: 26, fontSize: 13, color: "#8b8779" }}>
            <a href="#product" className="pb-link">Product</a>
            <a href="#security" className="pb-link">Security</a>
            <a href="#pricing" className="pb-link">Pricing</a>
            <a href="/sample" className="pb-link">Sample</a>
          </div>
          <div style={{ fontSize: 12, color: "#b4afa1" }}>© 2026 Pabaid · pabaid.com</div>
        </div>
      </footer>
    </div>
  );
}
