// Renders the recorded fixture lesson on the deployed lessoncast-render app and uploads it to the
// real Supabase bucket. Runs when both are configured, and skips itself otherwise.

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { fixtureProps } from "../../../remotion/fixture";
import { supabase } from "../../supabase/server";
import { BUCKET, publicUrl, signedUploadUrl } from "../../supabase/storage";
import { renderVideo } from "../client";

const modalReady =
  Boolean(process.env.MODAL_TOKEN_ID && process.env.MODAL_TOKEN_SECRET) ||
  (!process.env.MODAL_TOKEN_ID && !process.env.MODAL_TOKEN_SECRET && existsSync(path.join(homedir(), ".modal.toml")));
const live = modalReady && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const keep = process.env.KEEP_RENDER === "1"; // keep the MP4 to watch it
const paths: string[] = [];

describe.skipIf(!live)("render (live Modal and Supabase)", { timeout: 600_000 }, () => {
  afterAll(async () => {
    if (paths.length && !keep) await supabase().storage.from(BUCKET).remove(paths);
  });

  test("renders the fixture to an MP4 under 10 MB in Storage", async () => {
    const file = `test/${crypto.randomUUID()}/video.mp4`;
    paths.push(file);
    const r = await renderVideo({ props: fixtureProps, uploadUrl: await signedUploadUrl(file) });
    if (keep) console.log(`MP4: ${publicUrl(file)} (${r.bytes} bytes, ${r.seconds.toFixed(1)} s)`);

    expect(r.bytes).toBeGreaterThan(100_000);
    expect(r.bytes).toBeLessThan(10 * 1024 * 1024);
    const res = await fetch(publicUrl(file), { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("video/mp4");
  });

  test("refuses props that break the video contract before calling Modal", async () => {
    await expect(renderVideo({ props: { ...fixtureProps, durationInFrames: 0 }, uploadUrl: "https://x/y" })).rejects.toThrow();
  });
});
