// What the teacher reads when a lesson fails: one plain sentence per pipeline step. The technical
// cause stays in the Trigger.dev run.

export type Step = "write-script" | "draw-scenes" | "narrate" | "render-video";

export class NotATextbookPageError extends Error {
  constructor() {
    super("A photo is not a readable textbook page");
    this.name = "NotATextbookPageError";
  }
}

const RETRY = "Try again in a few minutes.";

const MESSAGES: Record<Step, string> = {
  "write-script": `Reading the pages failed. ${RETRY}`,
  "draw-scenes": `The pictures couldn't be drawn. ${RETRY}`,
  narrate: `The voice couldn't be recorded. ${RETRY}`,
  "render-video": `Putting the video together failed. ${RETRY}`,
};

export function teacherMessage(step: Step, error: unknown): string {
  if (error instanceof NotATextbookPageError) {
    return "A photo doesn't look like a textbook page. Take a sharp photo of each whole page.";
  }
  return MESSAGES[step];
}
