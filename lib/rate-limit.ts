interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

interface TokenBucket {
  count: number;
  resetAt: number;
}

export function rateLimit({ maxRequests, windowMs }: RateLimitOptions) {
  const buckets = new Map<string, TokenBucket>();

  return {
    check(ip: string): boolean {
      const now = Date.now();
      const bucket = buckets.get(ip);

      if (!bucket || now > bucket.resetAt) {
        buckets.set(ip, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (bucket.count < maxRequests) {
        bucket.count++;
        return true;
      }

      return false;
    },
  };
}
