// The lessons and books made on this device, newest first, so the Lessons page can show what this
// device is still making, without accounts.
// Browser storage can be missing or blocked (private windows): every access is guarded.

import type { Language } from "../lesson/schema";
import type { StyleChoice } from "../lesson/styles";

const MAX = 50;

function remembered(key: string): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function remember(key: string, id: string): void {
  try {
    localStorage.setItem(key, JSON.stringify([id, ...remembered(key).filter((other) => other !== id)].slice(0, MAX)));
  } catch {
    // Not remembered: it still has its own link.
  }
}

export const rememberedLessons = () => remembered("lessoncast:lessons");
export const rememberLesson = (id: string) => remember("lessoncast:lessons", id);
export const rememberedBooks = () => remembered("lessoncast:books");
export const rememberBook = (id: string) => remember("lessoncast:books", id);

const BOOK_KEYS = "lessoncast:book-keys";

function bookKeys(): Record<string, string> {
  try {
    const keys: unknown = JSON.parse(localStorage.getItem(BOOK_KEYS) ?? "{}");
    return keys && typeof keys === "object" ? (keys as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** The key that lets this device edit the book it uploaded, null on any other device. */
export function bookEditKey(id: string): string | null {
  return bookKeys()[id] ?? null;
}

export function rememberBookEditKey(id: string, key: string): void {
  try {
    localStorage.setItem(BOOK_KEYS, JSON.stringify({ ...bookKeys(), [id]: key }));
  } catch {
    // Not kept: the book still works, it just can't be renamed from here.
  }
}

const BOOK_CHOICES = "lessoncast:book-choices";

/** The language and style of the last video the teacher made from a book: its next lesson starts from them.
 * The length and the quiz fit each lesson's pages, so they are picked again for each one. */
export type BookChoices = { language?: Language; style?: StyleChoice };

function allBookChoices(): Record<string, BookChoices> {
  try {
    const choices: unknown = JSON.parse(localStorage.getItem(BOOK_CHOICES) ?? "{}");
    return choices && typeof choices === "object" ? (choices as Record<string, BookChoices>) : {};
  } catch {
    return {};
  }
}

export function bookChoices(id: string): BookChoices {
  return allBookChoices()[id] ?? {};
}

export function rememberBookChoices(id: string, choices: BookChoices): void {
  try {
    localStorage.setItem(BOOK_CHOICES, JSON.stringify({ ...allBookChoices(), [id]: choices }));
  } catch {
    // Not kept: each lesson's video starts from the usual choices.
  }
}
