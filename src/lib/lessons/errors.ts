// What the teacher reads when a lesson fails: one plain French sentence per pipeline step. The
// technical cause stays in the Trigger.dev run.

export type Step = "write-script" | "draw-scenes" | "narrate" | "render-video";

export class NotATextbookPageError extends Error {
  constructor() {
    super("A photo is not a readable textbook page");
    this.name = "NotATextbookPageError";
  }
}

const RETRY = "Réessayez dans quelques minutes.";

const MESSAGES: Record<Step, string> = {
  "write-script": `La lecture des pages a échoué. ${RETRY}`,
  "draw-scenes": `Les illustrations n'ont pas pu être créées. ${RETRY}`,
  narrate: `La voix n'a pas pu être enregistrée. ${RETRY}`,
  "render-video": `Le montage de la vidéo a échoué. ${RETRY}`,
};

export function teacherMessage(step: Step, error: unknown): string {
  if (error instanceof NotATextbookPageError) {
    return "Une photo ne ressemble pas à une page de manuel. Reprenez une photo nette de chaque page, en entier.";
  }
  return MESSAGES[step];
}
