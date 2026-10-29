import { expect, test } from "vitest";
import { activeHref } from "../nav";

test("activeHref marks the sidebar entry of the current page", () => {
  expect(activeHref("/")).toBe("/");
  expect(activeHref("/create")).toBe("/create");
  expect(activeHref("/lessons")).toBe("/lessons");
  expect(activeHref("/lessons/4b4a8a4e-3c1a-4d55-9a57-2f0f6b2b8c11")).toBe("/lessons");
  expect(activeHref("/books/7d1f2c3a-5b6e-4f70-8a91-b2c3d4e5f607")).toBe("/lessons");
  expect(activeHref("/how-it-works")).toBe("/how-it-works");
  expect(activeHref("/nowhere")).toBeNull();
});
