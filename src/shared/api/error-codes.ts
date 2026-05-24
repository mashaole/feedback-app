/**
 * Stable machine-readable codes and UI categories — independent of infra adapters.
 */

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "INVALID_ID",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "RATE_LIMIT_EXCEEDED",
  "UPSTREAM_ERROR",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorCategory =
  | "validation"
  | "auth"
  | "forbidden"
  | "notFound"
  | "rateLimit"
  | "upstream"
  | "unavailable"
  | "server";

export function categoryForError(status: number, code: string): ErrorCategory {
  if (status === 400 && code === "INVALID_ID") {
    return "validation";
  }

  if (status === 400) {
    return "validation";
  }

  if (status === 401) {
    return "auth";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 404) {
    return "notFound";
  }

  if (status === 429) {
    return "rateLimit";
  }

  if (status === 502) {
    return "upstream";
  }

  if (status === 503) {
    return "unavailable";
  }

  return "server";
}
