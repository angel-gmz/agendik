import { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, Bucket>();

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Reusable rate limiter: uses Upstash Redis REST if UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN
 * are configured, otherwise falls back to an in-memory fixed-window limiter.
 */
export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = params;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (upstashUrl && upstashToken) {
    try {
      const redisKey = `rl:${key}`;
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, String(windowSeconds), "NX"],
        ]),
      });

      if (res.ok) {
        const data = (await res.json()) as Array<{ result?: number }>;
        const count = Number(data?.[0]?.result ?? 1);
        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          resetAt: now + windowMs,
        };
      }
    } catch {
      // Fallback to memory store on transient network error
    }
  }

  // Cleanup periodically if map grows large
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt <= now) memoryStore.delete(k);
    }
  }

  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}
