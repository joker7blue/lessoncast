// The four image styles a lesson can be drawn in. `label` and `description` are site copy;
// `prompt` opens every scene prompt, and `when` is the rule Muse Spark follows in "Automatic".

import { z } from "zod";

export const ArtStyle = z.enum(["illustrated", "realistic", "diagram", "comic"]);
export type ArtStyle = z.infer<typeof ArtStyle>;

/** The teacher's choice: one of the styles, or "auto" to let Muse Spark pick from the pages. */
export const StyleChoice = z.enum(["auto", ...ArtStyle.options]);
export type StyleChoice = z.infer<typeof StyleChoice>;

type Style = { label: string; description: string; prompt: string; when: string };

export const STYLES: Record<ArtStyle, Style> = {
  illustrated: {
    label: "Illustrated",
    description: "Bright colours and round characters, for nursery and primary school.",
    prompt:
      "Art style: children's picture-book illustration. Flat shapes with soft gradients, rounded friendly characters with big expressive eyes, warm bright palette, clean outlines, soft daylight.",
    when: "nursery and primary school pages (up to CM2 or Class 6)",
  },
  realistic: {
    label: "Realistic",
    description: "Like a realistic textbook painting, for secondary school.",
    prompt:
      "Art style: semi-realistic digital painting, like the illustrations of a modern secondary-school textbook. Natural human proportions and anatomy, teenagers and adults drawn at their real age, realistic materials, textures and lighting, natural colour palette, detailed but uncluttered composition. Not a cartoon.",
    when: "secondary school pages (6e to Terminale, Form 1 to Upper Sixth) when no other rule fits better",
  },
  diagram: {
    label: "Diagram",
    description: "Cutaways and clear diagrams, to explain an organ, a circuit or a cycle.",
    prompt:
      "Art style: clean scientific illustration plate, like a biology or physics textbook figure. Cutaway and cross-section views on a plain light background, precise shapes, flat colour coding with subtle shading, the subject centred and large. Full bleed: the plate fills the whole frame, with no border, frame or margin. No people unless the scene needs them.",
    when: "pages that explain a structure or a process: an organ, a circuit, a cycle, a machine",
  },
  comic: {
    label: "Comic",
    description: "Inked lines and bold colours, for history and stories.",
    prompt:
      "Art style: African comic-book illustration. Bold black ink outlines, flat saturated colours, halftone shading, dynamic framing, expressive characters.",
    when: "history, stories, civics and moral education",
  },
};

export const AUTO_STYLE = {
  label: "Automatic",
  description: "LessonCast picks the style from the level and subject of the pages.",
};
