import { expect, test } from "vitest";
import { checkModalEnv, modalCostUsd } from "./client";

test("a token id without its secret is refused with a clear message", () => {
  expect(() => checkModalEnv({ MODAL_TOKEN_ID: "ak-1", MODAL_TOKEN_SECRET: "" })).toThrow(/MODAL_TOKEN_SECRET/);
  expect(() => checkModalEnv({ MODAL_TOKEN_SECRET: "as-1" })).toThrow(/MODAL_TOKEN_ID/);
});

test("both tokens, or neither (then ~/.modal.toml), are accepted", () => {
  expect(() => checkModalEnv({ MODAL_TOKEN_ID: "ak-1", MODAL_TOKEN_SECRET: "as-1" })).not.toThrow();
  expect(() => checkModalEnv({})).not.toThrow();
});

test("an hour on 8 CPUs and 8 GiB is estimated at $0.44", () => {
  expect(modalCostUsd(3600)).toBeCloseTo(0.44, 5);
});
