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
