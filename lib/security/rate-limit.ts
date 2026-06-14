import { headers } from "next/headers";

type RateLimitInput = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${identifier}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  cleanupExpired(now);

  const remaining = Math.max(limit - bucket.count, 0);
  const retryAfter = Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1);

  return {
    ok: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfter,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "Retry-After": String(result.retryAfter),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function rateLimitResponse(result: RateLimitResult) {
  return new Response("Too many requests.", {
    status: 429,
    headers: rateLimitHeaders(result),
  });
}

export function clientIpFromHeaders(headersList: Headers) {
  const forwarded = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    headersList.get("x-real-ip") ||
    headersList.get("cf-connecting-ip") ||
    "local"
  );
}

export async function clientIpFromServerAction() {
  return clientIpFromHeaders(await headers());
}

function cleanupExpired(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
