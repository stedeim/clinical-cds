import { T } from "@/lib/ui/tokens";
import { betaSeats } from "@/lib/beta";
import { ClaimSeatForm, WaitlistForm } from "@/components/beta/BetaForms";

// Founding-beta recruitment + waitlist page. Psychology, applied honestly:
//   • RECIPROCITY — the interactive sample is offered above the fold; a doctor
//     can feel the product before any ask (no account, real data flows).
//   • REAL SCARCITY — exactly 20 founding seats exist (20 codes); the count of
//     remaining is live from the database, never inflated.
//   • GOAL GRADIENT — the seat meter shows how full the cohort is.
//   • OWNERSHIP — founding members shape the roadmap; their (unedited) reviews
//     become the launch social proof.
//   • LOSS AVERSION — when the seats are gone they're gone; the honest
//     alternative is the waitlist, framed as the lesser outcome.
//   • SMART DEFAULTS — two paths, the code path marked as the primary one.
// Warm-paper design system, shared with the app so the whole journey is one
// surface.

export const metadata = {
  title: "Founding beta — Pabaid",
  description:
    "Twenty independent clinicians are shaping Pabaid. Free during beta, in exchange for an honest review.",
};

const S = {
  mono: `'IBM Plex Mono',monospace`,
  wrap: { maxWidth: 940, margin: "0 auto", padding: "0 24px" } as const,
};

export default async function BetaPage() {
  const seats = await betaSeats();
  const pct = Math.round((seats.claimed / seats.total) * 100);
  const full = seats.remaining <= 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(120% 90% at 50% -10%, #F7F6F2 0%, #EDECE6 70%)",
        color: T.ink,
        fontFamily: T.sans,
        paddingBottom: 80,
      }}
    >
      {/* Slim brand bar (its own chrome; the app header only shows signed-in) */}
      <header style={{ ...S.wrap, display: "flex", alignItems: "center", gap: 10, padding: "18px 24px" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 9, font: `600 20px/1 ${T.serif}`, color: T.ink, textDecoration: "none" }}>
          <span style={{ width: 15, height: 15, borderRadius: "50%", background: `conic-gradient(${T.accent} 0 50%,${T.ink} 0 100%)`, display: "inline-block" }} />
          Pabaid
        </a>
        <div style={{ flex: 1 }} />
        <a href="/auth/login" style={{ fontSize: 14, fontWeight: 500, color: "#6b6658", textDecoration: "none" }}>
          Sign in
        </a>
      </header>

      {/* ===== HERO ===== */}
      <section style={{ ...S.wrap, padding: "28px 24px 8px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, font: `500 11px/1 ${S.mono}`, letterSpacing: ".06em", color: T.accent, background: T.accentBg, border: "1px solid #DCE6DD", borderRadius: 20, padding: "6px 13px", marginBottom: 22 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, display: "inline-block" }} />
          FOUNDING BETA · {seats.total} SEATS
        </div>
        <h1 style={{ fontFamily: T.serif, fontWeight: 400, fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.08, letterSpacing: "-.02em", margin: "0 auto 18px", maxWidth: 720 }}>
          Twenty independent clinicians are shaping Pabaid.{" "}
          <span style={{ fontStyle: "italic", color: T.accent }}>One seat could be yours.</span>
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5c574a", maxWidth: 560, margin: "0 auto 26px" }}>
          A scribe that writes only what you said, a safety net that checks every dose, and cited
          answers mid-visit. Founding members use it free for the whole beta — the only ask is an
          honest review once you&rsquo;ve run real clinic days on it.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/sample" style={{ fontSize: 15, fontWeight: 600, color: "#fff", background: T.ink, borderRadius: 11, padding: "13px 24px", textDecoration: "none", boxShadow: "0 14px 30px -14px rgba(33,31,25,.55)" }}>
            Try the live sample — no account
          </a>
          <a href="#claim" style={{ fontSize: 15, fontWeight: 600, color: T.ink, background: "#fff", border: "1px solid #E0DDD2", borderRadius: 11, padding: "13px 24px", textDecoration: "none" }}>
            {full ? "Join the waitlist" : "Claim a seat"}
          </a>
        </div>
      </section>

      {/* ===== SEAT METER (real scarcity + goal gradient) ===== */}
      <section style={{ ...S.wrap, padding: "34px 24px" }}>
        <div style={{ background: "#fff", border: "1px solid #E6E4DB", borderRadius: 16, padding: "22px 24px", boxShadow: T.shadow, maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ font: `600 12px/1 ${T.sans}`, letterSpacing: ".08em", textTransform: "uppercase", color: T.muted }}>
              Founding seats
            </span>
            <span style={{ font: `500 13px/1 ${S.mono}`, color: full ? T.redInk : T.accentInk }}>
              {full ? "All claimed" : `${seats.remaining} of ${seats.total} left`}
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 6, background: "#EDECE6", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(pct, 6)}%`, height: "100%", background: T.accent, borderRadius: 6 }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: T.faint }}>
            {full
              ? "The founding cohort is full — join the waitlist for the next opening."
              : `${seats.claimed} claimed. When these seats are gone, new clinicians go on the waitlist until general availability.`}
          </div>
        </div>
      </section>

      {/* ===== WHAT YOU GET / WHAT WE ASK ===== */}
      <section style={{ ...S.wrap, padding: "8px 24px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, maxWidth: 720, margin: "0 auto" }} className="beta-two">
          <div style={{ background: "#fff", border: "1px solid #E6E4DB", borderRadius: 14, padding: "22px 22px" }}>
            <div style={{ font: `600 11px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.accent, marginBottom: 12 }}>
              What founding members get
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Free access for the whole beta — no card, no trial clock",
                "Direct line to shape the roadmap",
                "Your review, unedited, credited at launch",
                "Locked-in founding pricing when beta ends",
              ].map((f) => (
                <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: "#3c3a33", lineHeight: 1.5 }}>
                  <span style={{ color: T.accent }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: T.panelBg, border: "1px solid #E6E4DB", borderRadius: 14, padding: "22px 22px" }}>
            <div style={{ font: `600 11px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted, marginBottom: 12 }}>
              What we ask in return
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Use it on real clinic days — not just a test drive",
                "Tell us the truth: what works, what annoys you",
                "One honest review we can publish, in your words",
              ].map((f) => (
                <li key={f} style={{ display: "flex", gap: 10, fontSize: 14, color: "#3c3a33", lineHeight: 1.5 }}>
                  <span style={{ color: T.muted }}>·</span>
                  {f}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 14, fontSize: 12.5, color: T.faint, lineHeight: 1.5 }}>
              Honest means honest. A lukewarm review is more useful to us than a kind one.
            </p>
          </div>
        </div>
      </section>

      {/* ===== THE TWO PATHS ===== */}
      <section id="claim" style={{ ...S.wrap, padding: "8px 24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, maxWidth: 720, margin: "0 auto" }} className="beta-two">
          {/* Primary: have a code */}
          <div style={{ background: "#fff", border: `1.5px solid ${T.accent}`, borderRadius: 16, padding: "24px 22px", boxShadow: T.shadow, position: "relative" }}>
            <div style={{ position: "absolute", top: -11, left: 20, font: `600 10px/1 ${S.mono}`, letterSpacing: ".06em", color: "#fff", background: T.accent, borderRadius: 20, padding: "5px 11px" }}>
              INVITED
            </div>
            <div style={{ font: `600 16px/1.3 ${T.serif}`, color: T.ink, marginBottom: 6 }}>
              Have a founding code?
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#5c574a", margin: "0 0 16px" }}>
              Enter it to claim your seat. You&rsquo;re verified and in — no card, no paywall.
            </p>
            <ClaimSeatForm />
          </div>

          {/* Secondary: waitlist */}
          <div style={{ background: T.panelBg, border: "1px solid #E6E4DB", borderRadius: 16, padding: "24px 22px" }}>
            <div style={{ font: `600 16px/1.3 ${T.serif}`, color: T.ink, marginBottom: 6 }}>
              No code yet?
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#5c574a", margin: "0 0 16px" }}>
              {full
                ? "The founding seats are claimed. Join the waitlist and you're first in line."
                : "Join the waitlist. If a seat opens or you're a fit for the cohort, we'll reach out with a code."}
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ===== HONEST FOOTNOTE ===== */}
      <section style={{ ...S.wrap, padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12.5, color: T.faint, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
          Clinicians are verified against the NPPES registry or their licensing body. Records are
          pseudonymous by default. Pabaid is decision support — cited considerations, never
          directives — and during beta it&rsquo;s for demo and test patients: a BAA for real
          patient conversations is in progress.
        </p>
        <div style={{ marginTop: 18 }}>
          <a href="/" style={{ fontSize: 13, color: T.accentInk, textDecoration: "underline" }}>
            See the full product →
          </a>
        </div>
      </section>

      <style>{`@media (min-width:720px){.beta-two{grid-template-columns:1fr 1fr!important;}}`}</style>
    </div>
  );
}
