// The open site's limits, on Upstash Redis: a few lessons per IP per hour (sliding window) and a cap
// per day for everyone, so a public link can't spend the model credits. Off unless
// RATE_LIMIT_ENABLED=true, so the developer's own tests and demos are never blocked.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitConfig = { enabled: boolean; perIpPerHour: number; perDay: number };

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function rateLimitConfig(env: Record<string, string | undefined> = process.env): RateLimitConfig {
  return {
    enabled: env.RATE_LIMIT_ENABLED === "true",
    perIpPerHour: positiveInt(env.RATE_LIMIT_PER_IP_HOUR, 3),
    perDay: positiveInt(env.RATE_LIMIT_PER_DAY, 60),
  };
}

const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const spelled = (n: number) => NUMBERS[n] ?? String(n);

type Limiters = { perIp: Ratelimit; perDay: Ratelimit };
let limiters: Limiters | undefined;

function getLimiters(config: RateLimitConfig): Limiters {
  if (!limiters) {
    // The Vercel Upstash integration names these KV_REST_API_*; a plain Upstash database, UPSTASH_REDIS_REST_*.
    const redis = new Redis({
      url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    limiters = {
      perIp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(config.perIpPerHour, "1 h"), prefix: "lessoncast:ip" }),
      perDay: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(config.perDay, "1 d"), prefix: "lessoncast:day" }),
    };
  }
  return limiters;
}

/** Null when the lesson can go ahead, else the sentence to answer with. Without an IP hash, only the daily cap applies. */
export async function checkRateLimit(ipHash: string | null, config: RateLimitConfig = rateLimitConfig()): Promise<string | null> {
  if (!config.enabled) return null;
  try {
    const { perIp, perDay } = getLimiters(config);
    if (ipHash) {
      if (!(await perIp.limit(ipHash)).success) {
        return `You have made ${spelled(config.perIpPerHour)} lessons in the last hour. Try again in a little while.`;
      }
    } else {
      console.warn("Rate limit on without an IP hash: set IP_HASH_SALT; only the daily cap applies");
    }
    if (!(await perDay.limit("all")).success) return "LessonCast has made all its lessons for today. Try again tomorrow.";
    return null;
  } catch (error) {
    // A Redis hiccup or a missing key must not stop a teacher; it is logged so it gets fixed.
    console.error("Rate limit check failed, letting the lesson through:", error);
    return null;
  }
}
