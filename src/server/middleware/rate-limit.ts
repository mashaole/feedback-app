import type { ParsedEnv } from "@/server/config/env";
import type { NextRequest } from "next/server";

/** In-memory sliding window rate limit buckets (fine for solo dev server). */

interface Bucket {
  hits: number[];
}

const store = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  const firstForwarded =
    typeof xff === "string" ? xff.split(",")[0]?.trim() ?? "" : "";

  const fromRealIp =
    typeof req.headers.get("x-real-ip") === "string"
      ? (req.headers.get("x-real-ip") as string).trim()
      : "";

  const forwarded = firstForwarded !== "" ? firstForwarded : fromRealIp;

  const nx = req as NextRequest & { ip?: string | null };
  const nextIp = typeof nx.ip === "string" ? nx.ip.trim() : "";

  const keyCandidate =
    forwarded !== "" ? forwarded : nextIp !== "" ? nextIp : "unknown";

  return keyCandidate.slice(0, 256);
}

function pruneOlderThan(times: number[], cutoff: number): number[] {
  return times.filter((t) => t >= cutoff);
}

export interface RateLimitOutcome {
  allowed: boolean;
  retryAfterMs: number;
}

export function consumeRateBucket(
  key: string,
  windowMs: number,
  limit: number,
  nowMs: number = Date.now(),
): RateLimitOutcome {
  let bucket = store.get(key);

  if (!bucket) {
    bucket = { hits: [] };
    store.set(key, bucket);
  }

  const cutoff = nowMs - windowMs;
  bucket.hits = pruneOlderThan(bucket.hits, cutoff);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];

    const retryRaw =
      oldest === undefined ? windowMs : windowMs - (nowMs - oldest);

    const retryAfterMs = Math.max(100, Math.ceil(retryRaw));

    return { allowed: false, retryAfterMs };
  }

  bucket.hits.push(nowMs);

  return { allowed: true, retryAfterMs: 0 };
}

export function evaluateApiRateLimit(
  req: NextRequest,
  env: ParsedEnv,
  routeTier: "read" | "write",
): RateLimitOutcome {
  const ck = `${clientKey(req)}:${routeTier}`;
  const max =
    routeTier === "write" ? env.RATE_LIMIT_POST_MAX : env.RATE_LIMIT_MAX_REQUESTS;

  return consumeRateBucket(ck, env.RATE_LIMIT_WINDOW_MS, max);
}
