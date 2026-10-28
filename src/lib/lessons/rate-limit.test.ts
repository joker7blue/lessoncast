import { beforeEach, describe, expect, test, vi } from "vitest";

// Each Ratelimit built by the module answers through `answers`, keyed by its prefix.
const upstash = vi.hoisted(() => {
  const answers: Record<string, boolean> = {};
  const calls: { prefix: string; key: string }[] = [];
  class Ratelimit {
    static slidingWindow = vi.fn(() => "sliding");
    static fixedWindow = vi.fn(() => "fixed");
    prefix: string;
    constructor(options: { prefix: string }) {
      this.prefix = options.prefix;
    }
    async limit(key: string) {
      calls.push({ prefix: this.prefix, key });
      if (answers[this.prefix] === undefined) throw new Error("Redis is down");
      return { success: answers[this.prefix] };
    }
  }
  return { answers, calls, Ratelimit, Redis: vi.fn() };
});
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: upstash.Ratelimit }));
vi.mock("@upstash/redis", () => ({ Redis: upstash.Redis }));

import { checkRateLimit, rateLimitConfig } from "./rate-limit";

const on = { enabled: true, perIpPerHour: 3, perDay: 60 };
const IP = "lessoncast:ip";
const DAY = "lessoncast:day";

describe("rateLimitConfig", () => {
  test("off unless RATE_LIMIT_ENABLED is true, so the developer's own tests are never blocked", () => {
    expect(rateLimitConfig({}).enabled).toBe(false);
    expect(rateLimitConfig({ RATE_LIMIT_ENABLED: "false" }).enabled).toBe(false);
    expect(rateLimitConfig({ RATE_LIMIT_ENABLED: "true" }).enabled).toBe(true);
  });

  test("3 per IP per hour and 60 per day unless set otherwise", () => {
    expect(rateLimitConfig({ RATE_LIMIT_ENABLED: "true" })).toEqual(on);
    expect(rateLimitConfig({ RATE_LIMIT_PER_IP_HOUR: "5", RATE_LIMIT_PER_DAY: "200" })).toMatchObject({ perIpPerHour: 5, perDay: 200 });
    expect(rateLimitConfig({ RATE_LIMIT_PER_IP_HOUR: "lots", RATE_LIMIT_PER_DAY: "-1" })).toMatchObject({ perIpPerHour: 3, perDay: 60 });
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    for (const key of Object.keys(upstash.answers)) delete upstash.answers[key];
    upstash.calls.length = 0;
  });

  test("switched off, it never calls Upstash", async () => {
    expect(await checkRateLimit("hash", { ...on, enabled: false })).toBeNull();
    expect(upstash.calls).toEqual([]);
  });

  test("under both limits, the lesson goes ahead", async () => {
    Object.assign(upstash.answers, { [IP]: true, [DAY]: true });
    expect(await checkRateLimit("hash", on)).toBeNull();
    expect(upstash.calls).toEqual([
      { prefix: IP, key: "hash" },
      { prefix: DAY, key: "all" },
    ]);
  });

  test("a lesson over this IP's hourly limit is refused, without using up the day's", async () => {
    Object.assign(upstash.answers, { [IP]: false, [DAY]: true });
    expect(await checkRateLimit("hash", on)).toMatch(/three lessons in the last hour/);
    expect(upstash.calls.map((c) => c.prefix)).toEqual([IP]);
  });

  test("a lesson over the day's limit is refused for everyone", async () => {
    Object.assign(upstash.answers, { [IP]: true, [DAY]: false });
    expect(await checkRateLimit("hash", on)).toMatch(/today/);
  });

  test("without an IP hash only the daily limit applies", async () => {
    Object.assign(upstash.answers, { [DAY]: true });
    expect(await checkRateLimit(null, on)).toBeNull();
    expect(upstash.calls.map((c) => c.prefix)).toEqual([DAY]);
  });

  test("if Upstash can't answer, the lesson goes ahead rather than blocking a teacher", async () => {
    expect(await checkRateLimit("hash", on)).toBeNull();
  });
});
