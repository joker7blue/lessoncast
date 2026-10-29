// The key that lets the device which uploaded a book edit it. The browser keeps the key; the server keeps
// only its SHA-256, and compares in constant time.

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

export const EDIT_KEY_HEADER = "x-edit-key";

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

export function newEditKey(): { key: string; hash: string } {
  const key = randomUUID();
  return { key, hash: hash(key) };
}

export function editKeyMatches(key: string | null, expectedHash: string | null): boolean {
  if (!key || !expectedHash) return false;
  const given = Buffer.from(hash(key), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
