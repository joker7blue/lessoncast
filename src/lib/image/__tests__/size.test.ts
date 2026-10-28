import { expect, test } from "vitest";
import { jpegSize } from "../size";
import { jpegHeader } from "./jpeg.fixture";

test("jpegSize reads the frame size of a JPEG", () => {
  expect(jpegSize(jpegHeader(2048, 1152))).toEqual({ width: 2048, height: 1152 });
});

test("jpegSize throws on bytes that aren't a JPEG", () => {
  expect(() => jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toThrow(/JPEG/);
});
