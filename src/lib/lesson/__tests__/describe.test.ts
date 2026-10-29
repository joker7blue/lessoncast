import { expect, test } from "vitest";
import { describeVideo } from "../describe";

test("describeVideo says the length, the scenes, the style, the language and the quiz", () => {
  expect(describeVideo({ language: "hau", length: 120, style: "illustrated" })).toBe(
    "About 2 minutes: 4 scenes drawn in the illustrated style, narrated in Hausa, then a 3-question quiz.",
  );
  expect(describeVideo({ language: "fr", length: 60, style: "auto" })).toBe(
    "About 1 minute: 2 scenes drawn in the style that fits the pages, narrated in French, then a one-question quiz.",
  );
  expect(describeVideo({ language: "swh", length: 15, style: "comic" })).toBe("About 15 seconds: 1 scene drawn in the comic style, narrated in Swahili.");
});
