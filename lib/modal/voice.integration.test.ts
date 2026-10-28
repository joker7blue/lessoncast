// Calls the deployed lessoncast-voice app on Modal and uploads to the real Supabase bucket. Runs
// when both are configured, and skips itself otherwise. A cold start takes about a minute.

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { supabase } from "../supabase/server";
import { BUCKET, publicUrl, signedUploadUrl } from "../supabase/storage";
import { narrate } from "./client";

const modalReady =
  Boolean(process.env.MODAL_TOKEN_ID && process.env.MODAL_TOKEN_SECRET) ||
  (!process.env.MODAL_TOKEN_ID && !process.env.MODAL_TOKEN_SECRET && existsSync(path.join(homedir(), ".modal.toml")));
const live = modalReady && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const paths: string[] = [];

describe.skipIf(!live)("voice (live Modal and Supabase)", { timeout: 180_000 }, () => {
  afterAll(async () => {
    if (paths.length) await supabase().storage.from(BUCKET).remove(paths);
  });

  test("narrate uploads the WAV and returns grouped word timings", async () => {
    const file = `test/${crypto.randomUUID()}/voice.wav`;
    paths.push(file);
    const r = await narrate({
      groups: [["Le cœur."], ["Il bat soixante-dix fois par minute."]],
      language: "fr",
      uploadUrl: await signedUploadUrl(file),
    });

    expect(r.words.map((w) => w.word)).toEqual(["Le", "cœur.", "Il", "bat", "soixante-dix", "fois", "par", "minute."]);
    expect(r.words.map((w) => w.group)).toEqual([0, 0, 1, 1, 1, 1, 1, 1]);
    // The title lasts at least 3 s, then the 0.6 s group pause.
    expect(r.words[2]!.start).toBeGreaterThanOrEqual(3.6);
    expect(r.audioSeconds).toBeGreaterThan(r.words.at(-1)!.end);

    const wav = await fetch(publicUrl(file));
    expect(wav.status).toBe(200);
    expect(wav.headers.get("content-type")).toBe("audio/wav");
  });
});
