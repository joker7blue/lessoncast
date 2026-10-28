import { expect, test } from "vitest";
import { fitWithin } from "../resize";

test("fitWithin keeps the ratio and caps the long side at 1600", () => {
  expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
  expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
});

test("fitWithin rounds to whole pixels", () => {
  expect(fitWithin(4000, 2999)).toEqual({ width: 1600, height: 1200 });
});
