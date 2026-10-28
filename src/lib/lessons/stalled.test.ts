import { expect, test } from "vitest";
import { isStalled } from "./stalled";

const minutes = (n: number) => n * 60_000;
const created = Date.parse("2026-10-28T12:00:00Z");

test("a lesson still queued after ten minutes never started", () => {
  expect(isStalled("queued", "2026-10-28T12:00:00Z", created + minutes(9))).toBe(false);
  expect(isStalled("queued", "2026-10-28T12:00:00Z", created + minutes(11))).toBe(true);
});

test("a lesson still being made after twenty minutes stopped on the way", () => {
  for (const status of ["reading", "drawing", "rendering"] as const) {
    expect(isStalled(status, "2026-10-28T12:00:00Z", created + minutes(15))).toBe(false);
    expect(isStalled(status, "2026-10-28T12:00:00Z", created + minutes(21))).toBe(true);
  }
});

test("a finished lesson is never stalled", () => {
  expect(isStalled("done", "2026-10-28T12:00:00Z", created + minutes(600))).toBe(false);
  expect(isStalled("failed", "2026-10-28T12:00:00Z", created + minutes(600))).toBe(false);
});
