// Calls the deployed Modal apps (modal/voice.py, modal/render.py) through Modal's JavaScript SDK.
// Credentials: MODAL_TOKEN_ID and MODAL_TOKEN_SECRET together, or neither, and then ~/.modal.toml.

import { ModalClient } from "modal";
import { z } from "zod";
import type { Language } from "../lesson/schema";
import { VideoProps } from "../video/props";
import { TimedWord } from "../video/words";

const VOICE_APP = "lessoncast-voice";
const RENDER_APP = "lessoncast-render";

// Both apps run on 8 CPUs and 8 GiB. Modal rates: $0.047 per core-hour, $0.008 per GiB-hour.
const USD_PER_HOUR = 8 * 0.047 + 8 * 0.008;

/** Estimated cost of a call from its wall time, cold start included, so a slight overestimate. */
export function modalCostUsd(seconds: number): number {
  return (seconds / 3600) * USD_PER_HOUR;
}

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

const RenderResult = z.object({ bytes: z.int().positive(), renderSeconds: z.number() });

/** Renders the MP4 on Modal, which uploads it to `uploadUrl`. Invalid props never leave this process. */
export async function renderVideo(input: { props: VideoProps; uploadUrl: string }): Promise<{ bytes: number; seconds: number }> {
  const props = VideoProps.parse(input.props);
  const start = performance.now();
  const render = await modal().functions.fromName(RENDER_APP, "render");
  const raw = await render.remote([], { props_json: JSON.stringify(props), upload_url: input.uploadUrl });
  const { bytes } = RenderResult.parse(raw);
  return { bytes, seconds: (performance.now() - start) / 1000 };
}
