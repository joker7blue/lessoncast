import { describe, expect, test } from "vitest";
import { findPhrase, normalizeWord } from "../phrase";
import type { TimedWord } from "../words";

const timed = (text: string): TimedWord[] =>
  text.split(" ").map((word, i) => ({ word, start: i * 0.3, end: i * 0.3 + 0.3, score: 0.9, group: 1 }));

describe("normalizeWord", () => {
  test("lowercases and drops accents, punctuation and a French elision", () => {
    expect(normalizeWord("Cœur,")).toBe("coeur");
    expect(normalizeWord("«Élève»")).toBe("eleve");
    expect(normalizeWord("l'humanité")).toBe("humanite");
    expect(normalizeWord("d’eau")).toBe("eau");
    expect(normalizeWord("!")).toBe("");
  });
});

describe("findPhrase", () => {
  test("ignores case, accents and punctuation", () => {
    expect(findPhrase(timed("Le cœur, c'est un muscle."), "le coeur")).toEqual({ first: 0, last: 1 });
    expect(findPhrase(timed("Il envoie le sang partout."), "Le sang")).toEqual({ first: 2, last: 3 });
  });

  test("finds a word after an elision", () => {
    expect(findPhrase(timed("Pour toute l'humanité !"), "l'humanité")).toEqual({ first: 2, last: 2 });
    expect(findPhrase(timed("Pour toute l'humanité !"), "humanité")).toEqual({ first: 2, last: 2 });
  });

  test("falls back to the phrase's longest word as a prefix", () => {
    expect(findPhrase(timed("Nos deux cœurs battent."), "le cœur")).toEqual({ first: 2, last: 2 });
    expect(findPhrase(timed("Di heart dey knock."), "di hearts")).toEqual({ first: 1, last: 1 });
  });

  test("never falls back on a short word", () => {
    expect(findPhrase(timed("Le sang coule."), "le os")).toBeNull();
  });

  test("returns null when the narration doesn't name it", () => {
    expect(findPhrase(timed("Le cœur bat dans la poitrine."), "les poumons")).toBeNull();
    expect(findPhrase(timed("Le cœur bat."), "")).toBeNull();
  });

  test("returns the first occurrence", () => {
    expect(findPhrase(timed("Le cœur bat. Le cœur pompe."), "le cœur")).toEqual({ first: 0, last: 1 });
  });

  test("finds a Pidgin phrase", () => {
    expect(findPhrase(timed("Heart di knock for inside we chest."), "we chest")).toEqual({ first: 5, last: 6 });
  });
});
