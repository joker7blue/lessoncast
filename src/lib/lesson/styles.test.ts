import { expect, test } from "vitest";
import { ArtStyle, AUTO_STYLE, STYLES, StyleChoice } from "./styles";

test("every style has a French label, a description, a prompt and a rule", () => {
  expect(Object.keys(STYLES)).toEqual(ArtStyle.options);
  for (const style of Object.values(STYLES)) {
    expect(style.label).not.toBe("");
    expect(style.description).toMatch(/\.$/);
    expect(style.prompt).toMatch(/^Art style: /);
    expect(style.when).not.toBe("");
  }
  expect(AUTO_STYLE.label).toBe("Automatique");
});

test("StyleChoice accepts auto and the four styles, nothing else", () => {
  expect(StyleChoice.options).toEqual(["auto", "illustrated", "realistic", "diagram", "comic"]);
  expect(StyleChoice.safeParse("watercolor").success).toBe(false);
});
