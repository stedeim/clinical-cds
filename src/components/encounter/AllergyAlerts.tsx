"use client";

import type { AllergyFindingT } from "@/lib/allergy/engine";
import { T } from "@/lib/ui/tokens";

// Allergy conflict banners. Red for direct/class conflicts, amber for
// documented cross-reactivity. Read-only cautions — resolving one means
// changing the med or confirming tolerance, both of which happen in the
// chart, not in a dismiss button. Every banner states its class-membership
// basis so the reasoning is checkable at a glance.

export function AllergyAlerts({ findings }: { findings: AllergyFindingT[] }) {
  if (findings.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      {findings.map((f, i) => {
        const cross = f.kind === "cross";
        const ink = cross ? T.amberInk : T.redInk;
        return (
          <div
            key={i}
            style={{
              padding: "11px 13px",
              background: cross ? T.amberBg : T.redBg,
              border: `1px solid ${cross ? T.amberLine : T.redLine}`,
              borderRadius: 10,
            }}
          >
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ color: ink, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ font: `700 12.5px/1.3 ${T.sans}`, color: ink }}>
                  Allergy {cross ? "cross-reactivity caution" : "conflict"} · {f.medication}
                </div>
                <div style={{ fontSize: 12, color: ink, lineHeight: 1.5, marginTop: 2 }}>{f.message}</div>
                <div style={{ fontSize: 10.5, color: ink, opacity: 0.75, marginTop: 3 }}>Basis: {f.basis}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
