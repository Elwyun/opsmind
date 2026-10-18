/**
 * Minimal in-memory rate limiter for the prototype.
 *
 * Cloud Run can run more than one instance, so limits are per instance rather
 * than global. That is enough to stop a single client from hammering the AI
 * endpoint or repeatedly wiping the demo; production-grade limits belong in an
 * API gateway or a shared store.
 */

export interface RateLimitRule {
  /** Maximum number of requests allowed in one window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Whole seconds until the window resets; 0 while requests are allowed. */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // A flood of unique keys should not grow memory without bound. Clearing is
  // coarse, but it fails open instead of taking the process down.
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}

/** Checks and records one request for `key`. `now` is injectable for tests. */
export function checkRateLimit(
  key: string,
  rule: RateLimitRule,
  now = Date.now(),
): RateLimitResult {
  if (buckets.size >= MAX_BUCKETS) pruneExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: Math.max(0, rule.limit - 1), retryAfterSeconds: 0 };
  }

  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, rule.limit - existing.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client identity. Cloud Run and most proxies set
 * `x-forwarded-for`; the first entry is the original client.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test helper: clears all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}
