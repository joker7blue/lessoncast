import { beforeEach, describe, expect, test, vi } from "vitest";

const repo = vi.hoisted(() => ({ createLesson: vi.fn(), updateLesson: vi.fn() }));
const storage = vi.hoisted(() => ({ uploadFile: vi.fn() }));
const trigger = vi.hoisted(() => ({ tasks: { trigger: vi.fn() } }));
const limits = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/lessons/repo", () => repo);
vi.mock("@/lib/supabase/storage", async (importOriginal) => ({ ...(await importOriginal<object>()), ...storage }));
vi.mock("@trigger.dev/sdk", () => trigger);
vi.mock("@/lib/lessons/rate-limit", () => limits);

import { POST } from "../route";

const ID = "4b4a8a4e-3c1a-4d55-9a57-2f0f6b2b8c11";
const JPEG = [0xff, 0xd8, 0xff, 0xe0];

function jpeg(name: string, size = 1000) {
  const bytes = new Uint8Array(size);
  bytes.set(JPEG);
  bytes[size - 1] = name.length; // tells the files apart
  return new File([bytes], name, { type: "image/jpeg" });
}

function post(fields: { photos?: File[]; language?: string; style?: string }) {
  const form = new FormData();
  for (const photo of fields.photos ?? []) form.append("photos", photo);
  form.append("language", fields.language ?? "pcm");
  form.append("style", fields.style ?? "auto");
  return POST(new Request("http://localhost/api/lessons", { method: "POST", body: form }));
}

async function expectError(res: Response, status: number) {
  expect(res.status).toBe(status);
  const body = await res.json();
  expect(body.error).toMatch(/\.$/); // a sentence for the teacher
  expect(repo.createLesson).not.toHaveBeenCalled();
  return body.error as string;
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.createLesson.mockImplementation(async ({ pageCount, style, language }) => ({ id: ID, pageCount, style, language }));
  repo.updateLesson.mockResolvedValue(undefined);
  storage.uploadFile.mockResolvedValue(undefined);
  trigger.tasks.trigger.mockResolvedValue({ id: "run_1" });
  limits.checkRateLimit.mockResolvedValue(null);
});

describe("POST /api/lessons", () => {
  test("400 without a photo, and with 5 photos", async () => {
    await expectError(await post({ photos: [] }), 400);
    await expectError(await post({ photos: [1, 2, 3, 4, 5].map((n) => jpeg(`${n}.jpg`)) }), 400);
  });

  test("400 for image/heic", async () => {
    await expectError(await post({ photos: [new File([new Uint8Array(JPEG)], "p.heic", { type: "image/heic" })] }), 400);
  });

  test("400 for a file that says JPEG but isn't one", async () => {
    await expectError(await post({ photos: [new File([new Uint8Array([0x00, 0x00, 0x00, 0x18])], "p.jpg", { type: "image/jpeg" })] }), 400);
  });

  test("400 when the photos weigh more than 4 MB in all", async () => {
    const big = 1.5 * 1024 * 1024;
    await expectError(await post({ photos: [jpeg("1.jpg", big), jpeg("2.jpg", big), jpeg("3.jpg", big)] }), 400);
  });

  test("400 for language 'xx' and for style 'watercolor'", async () => {
    await expectError(await post({ photos: [jpeg("1.jpg")], language: "xx" }), 400);
    await expectError(await post({ photos: [jpeg("1.jpg")], style: "watercolor" }), 400);
  });

  test("201: stores the pages in the order sent, creates the row, triggers generate-lesson once", async () => {
    const pages = [jpeg("a.jpg", 900), jpeg("bb.jpg", 800), jpeg("ccc.jpg", 700)];
    const res = await post({ photos: pages, language: "fr", style: "realistic" });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID });
    // No length sent: the one that fits three pages.
    expect(repo.createLesson).toHaveBeenCalledWith({ language: "fr", ipHash: null, pageCount: 3, style: "realistic", targetSeconds: 180 });
    const stored = storage.uploadFile.mock.calls.map(([path, bytes, type]) => [path, (bytes as Uint8Array).length, type]);
    expect(stored).toEqual([
      [`${ID}/pages/1.jpg`, 900, "image/jpeg"],
      [`${ID}/pages/2.jpg`, 800, "image/jpeg"],
      [`${ID}/pages/3.jpg`, 700, "image/jpeg"],
    ]);
    expect(trigger.tasks.trigger).toHaveBeenCalledWith("generate-lesson", { lessonId: ID }, { idempotencyKey: ID });
    expect(repo.updateLesson).toHaveBeenCalledWith(ID, { triggerRunId: "run_1" });
  });

  test("429 with the limit's sentence when the limit is reached, before anything is stored", async () => {
    limits.checkRateLimit.mockResolvedValue("You have made three lessons in the last hour. Try again in a little while.");
    const res = await post({ photos: [jpeg("1.jpg")] });
    expect(await expectError(res, 429)).toMatch(/last hour/);
    expect(storage.uploadFile).not.toHaveBeenCalled();
    expect(limits.checkRateLimit).toHaveBeenCalledWith(null);
  });

  test("500 and a failed lesson when the pipeline can't be started", async () => {
    trigger.tasks.trigger.mockRejectedValue(new Error("Trigger.dev is down"));
    const res = await post({ photos: [jpeg("1.jpg")] });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/\.$/);
    expect(repo.updateLesson).toHaveBeenCalledWith(ID, expect.objectContaining({ status: "failed" }));
  });
});
