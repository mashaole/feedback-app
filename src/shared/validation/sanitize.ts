/**
 * Normalize user-controlled strings before persistence / downstream calls.
 */

const NULL_BYTES = /\u0000/g;

export function sanitizeFeedbackText(raw: string): string {
  return raw.replace(NULL_BYTES, "").trim();
}

/**
 * Normalizes candidate idempotency key material (header) before validation.
 */

export function sanitizeIdempotencyKeyCandidate(raw: string): string {
  return raw.replace(NULL_BYTES, "").trim().slice(0, 255);
}

export function sanitizeNullableEmail(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const t = typeof raw === "string" ? raw.replace(NULL_BYTES, "").trim().toLowerCase() : "";

  return t === "" ? null : t;
}

export function sanitizeNullableTag(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const t = raw.replace(NULL_BYTES, "").trim();
  return t === "" ? null : t.slice(0, 256);
}
