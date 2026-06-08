/**
 * Free, client-side OCR via tesseract.js (WASM). No API key, no server cost —
 * language data is fetched from the CDN by the browser at runtime. Accuracy on
 * Japanese slide screenshots is moderate; the result is plain text that we then
 * structure into an editable slide, so the user can correct any mistakes.
 *
 * tesseract.js is heavy, so it is imported dynamically (browser-only, code-split)
 * the first time OCR is actually invoked.
 */
export type OcrProgress = (status: string, progress: number) => void;

/** Recognise Japanese + English text in a data-URL image. Returns plain text. */
export async function recognizeImage(dataUrl: string, onProgress?: OcrProgress): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const { data } = await recognize(dataUrl, "jpn+eng", {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress) onProgress(m.status, m.progress);
    },
  });
  // Collapse the run of spaces tesseract inserts between CJK glyphs, but keep
  // line breaks (they carry the slide's bullet/line structure).
  return (data.text ?? "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, (run) => (run.length > 1 ? " " : run)).replace(/(?<=[^\x00-\x7F]) (?=[^\x00-\x7F])/g, "").trim())
    .filter(Boolean)
    .join("\n");
}
