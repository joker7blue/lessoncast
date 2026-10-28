import { afterEach, expect, test, vi } from "vitest";
import { hashIp } from "./ip";

const request = (headers: Record<string, string>) => new Request("http://localhost/api/lessons", { headers });

afterEach(() => vi.unstubAllEnvs());

test("hashes the first x-forwarded-for address with the salt", () => {
  vi.stubEnv("IP_HASH_SALT", "salt-1");
  const a = hashIp(request({ "x-forwarded-for": "102.244.1.7, 10.0.0.1" }));
  expect(a).toMatch(/^[0-9a-f]{64}$/);
  expect(hashIp(request({ "x-forwarded-for": "102.244.1.7" }))).toBe(a);
  expect(hashIp(request({ "x-forwarded-for": "102.244.1.8" }))).not.toBe(a);
  vi.stubEnv("IP_HASH_SALT", "salt-2");
  expect(hashIp(request({ "x-forwarded-for": "102.244.1.7" }))).not.toBe(a);
});

test("null without the header or without a salt", () => {
  vi.stubEnv("IP_HASH_SALT", "salt-1");
  expect(hashIp(request({}))).toBeNull();
  vi.stubEnv("IP_HASH_SALT", "");
  expect(hashIp(request({ "x-forwarded-for": "102.244.1.7" }))).toBeNull();
});
