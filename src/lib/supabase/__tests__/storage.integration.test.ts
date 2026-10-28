// Runs against the real Supabase project when .env has its keys, and skips itself otherwise.

import { afterAll, describe, expect, test } from "vitest";
import { supabase } from "../server";
import { BUCKET, publicUrl, signedUploadUrl, uploadFile } from "../storage";

const live = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const paths: string[] = [];

describe.skipIf(!live)("lessons bucket (live Supabase)", () => {
  afterAll(async () => {
    if (paths.length) await supabase().storage.from(BUCKET).remove(paths);
  });

  test("a signed upload URL accepts a raw PUT and the file is public", { timeout: 30_000 }, async () => {
    const path = `test/${crypto.randomUUID()}.txt`;
    paths.push(path);
    const put = await fetch(await signedUploadUrl(path), {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: new Uint8Array([104, 105, 33]),
    });
    expect(put.status, await put.clone().text()).toBe(200);

    const get = await fetch(publicUrl(path));
    expect(get.status).toBe(200);
    expect(await get.text()).toBe("hi!");
  });

  test("uploadFile replaces an existing file", { timeout: 30_000 }, async () => {
    const path = `test/${crypto.randomUUID()}.txt`;
    paths.push(path);
    await uploadFile(path, new TextEncoder().encode("first"), "text/plain");
    await uploadFile(path, new TextEncoder().encode("second"), "text/plain");

    const { data, error } = await supabase().storage.from(BUCKET).download(path);
    expect(error).toBeNull();
    expect(await data?.text()).toBe("second");
  });
});
