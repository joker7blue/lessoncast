// Uploads the sample textbooks' PDFs to samples/ in the lessons bucket, where the "Try a sample textbook"
// dialog reads them. The folder holds one <name>.pdf per sample of src/lib/books/samples.ts, compressed
// first so a teacher on mobile data can load it, for example with Ghostscript:
//   gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dNOPAUSE -dBATCH -dQUIET -sOutputFile=<name>.pdf <book>.pdf
// Run: pnpm exec tsx --env-file=.env scripts/upload-samples.ts <folder>

import { readFile } from "node:fs/promises";
import path from "node:path";
import { SAMPLE_BOOKS, samplePath } from "../src/lib/books/samples";
import { fileSize, uploadFile } from "../src/lib/supabase/storage";

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error("Usage: tsx --env-file=.env scripts/upload-samples.ts <folder>");
  for (const sample of SAMPLE_BOOKS) {
    const bytes = new Uint8Array(await readFile(path.join(folder, `${sample.name}.pdf`)));
    if (new TextDecoder().decode(bytes.subarray(0, 4)) !== "%PDF") throw new Error(`${sample.name}.pdf is not a PDF`);
    await uploadFile(samplePath(sample.name), bytes, "application/pdf");
    const stored = await fileSize(samplePath(sample.name));
    console.log(`${sample.name}: ${(bytes.length / 1024 / 1024).toFixed(1)} MB sent, ${stored} bytes stored, ${sample.url}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
