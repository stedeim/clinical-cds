import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

// Extract plain text from an uploaded patient-history document.
// Supported: .txt (as-is), .docx (mammoth), .pdf (pdf-parse). Format is
// decided by extension + content, never trusted from the client's MIME type.
// Anything else is rejected — no silent best-effort on unknown formats.

export type DocFormat = "txt" | "docx" | "pdf";

export function detectFormat(filename: string): DocFormat | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "txt" || ext === "text" || ext === "md") return "txt";
  if (ext === "docx") return "docx";
  if (ext === "pdf") return "pdf";
  return null;
}

export async function extractText(format: DocFormat, buffer: Buffer): Promise<string> {
  if (format === "txt") {
    return buffer.toString("utf8");
  }
  if (format === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // pdf
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy().catch(() => {});
  }
}
