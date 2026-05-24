import { createHash } from "node:crypto";

/**
 * SHA-256 of whitespace-normalized lowercase text — cache + mock lookups.
 */

export function hashFeedbackAnalysisCacheKey(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
