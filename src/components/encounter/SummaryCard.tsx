"use client";

import type { TranscriptSummaryT, SummaryPointT } from "@/lib/summary/schema";
import type { TranscriptSegment } from "@/lib/note/schema";
import { T } from "@/lib/ui/tokens";

// Renders the transcript summary — the "skip the fluff" view. Every point is
// grounded: hovering shows the exact transcript line(s) it came from, so the
// summary is verifiable at a glance, never a black box.

function sourceTitle(point: SummaryPointT, segments: TranscriptSegment[]): string {
  const lines = point.segmentIds
    .map((id) => segments.find((s) => s.id === id))
    .filter((s): s is TranscriptSegment => !!s)
    .map((s) => `${s.speaker === "clinician" ? "DR" : s.speaker === "patient" ? "PT" : "—"}: ${s.text}`);
  return lines.length ? `From the transcript:\n${lines.join("\n")}` : "Source segment not found.";
}

function Bucket({
  title,
  points,
  segments,
}: {
  title: string;
  points: SummaryPointT[];
  segments: TranscriptSegment[];
}) {
  if (points.length === 0) return null;
  return (
    <div>
      <div style={{ font: `700 10.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.accentInk, marginBottom: 5 }}>
        {title}
      </div>
      <ul style={{ margin: "0 0 2px", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
        {points.map((p, i) => (
          <li
            key={i}
            title={sourceTitle(p, segments)}
            style={{ fontSize: 13.5, lineHeight: 1.5, color: T.body, cursor: "help" }}
          >
            {p.text}
            <sup style={{ font: `600 9.5px ${T.mono}`, color: T.faint, marginLeft: 3 }}>
              {p.segmentIds.length > 1 ? `×${p.segmentIds.length}` : "†"}
            </sup>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SummaryCard({
  summary,
  segments,
}: {
  summary: TranscriptSummaryT;
  segments: TranscriptSegment[];
}) {
  const total =
    summary.keyPoints.length + summary.pertinentNegatives.length + summary.patientConcerns.length;

  return (
    <div style={{ marginBottom: 16, padding: "13px 15px", background: T.accentBg2, border: `1px solid ${T.accentLine}`, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ font: `600 15px/1 ${T.serif}`, color: T.ink }}>Visit summary</div>
        <div style={{ fontSize: 11, color: T.faint }}>
          {summary.model === "mock" ? (
            <span style={{ color: T.amberInk, background: T.amberBg, borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>
              stub mode — extractive
            </span>
          ) : (
            summary.model
          )}
          <span style={{ marginLeft: 6 }}>hover a point for its source lines</span>
        </div>
      </div>

      {total === 0 ? (
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
          Nothing clinically salient found in this transcript — honestly nothing, rather than a padded summary.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Bucket title="Key points" points={summary.keyPoints} segments={segments} />
          <Bucket title="Pertinent negatives" points={summary.pertinentNegatives} segments={segments} />
          <Bucket title="Patient concerns" points={summary.patientConcerns} segments={segments} />
        </div>
      )}
    </div>
  );
}
