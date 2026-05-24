/**
 * Parses JSON POST bodies with a hard size cap (anti-abuse / DoS).
 */

const DEFAULT_MAX_BYTES = 65_536;

export class BadJsonBodyError extends Error {
  constructor(message = "Expected application/json body.") {
    super(message);
    this.name = "BadJsonBodyError";
  }
}

export async function parseJsonBody(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<unknown> {
  const ctype = request.headers.get("content-type") ?? "";

  if (!ctype.toLowerCase().includes("application/json")) {
    throw new BadJsonBodyError("Expected Content-Type application/json.");
  }

  const lenHeader = request.headers.get("content-length");
  if (lenHeader !== null) {
    const n = Number.parseInt(lenHeader, 10);

    if (Number.isFinite(n) && n > maxBytes) {
      throw new BadJsonBodyError("Request body exceeds maximum allowed size.");
    }
  }

  const rawText = await request.text();

  if (rawText.length > maxBytes) {
    throw new BadJsonBodyError("Request body exceeds maximum allowed size.");
  }

  if (rawText.trim() === "") {
    throw new BadJsonBodyError("Empty JSON body.");
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    throw new BadJsonBodyError("Malformed JSON.");
  }
}
