import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { postJson } from "./client";

beforeEach(() => vi.stubEnv("MODEL_API_KEY", "test-key"));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("a request that never answers is aborted after its timeout", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)))),
  );
  await expect(postJson("/images/edits", {}, { timeoutMs: 20 })).rejects.toMatchObject({ name: "TimeoutError" });
});

test("every request carries a timeout signal", async () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await postJson("/chat/completions", {}, { timeoutMs: 1000 });
  expect((fetchMock.mock.calls[0] as unknown[])[1]).toMatchObject({ signal: expect.any(AbortSignal) });
});
