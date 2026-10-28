// Calls the deployed Modal apps (modal/voice.py) through Modal's JavaScript SDK.
// Credentials: MODAL_TOKEN_ID and MODAL_TOKEN_SECRET together, or neither, and then ~/.modal.toml.

import { ModalClient } from "modal";
import { z } from "zod";
import type { Language } from "../lesson/schema";
import { TimedWord } from "../video/words";

const VOICE_APP = "lessoncast-voice";

/** The SDK takes each variable from the environment before ~/.modal.toml, so a token id without its
 * secret would be paired with another token's secret and fail with an opaque auth error. */
export function checkModalEnv(env: Record<string, string | undefined>): void {
  const id = Boolean(env.MODAL_TOKEN_ID);
  const secret = Boolean(env.MODAL_TOKEN_SECRET);
  if (id && !secret) throw new Error("MODAL_TOKEN_ID is set without MODAL_TOKEN_SECRET: set both, or neither to use ~/.modal.toml");
  if (secret && !id) throw new Error("MODAL_TOKEN_SECRET is set without MODAL_TOKEN_ID: set both, or neither to use ~/.modal.toml");
}

let client: ModalClient | undefined;

function modal(): ModalClient {
  checkModalEnv(process.env);
  client ??= new ModalClient();
  return client;
}

async function voice() {
  const cls = await modal().cls.fromName(VOICE_APP, "Voice");
  return cls.instance();
}

/** Starts a voice container without waiting, so its cold start overlaps the script writing. */
export async function warmVoice(): Promise<void> {
  await (await voice()).method("warm").spawn([], {});
}

const NarrateResult = z.object({
  words: z.array(TimedWord),
  audioSeconds: z.number().positive(),
  ttsSeconds: z.number(),
  alignSeconds: z.number(),
});

/** Reads the groups aloud (group 0 is the title), uploads the WAV to `uploadUrl`, returns the timings. */
export async function narrate(input: {
  groups: string[][];
  language: Language;
  uploadUrl: string;
}): Promise<{ words: TimedWord[]; audioSeconds: number; seconds: number }> {
  const start = performance.now();
  const raw = await (await voice())
    .method("narrate")
    .remote([], { groups: input.groups, lang: input.language, upload_url: input.uploadUrl });
  const { words, audioSeconds } = NarrateResult.parse(raw);
  return { words, audioSeconds, seconds: (performance.now() - start) / 1000 };
}
