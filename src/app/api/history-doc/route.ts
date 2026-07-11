import { NextResponse } from "next/server";
import { getCase } from "@/lib/store";
import { detectFormat, extractText } from "@/lib/history/extract";
import { createDocument, listDocuments } from "@/lib/history/store";
import { recordAudit } from "@/lib/audit";
import { requireEntitledClinician, AuthError, currentUserIdFromCookies } from "@/lib/clinician";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Patient-history document upload. Same PHI posture as every other route:
// verified clinician, encounter ownership checked before anything is read or
// written, rate-limited. The file is parsed to text server-side and the
// bytes are discarded — only extracted text is stored (and only in the stub
// store until Supabase lands).

export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  const rl = await rateLimit(`historydoc:${clientIp(req)}`, { max: 10, windowMs: 60_000, label: "historydoc" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let clinicianId: string;
  try {
    clinicianId = (await requireEntitledClinician(await currentUserIdFromCookies())).id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[history-doc] auth error", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const encounterId = form.get("encounterId");
  const file = form.get("file");
  if (typeof encounterId !== "string" || !encounterId || !(file instanceof File)) {
    return NextResponse.json({ error: "encounterId and file are required." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 8 MB." }, { status: 400 });
  }

  const format = detectFormat(file.name);
  if (!format) {
    return NextResponse.json(
      { error: "Unsupported format — upload .txt, .docx, or .pdf." },
      { status: 400 },
    );
  }

  // Ownership: the encounter must be this clinician's; the document attaches
  // to that encounter's patient.
  const record = await getCase(encounterId, clinicianId);
  if (!record) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  let text: string;
  let ocrUsed: boolean;
  try {
    const extracted = await extractText(format, Buffer.from(await file.arrayBuffer()));
    text = extracted.text.trim();
    ocrUsed = extracted.ocrUsed;
  } catch (err) {
    console.error("[history-doc] extraction failed", err);
    return NextResponse.json(
      { error: "Could not read that file — is it a valid document?" },
      { status: 422 },
    );
  }
  if (!text) {
    return NextResponse.json(
      { error: "No readable text found in the document, even after OCR." },
      { status: 422 },
    );
  }

  const doc = createDocument({
    patientId: record.patient.id,
    clinicianId,
    filename: file.name,
    format,
    text,
    ocr: ocrUsed,
  });

  await recordAudit({
    clinicianId,
    action: "history_doc_upload",
    encounterId,
    detail: { documentId: doc.id, format, ocr: ocrUsed, chars: doc.text.length },
  });

  // Return without the full text body; the UI refetches what it needs.
  return NextResponse.json(
    { document: { ...doc, text: doc.text.slice(0, 600) } },
    { status: 201 },
  );
}

export async function GET(req: Request) {
  let clinicianId: string;
  try {
    clinicianId = (await requireEntitledClinician(await currentUserIdFromCookies())).id;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const encounterId = new URL(req.url).searchParams.get("encounterId");
  if (!encounterId) {
    return NextResponse.json({ error: "encounterId is required." }, { status: 400 });
  }
  const record = await getCase(encounterId, clinicianId);
  if (!record) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }
  return NextResponse.json({ documents: listDocuments(record.patient.id, clinicianId) });
}
