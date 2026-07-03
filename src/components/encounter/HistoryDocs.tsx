"use client";

import { useRef, useState } from "react";
import type { PatientDocument } from "@/lib/history/store";

// Patient-history documents in the chart rail: upload (.txt / .docx / .pdf)
// and an expandable list of extracted text. Files are parsed server-side and
// the bytes discarded — what's stored and shown is the extracted text.

const T = {
  ink: "#0f2b31",
  body: "#33454a",
  muted: "#7c9096",
  faint: "#a9bbc0",
  line: "#E4E9E8",
  accent: "#0e7490",
  accentLine: "#c9e2e6",
  amberInk: "#92400e",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  mono: "'IBM Plex Mono',ui-monospace,monospace",
};

type DocRow = Pick<PatientDocument, "id" | "filename" | "format" | "ocr" | "uploadedAt" | "text">;

export function HistoryDocs({
  encounterId,
  initialDocuments,
}: {
  encounterId: string;
  initialDocuments: DocRow[];
}) {
  const [documents, setDocuments] = useState<DocRow[]>(initialDocuments);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("encounterId", encounterId);
      form.set("file", file);
      const res = await fetch("/api/history-doc", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      // Refetch the full list so the preview has the complete extracted text.
      const listRes = await fetch(`/api/history-doc?encounterId=${encodeURIComponent(encounterId)}`);
      const listData = await listRes.json();
      if (listRes.ok) setDocuments(listData.documents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ marginTop: 4, paddingTop: 13, borderTop: `1px dashed ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ font: `700 9.5px/1 ${T.sans}`, letterSpacing: ".1em", textTransform: "uppercase", color: T.muted }}>
          History documents
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{ font: `600 10.5px/1 ${T.sans}`, color: T.accent, background: "none", border: `1px solid ${T.accentLine}`, borderRadius: 7, padding: "4px 8px", cursor: "pointer" }}
        >
          {busy ? "Uploading…" : "+ Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.docx,.pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>

      {documents.length === 0 ? (
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: T.faint }}>
          Upload prior records as .txt, .docx, or .pdf — the text becomes part of this patient&rsquo;s history.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {documents.map((d) => (
            <div key={d.id}>
              <button
                onClick={() => setOpenId(openId === d.id ? null : d.id)}
                style={{ display: "flex", alignItems: "baseline", gap: 6, width: "100%", textAlign: "left", fontSize: 11.5, color: T.body, background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <span style={{ font: `600 9px/1 ${T.mono}`, color: T.accent, textTransform: "uppercase" }}>{d.format}</span>
                {d.ocr && (
                  <span
                    title="Text recognized from a scanned document (OCR) — best-effort, verify against the original."
                    style={{ font: `600 8.5px/1 ${T.mono}`, color: T.amberInk, background: "#fef3c7", borderRadius: 3, padding: "2px 4px", cursor: "help" }}
                  >
                    OCR
                  </span>
                )}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</span>
                <span style={{ color: T.faint, fontSize: 10 }}>{d.uploadedAt.slice(0, 10)}</span>
              </button>
              {openId === d.id && (
                <div style={{ marginTop: 4, maxHeight: 180, overflowY: "auto", padding: "8px 10px", background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 11, lineHeight: 1.5, color: T.body, whiteSpace: "pre-wrap" }}>
                  {d.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <div style={{ marginTop: 6, fontSize: 11, color: T.amberInk }}>{error}</div>}
    </div>
  );
}
