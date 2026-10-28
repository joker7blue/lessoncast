// The lessons made on this device, newest first, so "My lessons" works without accounts. Browser
// storage can be missing or blocked (private windows): every access is guarded.

const KEY = "lessoncast:lessons";
const MAX = 50;

export function rememberedLessons(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberLesson(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...rememberedLessons().filter((other) => other !== id)].slice(0, MAX)));
  } catch {
    // Not remembered: the lesson still has its own link.
  }
}
