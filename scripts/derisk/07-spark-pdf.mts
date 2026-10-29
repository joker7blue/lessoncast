// Derisk test 7: Muse Spark reads a textbook PDF and splits it into lessons, with their page ranges.
// The PDF is built here: a cover, a table of contents, lessons typed as text, and one real photographed
// textbook page as a scanned page, so both a text layer and a page image are tested.
//
//   pnpm derisk:7 [page.jpg] [--scan-only]   (default scripts/derisk/input/page.jpg)
//   --scan-only: a PDF of the photographed page alone, to check that Muse Spark reads page images.
//
// Writes out/07/book.pdf and out/07/answer.json.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { PRICE, bytesToDataUrl, postJson, stopwatch, usd, writeOut } from "./lib.mts";

const args = process.argv.slice(2);
const scanOnly = args.includes("--scan-only");
const photo = args.find((a) => !a.startsWith("--")) ?? path.resolve(import.meta.dirname, "input", "page.jpg");
const A4 = [595, 842] as const;

const TEXT_PAGES: { title?: string; lines: string[] }[][] = [
  [{ title: "SCIENCES ET TECHNOLOGIE", lines: ["Cours moyen 1 (CM1)", "", "Éditions du Mont Cameroun"] }],
  [{ title: "Sommaire", lines: ["Leçon 1 : Le cœur et la circulation du sang ..... 3", "Leçon 2 : (page photographiée) ..... 5", "Leçon 3 : Les états de l'eau ..... 7", "Exercices de révision ..... 9"] }],
  [{ title: "Leçon 1 : Le cœur et la circulation du sang", lines: ["Le cœur est un muscle creux situé dans la poitrine.", "Il bat environ soixante-dix fois par minute.", "À chaque battement, il envoie le sang dans les artères."] }],
  [{ lines: ["Le sang revient au cœur par les veines.", "Le sang transporte l'oxygène et les aliments vers tous les organes.", "Retenons : le cœur est une pompe qui fait circuler le sang dans tout le corps."] }],
];
const AFTER_PHOTO: { title?: string; lines: string[] }[][] = [
  [{ title: "Leçon 3 : Les états de l'eau", lines: ["L'eau existe sous trois états : solide, liquide et gazeux.", "La glace fond quand on la chauffe : c'est la fusion."] }],
  [{ lines: ["L'eau bout à cent degrés : elle devient vapeur. C'est l'ébullition.", "Retenons : la chaleur fait passer l'eau d'un état à un autre."] }],
  [{ title: "Exercices de révision", lines: ["1. Où se trouve le cœur ?", "2. Nomme les trois états de l'eau."] }],
];

async function buildBook(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const textPage = (blocks: { title?: string; lines: string[] }[]) => {
    const page = doc.addPage([...A4]);
    let y = A4[1] - 80;
    for (const block of blocks) {
      if (block.title) {
        page.drawText(block.title, { x: 60, y, size: 20, font: bold });
        y -= 40;
      }
      for (const line of block.lines) {
        page.drawText(line, { x: 60, y, size: 13, font });
        y -= 24;
      }
    }
  };
  if (!scanOnly) TEXT_PAGES.forEach(textPage);
  // The photographed page, as a scanner would put it in a PDF, then a text page that follows it.
  const image = await doc.embedJpg(await readFile(photo));
  const scale = Math.min(A4[0] / image.width, A4[1] / image.height);
  const page = doc.addPage([...A4]);
  page.drawImage(image, { x: (A4[0] - image.width * scale) / 2, y: (A4[1] - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
  if (scanOnly) return doc.save();
  textPage([{ lines: ["(Suite de la leçon de la page précédente.)", "Exercice : résume la leçon en deux phrases."] }]);
  AFTER_PHOTO.forEach(textPage);
  return doc.save();
}

const INSTRUCTIONS = `You read part of a Cameroonian school textbook, given as a PDF, and list the lessons it contains, so a teacher can pick one to turn into a short video.
- A lesson is what a teacher teaches in one or two class sessions, usually 1 to 12 pages. Split a long chapter into its lessons. Leave out the cover, the table of contents, the index, answer keys and pages of exercises only.
- firstPage and lastPage count the pages of this PDF file from 1, whatever number is printed on the page.
- title: the lesson's title as printed. summary: one sentence, in the language of the book, on what the lesson teaches.
- continuesPrevious: true only for a lesson that already started before the first page of this file.`;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["isTextbook", "book", "lessons"],
  properties: {
    isTextbook: { type: "boolean" },
    book: {
      type: "object",
      additionalProperties: false,
      required: ["title", "subject", "level"],
      properties: { title: { type: "string" }, subject: { type: "string" }, level: { type: "string" } },
    },
    lessons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "firstPage", "lastPage", "summary", "continuesPrevious"],
        properties: {
          title: { type: "string" },
          firstPage: { type: "integer" },
          lastPage: { type: "integer" },
          summary: { type: "string" },
          continuesPrevious: { type: "boolean" },
        },
      },
    },
  },
};

const bytes = await buildBook();
await writeOut("07", scanOnly ? "scan.pdf" : "book.pdf", bytes);
const elapsed = stopwatch();
const res = await postJson("/chat/completions", {
  model: "muse-spark-1.3",
  reasoning_effort: "medium",
  messages: [
    { role: "system", content: INSTRUCTIONS },
    {
      role: "user",
      content: [
        { type: "text", text: `This PDF holds pages 1 to ${scanOnly ? 1 : 10} of the book. List its lessons.` },
        { type: "file", file: { filename: "book.pdf", file_data: bytesToDataUrl(bytes, "application/pdf") } },
      ],
    },
  ],
  response_format: { type: "json_schema", json_schema: { name: "BookPart", strict: true, schema } },
});
const json = (await res.json()) as {
  choices: { message: { content: string } }[];
  usage: { prompt_tokens: number; completion_tokens: number };
};
const seconds = elapsed();
const answer = JSON.parse(json.choices[0]!.message.content);
await writeOut("07", scanOnly ? "scan-answer.json" : "answer.json", JSON.stringify(answer, null, 2));
const cost = (json.usage.prompt_tokens * PRICE.sparkInputPerMTok + json.usage.completion_tokens * PRICE.sparkOutputPerMTok) / 1e6;
console.log(JSON.stringify(answer, null, 2));
console.log(`${bytes.length} bytes, ${scanOnly ? 1 : 10} pages: ${seconds}s, ${json.usage.prompt_tokens} in / ${json.usage.completion_tokens} out tokens, ${usd(cost)}`);
