import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { needsOcr, ocrImages } from "./ocr";

// Extract plain text from an uploaded patient-history document.
// Supported: .txt (as-is), .docx (mammoth), .pdf (pdf-parse; scanned PDFs
// with no text layer fall through to on-device OCR). Format is decided by
// extension + content, never trusted from the client's MIME type. Anything
// else is rejected — no silent best-effort on unknown formats.

export type DocFormat = "txt" | "docx" | "pdf";

export interface ExtractResult {
  text: string;
  // True when the text came from OCR of page images rather than a real text
  // layer — surfaced to the UI so recognized text is never passed off as
  // ground truth.
  ocrUsed: boolean;
}

export function detectFormat(filename: string): DocFormat | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "txt" || ext === "text" || ext === "md") return "txt";
  if (ext === "docx") return "docx";
  if (ext === "pdf") return "pdf";
  return null;
}

export async function extractText(format: DocFormat, buffer: Buffer): Promise<ExtractResult> {
  if (format === "txt") {
    return { text: buffer.toString("utf8"), ocrUsed: false };
  }
  if (format === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, ocrUsed: false };
  }

  // pdf: text layer first; scanned PDFs (no meaningful text) go through OCR.
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    if (!needsOcr(result.text, result.total ?? 1)) {
      return { text: result.text, ocrUsed: false };
    }
    const shots = await parser.getScreenshot({ scale: 2 });
    const images = shots.pages.map((p) => p.data);
    if (images.length === 0) {
      return { text: result.text, ocrUsed: false };
    }
    return { text: await ocrImages(images), ocrUsed: true };
  } finally {
    await parser.destroy().catch(() => {});
  }
}
