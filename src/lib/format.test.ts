import { expect, test } from "vitest";
import { formatSeconds, formatUsd } from "./format";

test("seconds read as seconds under a minute, minutes and seconds above", () => {
  expect(formatSeconds(40.7)).toBe("40.7 s");
  expect(formatSeconds(4)).toBe("4.0 s");
  expect(formatSeconds(132.8)).toBe("2 min 13 s");
  expect(formatSeconds(253.8)).toBe("4 min 14 s");
  expect(formatSeconds(120)).toBe("2 min");
});

test("costs keep enough digits to stay meaningful", () => {
  expect(formatUsd(0.0465)).toBe("$0.047");
  expect(formatUsd(0.0062)).toBe("$0.006");
  expect(formatUsd(0.133)).toBe("$0.13");
  expect(formatUsd(1.5)).toBe("$1.50");
});
