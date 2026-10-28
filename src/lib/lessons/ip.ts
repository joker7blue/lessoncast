// The visitor's IP, hashed with a secret salt, for the per-IP rate limit: the raw address is never stored.

import { createHash } from "node:crypto";

export function hashIp(request: Request): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const salt = process.env.IP_HASH_SALT;
  if (!ip || !salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
