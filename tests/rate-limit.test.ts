import { afterEach, describe, expect, it } from "vitest";

import { checkRateLimit, clientKey, resetRateLimits } from "../src/lib/api/rate-limit";

afterEach(() => resetRateLimits());

describe("rate limiter", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const rule = { limit: 2, windowMs: 1_000 };

    expect(checkRateLimit("client", rule, 0)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(checkRateLimit("client", rule, 1)).toMatchObject({
      allowed: true,
      remaining: 0,
    });

    const blocked = checkRateLimit("client", rule, 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it("opens a fresh window after the rule window passes", () => {
    const rule = { limit: 1, windowMs: 1_000 };

    expect(checkRateLimit("client", rule, 0).allowed).toBe(true);
    expect(checkRateLimit("client", rule, 999).allowed).toBe(false);
    expect(checkRateLimit("client", rule, 1_000).allowed).toBe(true);
  });

  it("keeps separate buckets per key", () => {
    const rule = { limit: 1, windowMs: 1_000 };

    expect(checkRateLimit("a", rule, 0).allowed).toBe(true);
    expect(checkRateLimit("b", rule, 0).allowed).toBe(true);
    expect(checkRateLimit("a", rule, 1).allowed).toBe(false);
  });
});

describe("clientKey", () => {
  it("uses the first x-forwarded-for address", () => {
    const request = new Request("http://localhost/api/health", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(request)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip and then to a shared unknown key", () => {
    expect(
      clientKey(
        new Request("http://localhost/api/health", {
          headers: { "x-real-ip": "198.51.100.9" },
        }),
      ),
    ).toBe("198.51.100.9");
    expect(clientKey(new Request("http://localhost/api/health"))).toBe("unknown");
  });
});
