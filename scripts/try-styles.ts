// Draws one secondary-school scene in each of the four styles, to check the style prompts by eye.
// Run: pnpm exec tsx --env-file=.env scripts/try-styles.ts [style ...]   (all four by default)
// Writes scripts/derisk/out/styles/<style>.jpg. About $0.01 per image.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeLesson } from "../lib/lesson/lesson.fixture";
import { ArtStyle } from "../lib/lesson/styles";
import { generateImage, scenePrompt } from "../lib/meta/images";
import { IMAGE_COST_USD } from "../lib/meta/prices";

const OUT = path.resolve("scripts/derisk/out/styles");

const VISUAL_NOTES =
  "Grace, a sixteen-year-old Cameroonian student with short natural hair and a light blue school uniform shirt; a school biology lab in Yaoundé with wooden benches and large windows";
const SCENE =
  "Grace listens to her own heartbeat with a stethoscope; a large anatomical model of the human heart stands on the bench in front of her";

async function main() {
  const styles = process.argv.length > 2 ? process.argv.slice(2).map((s) => ArtStyle.parse(s)) : ArtStyle.options;
  const base = makeLesson(5);

  await mkdir(OUT, { recursive: true });
  await Promise.all(
    styles.map(async (style) => {
      const lesson = { ...base, style, visualNotes: VISUAL_NOTES, scenes: [{ ...base.scenes[0]!, imagePrompt: SCENE }] };
      const start = performance.now();
      const bytes = await generateImage(scenePrompt(lesson, 0));
      const file = path.join(OUT, `${style}.jpg`);
      await writeFile(file, bytes);
      console.log(`${style}: ${((performance.now() - start) / 1000).toFixed(1)} s, ${(bytes.length / 1024).toFixed(0)} KB → ${file}`);
    }),
  );
  console.log(`cost ≈ $${(styles.length * IMAGE_COST_USD).toFixed(2)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
