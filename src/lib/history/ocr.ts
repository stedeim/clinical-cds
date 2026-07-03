import os from "os";
import path from "path";
import { createWorker } from "tesseract.js";

// OCR for scanned (image-only) PDFs, via tesseract.js — pure WASM, runs
// entirely in this process: no API keys, no PHI leaves the machine. The one
// external touch: the English language model (~11 MB) is downloaded on the
// FIRST OCR ever run and cached on disk after that; an offline first run
// fails gracefully with a clear message.
//
// OCR output is labeled as such all the way to the UI — recognized text is a
// best-effort reading of an image, not a ground-truth text layer.

export const MAX_OCR_PAGES = 10;

// Decide whether a PDF needs OCR: a real text layer yields far more than
// this; scanned PDFs yield page markers and stray glyphs at most.
export function needsOcr(extractedText: string, totalPages: number): boolean {
  const meaningful = extractedText.replace(/[^a-zA-Z0-9]/g, "").length;
  return meaningful < 25 * Math.max(1, totalPages);
}

export async function ocrImages(pages: Uint8Array[]): Promise<string> {
  const limited = pages.slice(0, MAX_OCR_PAGES);
  const worker = await createWorker("eng", undefined, {
    // Cache the language model across runs; nothing else is written here.
    cachePath: path.join(os.tmpdir(), "pabaid-tessdata"),
  });
  try {
    const texts: string[] = [];
    for (const page of limited) {
      const result = await worker.recognize(Buffer.from(page));
      texts.push(result.data.text.trim());
    }
    let out = texts.filter(Boolean).join("\n\n");
    if (pages.length > MAX_OCR_PAGES) {
      out += `\n\n[OCR stopped after ${MAX_OCR_PAGES} of ${pages.length} pages]`;
    }
    return out;
  } finally {
    await worker.terminate().catch(() => {});
  }
}
