// The lessons and books made on this device, newest first, so the Lessons page can show what this
// device is still making, without accounts.
// Browser storage can be missing or blocked (private windows): every access is guarded.

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

